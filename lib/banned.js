import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR } from "./env.js";

const RAW = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "banned.json"), "utf8"));

const TRAD = { 優: "优", 極: "极", 級: "级", 國: "国", 產: "产", 專: "专", 獨: "独", 萬: "万", 與: "与", 標: "标", 準: "准", 認: "认", 證: "证" };

export function normalize(input) {
  let s = String(input ?? "").normalize("NFKC");
  s = s.replace(/[\s\u200b-\u200d\ufeff]/g, "");
  s = s.replace(/[·・•‧]/g, "");
  s = s.replace(/no\.?\s*1/gi, "第一").replace(/top\.?\s*1/gi, "第一");
  s = s.replace(/第1/g, "第一");
  s = s.replace(/[蕞冣]/g, "最");
  s = s.toLowerCase().replace(/zui/g, "最");
  for (const [t, c] of Object.entries(TRAD)) s = s.split(t).join(c);
  return s;
}

const ENTRIES = RAW.entries
  .map((e) => ({ ...e, key: normalize(e.word) }))
  .filter((e) => e.key.length > 0)
  .sort((a, b) => b.key.length - a.key.length);

const WHITELIST = [...RAW.whitelist.exact, ...RAW.whitelist.emotional]
  .map(normalize)
  .sort((a, b) => b.length - a.length);

const overlap = (a, b) => a[0] < b[1] && b[0] < a[1];

function rangesOf(text, words) {
  const out = [];
  for (const w of words) {
    let i = 0;
    while (w && (i = text.indexOf(w, i)) !== -1) {
      out.push([i, i + w.length]);
      i += w.length;
    }
  }
  return out;
}

/** "最" 后面跟这些字时属于正常表达（数量 / 时间 / 情绪），不报 */
const ZUI_SAFE_NEXT = new Set([..."后近初终多少大小高低怕想需要烦难累早晚"]);

/**
 * 扫描一段文本。
 * @returns {{hits: Array, blockCount: number, reviewCount: number}}
 */
export function scan(text) {
  const norm = normalize(text);
  const wl = rangesOf(norm, WHITELIST);
  const taken = [];
  const hits = [];

  for (const e of ENTRIES) {
    let i = 0;
    while ((i = norm.indexOf(e.key, i)) !== -1) {
      const r = [i, i + e.key.length];
      if (!wl.some((w) => overlap(r, w)) && !taken.some((t) => overlap(r, t))) {
        taken.push(r);
        hits.push({
          word: norm.slice(r[0], r[1]),
          source: e.word,
          level: e.level,
          action: e.action,
          category: e.category,
          law: e.law,
          replace: e.replace,
          index: r[0],
        });
      }
      i += e.key.length;
    }
  }

  // 单字「最」兜底：白名单与复合词都没覆盖到，才提示人工复核
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] !== "最") continue;
    const r = [i, i + 1];
    if (wl.some((w) => overlap(r, w)) || taken.some((t) => overlap(r, t))) continue;
    if (ZUI_SAFE_NEXT.has(norm[i + 1] ?? "")) continue;
    taken.push(r);
    hits.push({
      word: "最",
      source: "最",
      level: "L1",
      action: "warn",
      category: "单字极值（待复核）",
      law: "广告法 第九条（三）",
      replace: ["换成语气词，如「很」「特别」"],
      index: i,
    });
  }

  hits.sort((a, b) => a.index - b.index);
  return {
    hits,
    blockCount: hits.filter((h) => h.action === "block").length,
    reviewCount: hits.filter((h) => h.action === "review").length,
    warnCount: hits.filter((h) => h.action === "warn").length,
  };
}

export const BANNED_META = { version: RAW.version, total: RAW.entries.length, levels: RAW.levels };
