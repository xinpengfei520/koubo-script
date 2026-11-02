import fs from "node:fs";
import path from "node:path";
import { openBrowser, shot, BASE, ROOT, OUT } from "./lib/browser.mjs";

const SAMPLE = path.join(ROOT, "examples", "sample-image-output.json");

const PACK_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:600px;height:600px;background:linear-gradient(160deg,#f7efe3,#e9d8c3);display:grid;place-items:center;font-family:"PingFang SC",sans-serif}
  .pack{width:280px;height:400px;border-radius:18px;background:linear-gradient(170deg,#b42318,#7f1d1d);box-shadow:0 24px 60px rgba(0,0,0,.28);position:relative;overflow:hidden;color:#fff;padding:26px;box-sizing:border-box}
  .pack:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 0%,rgba(255,255,255,.35),transparent 55%)}
  .brand{font-size:13px;letter-spacing:.3em;opacity:.8}
  .name{font-size:52px;font-weight:800;letter-spacing:.04em;margin:18px 0 6px;line-height:1}
  .taste{font-size:15px;opacity:.9}
  .noodle{position:absolute;left:26px;right:26px;bottom:96px;height:120px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fde68a,#f59e0b 60%,#b45309);opacity:.95}
  .noodle:after{content:"";position:absolute;inset:18px;border-radius:50%;border:6px dashed rgba(255,255,255,.55)}
  .tag{position:absolute;left:26px;bottom:26px;background:#fff;color:#7f1d1d;border-radius:999px;padding:8px 14px;font-size:15px;font-weight:700}
  .badge{position:absolute;right:22px;top:22px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.4);border-radius:10px;padding:6px 10px;font-size:12px}
</style></head><body>
<div class="pack">
  <div class="badge">非油炸</div>
  <div class="brand">鲜煮研究所</div>
  <div class="name">鲜煮面</div>
  <div class="taste">番茄牛腩 · 净含量 120g</div>
  <div class="noodle"></div>
  <div class="tag">水开下锅 3 分钟</div>
</div></body></html>`;

function loadSample() {
  if (!fs.existsSync(SAMPLE)) throw new Error(`缺少样例：${SAMPLE}`);
  return JSON.parse(fs.readFileSync(SAMPLE, "utf8"));
}

async function renderSample(page) {
  const s = loadSample();
  await page.evaluate((d) => {
    document.getElementById("empty").hidden = true;
    render(d);
  }, { segments: s.segments, shots: s.shots, report: s.report, source: s.source, vision: true });
  await page.waitForTimeout(500);
}

async function openApp(page) {
  const res = await page.goto(BASE, { waitUntil: "networkidle" }).catch(() => null);
  if (!res) throw new Error(`连不上 ${BASE}，先跑 node server.js`);
}

/** 渲染一张商品图，返回文件路径 */
async function renderProduct() {
  fs.mkdirSync(OUT, { recursive: true });
  const html = path.join(OUT, "pack.html");
  fs.writeFileSync(html, PACK_HTML);
  const { ctx, page } = await openBrowser("pack", { width: 600, height: 600 });
  await page.goto("file://" + html);
  const file = shot("product.png");
  await page.screenshot({ path: file });
  await ctx.close();
  return file;
}

const tasks = {
  /** 商品图素材 */
  async pack() {
    const file = await renderProduct();
    console.log("→", path.relative(ROOT, file));
  },

  /** 主界面：空态 / 结果 / 手机 */
  async design() {
    const { ctx, page } = await openBrowser("design");
    await openApp(page);
    await page.waitForTimeout(600);
    await page.screenshot({ path: shot("design-empty.png") });
    await renderSample(page);
    await page.screenshot({ path: shot("design-result.png"), fullPage: true });
    await page.setViewportSize({ width: 430, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot("design-mobile.png") });
    await ctx.close();
    console.log("→ design-empty / design-result / design-mobile .png");
  },

  /** 提词器（假摄像头，不录制） */
  async shoot() {
    const { ctx, page } = await openBrowser("shoot", { width: 430, height: 860, camera: true });
    await page.goto(BASE + "/shoot.html", { waitUntil: "networkidle" });
    const s = loadSample();
    await page.evaluate((t) => sessionStorage.setItem("koubo:prompter", JSON.stringify(t)), {
      text: s.segments.map((x) => x.text).join("\n"),
      seconds: s.report.seconds,
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: shot("teleprompter.png") });
    await ctx.close();
    console.log("→ teleprompter.png");
  },

  /** 从稿子点到拍摄，真录一段再停 */
  async record() {
    const { ctx, page } = await openBrowser("record", { camera: true });
    await openApp(page);
    await renderSample(page);

    const [popup] = await Promise.all([ctx.waitForEvent("page"), page.click("#shootBtn")]);
    await popup.waitForLoadState("networkidle");
    await popup.waitForTimeout(1500);

    await popup.click("#recBtn");
    await popup.waitForTimeout(5200);
    const live = await popup.evaluate(() => ({
      recording: !document.getElementById("recDot").hidden,
      timer: document.getElementById("timer").textContent,
    }));
    await popup.click("#recBtn");
    await popup.waitForTimeout(1500);

    const out = await popup.evaluate(() => ({
      shown: !document.getElementById("result").hidden,
      name: document.getElementById("download").getAttribute("download"),
    }));
    await popup.screenshot({ path: shot("record-result.png") });
    await ctx.close();

    if (!live.recording) throw new Error("没进入录制状态");
    if (!out.shown) throw new Error("停止后没出预览");
    console.log("→ record-result.png", JSON.stringify({ ...live, ...out }));
  },

  /** 真跑一次看图写稿（需要模型，约 40–60 秒） */
  async image() {
    const product = await renderProduct();
    const { ctx, page } = await openBrowser("image", { width: 1440, height: 1000 });
    await openApp(page);
    await page.setInputFiles("#file", product);
    await page.waitForTimeout(700);
    await page.fill("#audience", "加班到十点的独居白领");
    await page.click("#go");
    await page.waitForSelector("#checks .check", { timeout: 180000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot("image-result.png"), fullPage: true });

    const dump = await page.evaluate(() =>
      JSON.stringify({ segments: state.segments, shots: state.shots, report: state.report, source: state.source, vision: state.vision }, null, 1)
    );
    fs.writeFileSync(SAMPLE, dump);
    const stats = await page.evaluate(() => ({
      chars: document.querySelector("#sumChars")?.textContent,
      sec: document.querySelector("#sumSec")?.textContent,
      badge: document.querySelector("#sumBadge")?.textContent,
    }));
    await ctx.close();
    console.log("→ image-result.png", JSON.stringify(stats), "（样例已更新）");
  },
};

const name = process.argv[2];
if (!name || !tasks[name]) {
  console.log("用法：node scripts/shots.mjs <" + Object.keys(tasks).join(" | ") + ">");
  console.log("");
  console.log("  pack     生成商品图素材");
  console.log("  design   主界面三张（空态 / 结果 / 手机）");
  console.log("  shoot    提词器截图（假摄像头）");
  console.log("  record   走一遍拍摄流程并断言");
  console.log("  image    真跑一次看图写稿（需要模型）");
  process.exit(name ? 1 : 0);
}

try {
  await tasks[name]();
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
