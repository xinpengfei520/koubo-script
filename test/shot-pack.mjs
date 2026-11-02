import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";
const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-p", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"], viewport: { width: 600, height: 600 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("file:///Users/vancexin/Codex/koubo-text/.artifacts/pack.html");
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/product.png" });
await ctx.close();
console.log("shot ok");
