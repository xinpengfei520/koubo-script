import fs from "node:fs";
import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";

const sample = JSON.parse(fs.readFileSync("/Users/vancexin/Codex/koubo-text/examples/sample-image-output.json", "utf8"));
const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-design", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"], viewport: { width: 1440, height: 1000 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://127.0.0.1:3030", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/d1-empty.png" });

await page.evaluate((d) => {
  document.getElementById("empty").hidden = true;
  render(d);
}, { segments: sample.segments, shots: sample.shots, report: sample.report, source: sample.source, vision: true });
await page.waitForTimeout(700);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/d2-result.png", fullPage: true });

await page.setViewportSize({ width: 430, height: 900 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/d3-mobile.png" });
console.log("ok");
await ctx.close();
