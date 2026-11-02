import { checkAll } from "../lib/check.js";
import { scan } from "../lib/banned.js";

const segs = [
  { id: "hook", text: "十点下班，你还煮得动面吗？" },
  { id: "pain", text: "洗锅、烧水、等面熟，折腾四十分钟，最后你只想点外卖。" },
  { id: "selling_point", text: "这包鲜煮面，水开下锅，三分钟捞出来就是一碗热汤面；面是锁鲜的，不是油炸的，汤底也配好了，你只负责烧壶水。" },
  { id: "trust", text: "配料表就六样，保质期四十五天；我连吃两周，第三周还想吃。" },
  { id: "cta", text: "今晚别点外卖了，左下角拍一箱，先试三包。" },
];
const shots = [
  { no: 1, start: 0, end: 9, framing: "中景", subtitle: "十点下班" },
  { no: 2, start: 9, end: 19, framing: "特写", subtitle: "三分钟" },
  { no: 3, start: 19, end: 27, framing: "近景", subtitle: "先试三包" },
];
const r = checkAll({ segments: segs, shots, input: { selling_point: "水开下锅3分钟煮好一碗面", audience: "加班到十点的独居白领" } });
console.log("秒", r.seconds, "字", r.total_chars, "pass", r.pass);
for (const i of r.items) console.log(i.ok ? "OK " : "XX ", i.id, i.name, "|", i.detail);

console.log("\n-- 变体扫描 --");
for (const t of ["全网最低价，闭眼入", "ZUI好用的面", "最 好 的 面", "NO.1 销量", "我最近天天吃，最后一口汤都喝了", "100%纯天然", "加微信领试用装"]) {
  const s = scan(t);
  console.log(t, "=>", s.hits.map((h) => h.word + "/" + h.action).join(", ") || "(clean)");
}
