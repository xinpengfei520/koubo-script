import fs from "node:fs";
import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";

const sample = JSON.parse(fs.readFileSync("/Users/vancexin/Codex/koubo-text/examples/sample-image-output.json", "utf8"));
const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-int", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  viewport: { width: 1440, height: 1000 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://127.0.0.1:3030", { waitUntil: "networkidle" });
await page.evaluate((d) => { document.getElementById("empty").hidden = true; render(d); }, { segments: sample.segments, shots: sample.shots, report: sample.report, source: sample.source, vision: true });
await page.waitForTimeout(300);

const [popup] = await Promise.all([
  ctx.waitForEvent("page"),
  page.click("#shootBtn"),
]);
await popup.waitForLoadState("networkidle");
await popup.waitForTimeout(1500);
const info = await popup.evaluate(() => ({
  url: location.pathname,
  paras: document.querySelectorAll("#scroll p").length,
  first: document.querySelector("#scroll p")?.textContent?.slice(0, 20),
  cam: document.getElementById("camState")?.textContent,
}));
console.log("popup:", JSON.stringify(info));
await popup.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/04-teleprompter.png" });

await popup.click("#recBtn");
await popup.waitForTimeout(4200);
await popup.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/05-recording.png" });
await popup.click("#recBtn");
await popup.waitForTimeout(1200);
await popup.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/06-recorded.png" });
console.log("recorded:", await popup.evaluate(() => document.getElementById("download").getAttribute("download")));
await ctx.close();
