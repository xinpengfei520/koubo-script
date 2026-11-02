/** 服务端文案：检查项、段落名、卖点闸。UI 文案在 web/i18n.js。 */

const DICT = {
  zh: {
    "seg.hook": "钩子",
    "seg.pain": "痛点",
    "seg.selling_point": "卖点",
    "seg.trust": "信任",
    "seg.cta": "CTA",

    "check.A1": "时长",
    "check.A1.detail": "{chars} 字 ≈ {seconds}s（区间 {min}–{max}s）",
    "check.A2": "钩子",
    "check.A2.detail": "钩子在 0–{end}s：{text}",
    "check.A2.missing": "缺少钩子段",
    "check.A3": "CTA 双落点",
    "check.A3.detail": "{seconds}s；互动句{inter}，行动句{action}",
    "check.A3.missing": "缺少 CTA 段",
    "check.A4": "五段结构",
    "check.A4.detail": "{filled}/5 段有内容",
    "check.A5": "可直接朗读",
    "check.A5.detail": "{count} 处会卡",
    "check.A5.ok": "无长句、无括号、无书面语",
    "check.A6": "禁用词",
    "check.A6.detail": "{count} 条必删：{words}",
    "check.A6.ok": "0 条必删",
    "check.A7": "镜头覆盖",
    "check.A7.detail": "{count} 条镜头",
    "check.A7.spread": "3 条，衔接差 {gaps}s，收尾差 {tail}s",
    "check.A9": "卖点保真",
    "check.A9.detail": "{count} 处新增数据宣称",
    "check.A9.ok": "没有模型自造的数字",

    "word.yes": "有",
    "word.no": "缺",
    "conclusion.ok": "可发布",
    "conclusion.fix": "需修改",

    "gate.sp.empty": "卖点不能为空",
    "gate.audience.empty": "人群不能为空",
    "gate.sp.long": "卖点 {n} 字，超过 40 字，30 秒装不下",
    "gate.sp.nonumber": "卖点里没有具体数字，容易写成空话",
    "gate.sp.vague": "「{word}」是通用词，谁都能说，建议换成可验证的事实",
    "gate.sp.multi": "像是多个卖点，30 秒只该讲一个",
    "gate.audience.vague": "人群缺场景，建议写成「谁 + 什么时候 + 什么痛点」",
    "gate.sp.fromimage": "没写卖点，将从商品图判断（图上没有的不会编）",
  },
  en: {
    "seg.hook": "Hook",
    "seg.pain": "Pain",
    "seg.selling_point": "Selling point",
    "seg.trust": "Proof",
    "seg.cta": "CTA",

    "check.A1": "Duration",
    "check.A1.detail": "{chars} chars ≈ {seconds}s (range {min}–{max}s)",
    "check.A2": "Hook",
    "check.A2.detail": "Hook at 0–{end}s: {text}",
    "check.A2.missing": "No hook beat",
    "check.A3": "CTA double-beat",
    "check.A3.detail": "{seconds}s; interaction {inter}, action {action}",
    "check.A3.missing": "No CTA beat",
    "check.A4": "Five beats",
    "check.A4.detail": "{filled}/5 beats filled",
    "check.A5": "Readable aloud",
    "check.A5.detail": "{count} spots will trip you up",
    "check.A5.ok": "No long clauses, brackets or written-style connectives",
    "check.A6": "Banned words",
    "check.A6.detail": "{count} to remove: {words}",
    "check.A6.ok": "Nothing to remove",
    "check.A7": "Shot coverage",
    "check.A7.detail": "{count} shots",
    "check.A7.spread": "3 shots, gaps {gaps}s, tail {tail}s",
    "check.A9": "Claim fidelity",
    "check.A9.detail": "{count} invented numbers",
    "check.A9.ok": "No invented numbers",

    "word.yes": "present",
    "word.no": "missing",
    "conclusion.ok": "Ready",
    "conclusion.fix": "Needs work",

    "gate.sp.empty": "Selling point can't be empty",
    "gate.audience.empty": "Audience can't be empty",
    "gate.sp.long": "Selling point is {n} chars — over 40, too long for 30 seconds",
    "gate.sp.nonumber": "No concrete number in the selling point; it will read like a platitude",
    "gate.sp.vague": "`{word}` is generic — anyone could say it. Swap in something checkable",
    "gate.sp.multi": "Looks like several selling points; 30 seconds holds one",
    "gate.audience.vague": "Audience lacks a scene. Try “who + when + what hurts”",
    "gate.sp.fromimage": "No selling point given — reading it from the photo (nothing invented)",
  },
};

export const LANGS = ["zh", "en"];

export function normalizeLang(lang) {
  const l = String(lang ?? "").toLowerCase();
  return l.startsWith("en") ? "en" : "zh";
}

export function t(lang, key, vars) {
  const dict = DICT[normalizeLang(lang)] ?? DICT.zh;
  const raw = dict[key] ?? DICT.zh[key] ?? key;
  if (!vars) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
