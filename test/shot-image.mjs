import fs from "node:fs";
import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";

const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-img", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--crash-dumps-dir=/Users/vancexin/Codex/koubo-text/.artifacts"],
  viewport: { width: 1440, height: 1000 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://127.0.0.1:3030", { waitUntil: "networkidle" });

await page.setInputFiles("#file", "/tmp/product.jpg");
await page.waitForTimeout(600);
await page.fill("#audience", "加班到十点的独居白领");
await page.click("#go");

await page.waitForSelector("#checks .check", { timeout: 180000 });
await page.waitForTimeout(800);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/03-image.png", fullPage: true });

const dump = await page.evaluate(() => JSON.stringify({ segments: state.segments, shots: state.shots, report: state.report, source: state.source, vision: state.vision }, null, 1));
fs.writeFileSync("/Users/vancexin/Codex/koubo-text/examples/sample-image-output.json", dump);

const s = await page.evaluate(() => ({
  chars: document.querySelector("#sumChars")?.textContent,
  sec: document.querySelector("#sumSec")?.textContent,
  badge: document.querySelector("#sumBadge")?.textContent,
  ok: [...document.querySelectorAll(".check")].filter((c) => c.className.includes("ok")).length,
  total: document.querySelectorAll(".check").length,
  polishBtns: document.querySelectorAll("[data-polish]").length,
}));
console.log(JSON.stringify(s));
await ctx.close();
