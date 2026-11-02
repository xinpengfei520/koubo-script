import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

/** 仓库根目录：scripts/lib/ → ../.. */
export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const OUT = path.join(ROOT, ".artifacts");
export const BASE = process.env.KOUBO_URL || "http://127.0.0.1:3030";

const require = createRequire(import.meta.url);

/** 先找项目依赖，再找全局 @playwright/cli 自带的 playwright-core */
function candidates() {
  const list = ["playwright-core", "playwright"];
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (globalRoot) {
      list.push(path.join(globalRoot, "@playwright", "cli", "node_modules", "playwright-core"));
      list.push(path.join(globalRoot, "playwright-core"));
      list.push(path.join(globalRoot, "playwright"));
    }
  } catch {
    /* 没装 npm 就算了 */
  }
  return list;
}

export function loadChromium() {
  for (const id of candidates()) {
    try {
      const mod = require(id);
      if (mod?.chromium) return mod.chromium;
    } catch {
      /* 下一个 */
    }
  }
  throw new Error(
    "找不到 playwright-core。\n  装一个：npm i -D playwright-core\n  或者：npm i -g @playwright/cli"
  );
}

/** 常见 Chrome 位置；可用 CHROME_PATH 覆盖 */
export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  return cands.find((p) => fs.existsSync(p)) || null;
}

/**
 * 打开一个带独立 profile 的浏览器。
 * @param {string} name profile 名，决定 .artifacts/chrome-<name>
 * @param {{width?:number,height?:number,camera?:boolean}} opts camera=true 时启用假摄像头
 */
export async function openBrowser(name, { width = 1440, height = 1000, camera = false } = {}) {
  const chromium = loadChromium();
  fs.mkdirSync(OUT, { recursive: true });

  const userDataDir = path.join(OUT, `chrome-${name}`);
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const args = ["--no-sandbox", `--crash-dumps-dir=${OUT}`];
  if (camera) args.push("--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream");

  const exe = chromePath();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    ...(exe ? { executablePath: exe } : { channel: "chrome" }),
    args,
    viewport: { width, height },
  });

  if (camera) {
    await ctx.grantPermissions(["camera", "microphone"], { origin: BASE }).catch(() => {});
  }

  const page = ctx.pages()[0] ?? (await ctx.newPage());
  return { ctx, page };
}

export const shot = (name) => path.join(OUT, name);
