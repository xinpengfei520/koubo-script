import { chromium } from "/Users/vancexin/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs";

const ctx = await chromium.launchPersistentContext("/Users/vancexin/Codex/koubo-text/.artifacts/chrome-tp", {
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
  viewport: { width: 430, height: 860 },
});
await ctx.grantPermissions(["camera", "microphone"], { origin: "http://127.0.0.1:3030" });
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });

await page.goto("http://127.0.0.1:3030/shoot.html");
await page.evaluate(() => {
  sessionStorage.setItem("koubo:prompter", JSON.stringify({
    text: "加班到十点的你又挨饿了吧？\n这个点点外卖要等好久，泡面早吃腻了，饿着肚子觉都睡不好，真让人心疼。\n快去煮这个鲜煮面，水开下锅三分钟煮好一碗面，面条爽滑汤底鲜。\n我自己橱柜常年囤着，今天首单九块九就能试三包。\n今晚想吃热乎面吗？戳左下角带走！",
    seconds: 30,
  }));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
console.log("camState:", await page.textContent("#camState"));
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/04-teleprompter.png" });

await page.click("#recBtn");
await page.waitForTimeout(3600); // 3-2-1 + 一点滚动
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/05-recording.png" });
const rec = await page.evaluate(() => ({ running: document.getElementById("recDot").hidden === false, timer: document.getElementById("timer").textContent, y: document.getElementById("scroll").style.transform }));
console.log("recording:", JSON.stringify(rec));

await page.waitForTimeout(3000);
await page.click("#recBtn");
await page.waitForTimeout(1200);
const done = await page.evaluate(() => ({
  resultShown: !document.getElementById("result").hidden,
  href: (document.getElementById("download").getAttribute("href") || "").slice(0, 12),
  name: document.getElementById("download").getAttribute("download"),
}));
console.log("result:", JSON.stringify(done));
await page.screenshot({ path: "/Users/vancexin/Codex/koubo-text/.artifacts/06-recorded.png" });
await ctx.close();
