import { layout, analyzeText } from "./timing.js";
import { scan } from "./banned.js";

export const SEGMENTS = [
  { id: "hook", label: "钩子", target: 3 },
  { id: "pain", label: "痛点", target: 5 },
  { id: "selling_point", label: "卖点", target: 11 },
  { id: "trust", label: "信任", target: 6 },
  { id: "cta", label: "CTA", target: 4 },
];

const ALIAS = {
  hook: "hook", 钩子: "hook",
  pain: "pain", 痛点: "pain",
  selling_point: "selling_point", selling: "selling_point", 卖点: "selling_point",
  trust: "trust", 信任: "trust",
  cta: "cta", call_to_action: "cta", CTA: "cta", 行动: "cta",
};

/** 把模型输出规整成固定的 5 段 */
export function normalizeScript(raw) {
  const list = Array.isArray(raw?.segments) ? raw.segments : [];
  return SEGMENTS.map((s, i) => {
    const found = list.find((x) => ALIAS[String(x?.id ?? "").trim()] === s.id) ?? list[i];
    return { id: s.id, label: s.label, text: String(found?.text ?? "").trim() };
  });
}

const INTERACTION = /([？?]|吗|呢|是不是|有没有|想不想|要不要|好不好|对不对|你也|你还|几点|多少|谁还|别.{0,8}了)/;
const ACTION = /(左下角|购物车|小黄车|拍|带走|下单|戳|点开|进直播间|主页|店铺|链接)/;
const BOOKISH = ["因此", "综上所述", "与此同时", "首先", "其次", "再者", "鉴于", "从而", "换言之", "毋庸置疑", "众所周知", "值得一提的是", "基于此"];
const BRACKET = /[（）()【】\[\]]/;

function readability(segments) {
  const flags = [];
  for (const s of segments) {
    if (!s.text) continue;
    // 按标点切成"一口气"的分句，超过 20 字就需要换气
    for (const clause of s.text.split(/[。！？!?；;，,、：:\n]/)) {
      const t = clause.trim();
      if (t.length > 20) {
        flags.push({ type: "长句", segment: s.label, text: t, detail: `一口气 ${t.length} 字，念着会断气` });
      }
    }
    if (BRACKET.test(s.text)) flags.push({ type: "符号", segment: s.label, text: s.text, detail: "出现括号，提词器里没法念" });
    const b = BOOKISH.find((w) => s.text.includes(w));
    if (b) flags.push({ type: "书面语", segment: s.label, text: b, detail: `「${b}」是书面语，换成口语` });
    const en = s.text.match(/[A-Za-z]{2,}/g);
    if (en) flags.push({ type: "英文", segment: s.label, text: en.join(" "), detail: "含英文缩写，观众听着会卡" });
  }
  return flags;
}

function newClaims(input, segments) {
  const unit = /(\d+(?:\.\d+)?)\s*(分钟|秒|小时|天|个月|年|倍|%|块|元|克|斤|包|样|种|次|片|袋)/g;
  const src = `${input.selling_point ?? ""} ${input.offer ?? ""}`;
  const known = new Set([...src.matchAll(unit)].map((m) => m[2]));
  const knownNums = new Set([...src.matchAll(unit)].map((m) => m[1] + m[2]));
  const out = [];
  for (const s of segments) {
    for (const m of s.text.matchAll(unit)) {
      const k = m[1] + m[2];
      if (!knownNums.has(k)) out.push({ segment: s.label, text: m[0], detail: `「${m[0]}」不在你给的卖点里，是模型自己加的，必须核实` });
    }
  }
  return out;
}

export function checkAll({ segments, shots = [], input = {}, meta = {} }) {
  const lay = layout(segments);
  const segs = lay.segments;
  const items = [];

  // A1 时长
  const dur = lay.seconds;
  items.push({
    id: "A1", name: "时长", ok: dur >= 27 && dur <= 33,
    detail: `${lay.total_chars} 字 ≈ ${dur}s（区间 ${lay.range.min}–${lay.range.max}s）`,
  });

  // A2 钩子
  const first = segs[0];
  const hookOk = !!first?.text && first.end <= 3.5 && /([？?]|你|您|别|还|是不是|多少|敢|知道)/.test(first.text);
  items.push({ id: "A2", name: "钩子", ok: hookOk, detail: first ? `钩子在 0–${first.end}s：${first.text}` : "缺少钩子段" });

  // A3 CTA 双落点
  const last = segs[segs.length - 1];
  const inter = last && INTERACTION.test(last.text);
  const action = last && ACTION.test(last.text);
  const ctaOk = !!last && last.seconds <= 6.5 && inter && action;
  items.push({
    id: "A3", name: "CTA 双落点", ok: ctaOk,
    detail: last ? `${last.seconds}s；互动句${inter ? "有" : "缺"}，行动句${action ? "有" : "缺"}` : "缺少 CTA 段",
  });

  // A4 结构
  const filled = segs.filter((s) => s.text).length;
  items.push({ id: "A4", name: "五段结构", ok: filled === 5, detail: `${filled}/5 段有内容` });

  // A5 可朗读
  const flags = readability(segs);
  items.push({ id: "A5", name: "可直接朗读", ok: flags.length === 0, detail: flags.length ? `${flags.length} 处会卡` : "无长句、无括号、无书面语" });

  // A6 禁用词
  const scanAll = segs.map((s) => ({ seg: s, r: scan(s.text) }));
  const hits = scanAll.flatMap(({ seg, r }) => r.hits.map((h) => ({ ...h, segment: seg.label })));
  const blocked = hits.filter((h) => h.action === "block");
  items.push({
    id: "A6", name: "禁用词", ok: blocked.length === 0,
    detail: blocked.length ? `${blocked.length} 条必删：${[...new Set(blocked.map((b) => b.word))].join("、")}` : "0 条必删",
  });

  // A7 镜头
  const sorted = [...shots].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  let shotOk = sorted.length === 3;
  let shotDetail = `${sorted.length} 条镜头`;
  if (shotOk) {
    const gaps = sorted.slice(1).map((s, i) => Math.abs((sorted[i].end ?? 0) - (s.start ?? 0)));
    const tail = Math.abs((sorted[2].end ?? 0) - dur);
    shotOk = gaps.every((g) => g <= 1.5) && tail <= 3 && (sorted[0].start ?? 0) <= 1;
    shotDetail = `3 条，衔接差 ${gaps.map((g) => g.toFixed(1)).join("/")}s，收尾差 ${tail.toFixed(1)}s`;
  }
  items.push({ id: "A7", name: "镜头覆盖", ok: shotOk, detail: shotDetail });

  // A9 卖点保真
  const claims = newClaims(input, segs);
  items.push({
    id: "A9", name: "卖点保真", ok: claims.length === 0,
    detail: claims.length ? `${claims.length} 处新增数据宣称` : "没有模型自造的数字",
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
    conclusion: pass ? "可发布" : "需修改",
    meta,
  };
}
