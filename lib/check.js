import { layout } from "./timing.js";
import { scan } from "./banned.js";
import { t, normalizeLang } from "./i18n.js";

export const SEGMENTS = [
  { id: "hook", target: 3 },
  { id: "pain", target: 5 },
  { id: "selling_point", target: 11 },
  { id: "trust", target: 6 },
  { id: "cta", target: 4 },
];

const ALIAS = {
  hook: "hook", 钩子: "hook",
  pain: "pain", 痛点: "pain",
  selling_point: "selling_point", selling: "selling_point", 卖点: "selling_point",
  trust: "trust", 信任: "trust",
  cta: "cta", call_to_action: "cta", CTA: "cta", 行动: "cta",
};

/** 把模型输出规整成固定的 5 段，label 按语言生成 */
export function normalizeScript(raw, lang = "zh") {
  const L = normalizeLang(lang);
  const list = Array.isArray(raw?.segments) ? raw.segments : [];
  return SEGMENTS.map((s, i) => {
    const found = list.find((x) => ALIAS[String(x?.id ?? "").trim()] === s.id) ?? list[i];
    return { id: s.id, label: t(L, `seg.${s.id}`), text: String(found?.text ?? "").trim() };
  });
}

const INTERACTION = /([？?]|吗|呢|是不是|有没有|想不想|要不要|好不好|对不对|你也|你还|几点|多少|谁还|别.{0,8}了)/;
const ACTION = /(左下角|购物车|小黄车|拍|带走|下单|戳|点开|进直播间|主页|店铺|链接)/;
const BOOKISH = ["因此", "综上所述", "与此同时", "首先", "其次", "再者", "鉴于", "从而", "换言之", "毋庸置疑", "众所周知", "值得一提的是", "基于此"];
const BRACKET = /[（）()【】\[\]]/;

function readability(segments, L) {
  const flags = [];
  for (const s of segments) {
    if (!s.text) continue;
    // 按标点切成"一口气"的分句，超过 20 字就需要换气
    for (const clause of s.text.split(/[。！？!?；;，,、：:\n]/)) {
      const c = clause.trim();
      // detail 只喂给返修提示词（模型写中文稿），不进界面
      if (c.length > 20) flags.push({ type: "long", segment: s.label, text: c, detail: `一口气 ${c.length} 字，念着会断气` });
    }
    if (BRACKET.test(s.text)) flags.push({ type: "bracket", segment: s.label, text: s.text, detail: "出现括号，提词器里没法念" });
    const b = BOOKISH.find((w) => s.text.includes(w));
    if (b) flags.push({ type: "bookish", segment: s.label, text: b, detail: `「${b}」是书面语，换成口语` });
    const en = s.text.match(/[A-Za-z]{2,}/g);
    if (en) flags.push({ type: "latin", segment: s.label, text: en.join(" "), detail: "含英文缩写，观众听着会卡" });
  }
  return flags;
}

function newClaims(input, segments) {
  const unit = /(\d+(?:\.\d+)?)\s*(分钟|秒|小时|天|个月|年|倍|%|块|元|克|斤|包|样|种|次|片|袋)/g;
  const src = `${input.selling_point ?? ""} ${input.offer ?? ""}`;
  const knownNums = new Set([...src.matchAll(unit)].map((m) => m[1] + m[2]));
  const out = [];
  for (const s of segments) {
    for (const m of s.text.matchAll(unit)) {
      if (!knownNums.has(m[1] + m[2])) out.push({ segment: s.label, text: m[0] });
    }
  }
  return out;
}

export function checkAll({ segments, shots = [], input = {}, meta = {}, lang = "zh" }) {
  const L = normalizeLang(lang);
  const lay = layout(segments);
  const segs = lay.segments;
  const items = [];

  // A1 时长
  const dur = lay.seconds;
  items.push({
    id: "A1", name: t(L, "check.A1"), ok: dur >= 27 && dur <= 33,
    detail: t(L, "check.A1.detail", { chars: lay.total_chars, seconds: dur, min: lay.range.min, max: lay.range.max }),
  });

  // A2 钩子
  const first = segs[0];
  const hookOk = !!first?.text && first.end <= 3.5 && /([？?]|你|您|别|还|是不是|多少|敢|知道)/.test(first.text);
  items.push({
    id: "A2", name: t(L, "check.A2"), ok: hookOk,
    detail: first ? t(L, "check.A2.detail", { end: first.end, text: first.text }) : t(L, "check.A2.missing"),
  });

  // A3 CTA 双落点
  const last = segs[segs.length - 1];
  const inter = last && INTERACTION.test(last.text);
  const action = last && ACTION.test(last.text);
  const ctaOk = !!last && last.seconds <= 6.5 && inter && action;
  items.push({
    id: "A3", name: t(L, "check.A3"), ok: ctaOk,
    detail: last
      ? t(L, "check.A3.detail", {
          seconds: last.seconds,
          inter: t(L, inter ? "word.yes" : "word.no"),
          action: t(L, action ? "word.yes" : "word.no"),
        })
      : t(L, "check.A3.missing"),
  });

  // A4 结构
  const filled = segs.filter((s) => s.text).length;
  items.push({ id: "A4", name: t(L, "check.A4"), ok: filled === 5, detail: t(L, "check.A4.detail", { filled }) });

  // A5 可朗读
  const flags = readability(segs, L);
  items.push({
    id: "A5", name: t(L, "check.A5"), ok: flags.length === 0,
    detail: flags.length ? t(L, "check.A5.detail", { count: flags.length }) : t(L, "check.A5.ok"),
  });

  // A6 禁用词
  const scanAll = segs.map((s) => ({ seg: s, r: scan(s.text) }));
  const hits = scanAll.flatMap(({ seg, r }) => r.hits.map((h) => ({ ...h, segment: seg.label })));
  const blocked = hits.filter((h) => h.action === "block");
  items.push({
    id: "A6", name: t(L, "check.A6"), ok: blocked.length === 0,
    detail: blocked.length
      ? t(L, "check.A6.detail", { count: blocked.length, words: [...new Set(blocked.map((b) => b.word))].join(L === "en" ? ", " : "、") })
      : t(L, "check.A6.ok"),
  });

  // A7 镜头
  const sorted = [...shots].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  let shotOk = sorted.length === 3;
  let shotDetail = t(L, "check.A7.detail", { count: sorted.length });
  if (shotOk) {
    const gaps = sorted.slice(1).map((s, i) => Math.abs((sorted[i].end ?? 0) - (s.start ?? 0)));
    const tail = Math.abs((sorted[2].end ?? 0) - dur);
    shotOk = gaps.every((g) => g <= 1.5) && tail <= 3 && (sorted[0].start ?? 0) <= 1;
    shotDetail = t(L, "check.A7.spread", { gaps: gaps.map((g) => g.toFixed(1)).join("/"), tail: tail.toFixed(1) });
  }
  items.push({ id: "A7", name: t(L, "check.A7"), ok: shotOk, detail: shotDetail });

  // A9 卖点保真
  const claims = newClaims(input, segs);
  items.push({
    id: "A9", name: t(L, "check.A9"), ok: claims.length === 0,
    detail: claims.length ? t(L, "check.A9.detail", { count: claims.length }) : t(L, "check.A9.ok"),
  });

  const pass = items.every((i) => i.ok);
  return {
    ...lay,
    items,
    pass,
    banned: { hits, blocked: blocked.length, review: hits.filter((h) => h.action === "review").length, warn: hits.filter((h) => h.action === "warn").length },
    readability: flags,
    claims,
    shots: sorted,
    conclusion: t(L, pass ? "conclusion.ok" : "conclusion.fix"),
    lang: L,
    meta,
  };
}
