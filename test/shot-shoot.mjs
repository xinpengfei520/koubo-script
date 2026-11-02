import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";
const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-tp2", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  viewport: { width: 430, height: 860 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://127.0.0.1:3030/shoot.html");
await page.evaluate(() => sessionStorage.setItem("koubo:prompter", JSON.stringify({ text: "加班到十点的你又挨饿了吧？\n这个点点外卖要等好久，泡面早吃腻了。\n快去煮这个鲜煮面，水开下锅三分钟煮好一碗面。\n我自己橱柜常年囤着，今天首单九块九就能试三包。\n今晚想吃热乎面吗？戳左下角带走！", seconds: 30 })));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/d4-shoot.png" });
console.log("ok");
await ctx.close();
