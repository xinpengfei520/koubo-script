import fs from "node:fs";
import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";

const sample = JSON.parse(fs.readFileSync("/Users/vancexin/Codex/koubo-text/examples/sample-image-output.json", "utf8"));
const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-fin", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  viewport: { width: 1440, height: 1000 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://127.0.0.1:3030", { waitUntil: "networkidle" });
await page.evaluate((d) => {
  document.getElementById("empty").hidden = true;
  render(d);
}, { segments: sample.segments, shots: sample.shots, report: sample.report, source: sample.source, vision: true });
await page.waitForTimeout(400);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/07-final.png", fullPage: true });

const [popup] = await Promise.all([ctx.waitForEvent("page"), page.click("#shootBtn")]);
await popup.waitForLoadState("networkidle");
await popup.waitForTimeout(1200);
await popup.click("#recBtn");
await popup.waitForTimeout(5200);
const st = await popup.evaluate(() => ({ running: !document.getElementById("recDot").hidden, timer: document.getElementById("timer").textContent }));
await popup.click("#recBtn");
await popup.waitForTimeout(1500);
const out = await popup.evaluate(() => ({ shown: !document.getElementById("result").hidden, name: document.getElementById("download").getAttribute("download") }));
console.log("rec:", JSON.stringify(st), "out:", JSON.stringify(out));
await ctx.close();
