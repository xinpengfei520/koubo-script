/** 卖点四道闸：单一、可验证、场景、差异。不通过不生成，但允许用户强行继续。 */

const VAGUE = ["好用", "好吃", "好看", "品质", "高端", "实惠", "划算", "良心", "性价比高", "值得拥有", "人人都爱"];
const AUDIENCE_HINTS = [
  "白领", "宝妈", "学生", "上班族", "程序员", "店主", "老板", "打工人", "独居", "租房", "新人", "宝妈",
  "加班", "下班", "通勤", "早上", "深夜", "健身", "减肥", "考研", "考公", "带娃", "出差", "出差", "宿舍", "办公室", "地铁",
];

export function gate({ selling_point = "", audience = "" }) {
  const sp = String(selling_point).trim();
  const au = String(audience).trim();
  const issues = [];

  if (!sp) issues.push({ level: "error", field: "selling_point", msg: "卖点不能为空" });
  if (!au) issues.push({ level: "error", field: "audience", msg: "人群不能为空" });

  if (sp.length > 40) issues.push({ level: "warn", field: "selling_point", msg: `卖点 ${sp.length} 字，超过 40 字，30 秒装不下` });

  const hasNumber = /\d|[一二三四五六七八九十百千万]+(秒|分钟|小时|天|年|倍|块|元|克|斤|包|样|种)/.test(sp);
  const vagueHit = VAGUE.find((v) => sp.includes(v));
  if (!hasNumber) issues.push({ level: "warn", field: "selling_point", msg: "卖点里没有具体数字，容易写成空话" });
  if (vagueHit) issues.push({ level: "warn", field: "selling_point", msg: `「${vagueHit}」是通用词，谁都能说，建议换成可验证的事实` });

  const multi = (sp.match(/[、,，/]/g) || []).length;
  if (multi >= 2) issues.push({ level: "warn", field: "selling_point", msg: "像是多个卖点，30 秒只该讲一个" });

  if (au && !AUDIENCE_HINTS.some((h) => au.includes(h))) {
    issues.push({ level: "warn", field: "audience", msg: "人群缺场景，建议写成「谁 + 什么时候 + 什么痛点」" });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues };
}
