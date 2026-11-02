import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadEnv, ROOT_DIR } from "./lib/env.js";

loadEnv();

const { gate } = await import("./lib/gate.js");
const { checkAll, normalizeScript } = await import("./lib/check.js");
const { buildMessages, buildRepairMessages, buildPolishMessages } = await import("./lib/prompt.js");
const { analyzeText } = await import("./lib/timing.js");
const { chat, isConfigured, LLMError } = await import("./lib/llm.js");
const { buildFallback } = await import("./lib/fallback.js");
const { BANNED_META } = await import("./lib/banned.js");

const PORT = Number(process.env.PORT ?? 3030);
let chain = Promise.resolve();
function enqueue(fn) {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}
const WEB = path.join(ROOT_DIR, "web");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 6e6) reject(new Error("请求体过大"));
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error("请求体不是合法 JSON")); }
    });
    req.on("error", reject);
  });
}

function normalizeShots(raw, lay) {
  const list = Array.isArray(raw) ? raw : [];
  const total = lay.seconds || 30;
  const thirds = [0, total / 3, (total * 2) / 3, total];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const s = list[i] ?? {};
    const start = Number.isFinite(Number(s.start)) ? Number(s.start) : thirds[i];
    const end = Number.isFinite(Number(s.end)) ? Number(s.end) : thirds[i + 1];
    out.push({
      no: i + 1,
      start: Math.max(0, Math.round(start * 10) / 10),
      end: Math.max(start + 1, Math.round(end * 10) / 10),
      framing: String(s.framing ?? "").trim() || "中景",
      visual: String(s.visual ?? "").trim(),
      action: String(s.action ?? "").trim(),
      subtitle: [...String(s.subtitle ?? "").trim()].slice(0, 8).join(""),
    });
  }
  for (let i = 1; i < 3; i++) {
    if (out[i].start > out[i - 1].end + 1 || out[i].start < out[i - 1].start) {
      out[i].start = out[i - 1].end;
      out[i].end = Math.max(out[i].start + 2, out[i].end);
    }
  }
  // 收尾对齐到成片时长：差得不多就直接贴齐，差太多保留模型意图让 A7 去报
  out[2].end = Math.abs(out[2].end - total) <= 5 ? Math.round(total * 10) / 10 : Math.max(out[2].end, Math.round(total * 10) / 10);
  return out;
}

function readImage(input) {
  const img = input?.image;
  if (!img) return null;
  if (typeof img !== "string" || !img.startsWith("data:image/")) throw new Error("图片格式不对");
  if (img.length > 3_000_000) throw new Error("图片太大，压缩后再传（建议 ≤ 2MB）");
  return img;
}

async function polishScript({ segments, shots, input, target, mode, signal }) {
  const t0 = Date.now();
  const before = segments.map((s) => analyzeText(s.text));
  const res = await chat(buildPolishMessages(input, segments, target, mode), { signal, maxTokens: 6000, temperature: 0.7 });
  const after = normalizeScript(res.parsed);

  const rejected = [];
  const merged = segments.map((s, i) => {
    if (target !== "all" && s.id !== target) return s;
    const text = String(after[i]?.text ?? "").trim();
    if (!text) { rejected.push(s.label); return s; }
    const b = before[i].chars;
    const c = analyzeText(text).chars;
    if (Math.abs(c - b) / Math.max(1, b) > 0.15) { rejected.push(s.label); return s; }
    return { ...s, text };
  });

  const report = checkAll({ segments: merged, shots, input, meta: { polished: true } });
  return { segments: report.segments, shots: report.shots, report, rejected, ms: Date.now() - t0 };
}

async function generate(input, signal) {
  const t0 = Date.now();
  const image = readImage(input);
  const g = gate(input);
  if (image) {
    g.issues = g.issues.filter((i) => i.field !== "selling_point");
    if (!String(input.selling_point ?? "").trim()) g.issues.push({ level: "info", field: "selling_point", msg: "没写卖点，将从商品图判断（图上没有的不会编）" });
  }

  if (!isConfigured()) {
    const fb = buildFallback(input);
    const report = checkAll({ segments: fb.segments, shots: fb.shots, input, meta: { source: "fallback" } });
    return { ...fb, report, gate: g, source: "fallback", ms: Date.now() - t0, calls: 0 };
  }

  let parsed;
  try {
    const first = await chat(buildMessages({ ...input, image }), { signal });
    parsed = first.parsed;
    let calls = 1;
    let segments = normalizeScript(parsed);
    let lay = checkAll({ segments, shots: [], input });
    let shots = normalizeShots(parsed.shots, lay);
    let report = checkAll({ segments, shots, input, meta: { source: "llm" } });

    // 一次定点重写：只把不合格的段落交给模型改
    if (!report.pass && calls < 2) {
      try {
        const fix = await chat(buildRepairMessages(input, { segments, shots }, report), { signal });
        const s2 = normalizeScript(fix.parsed);
        const l2 = checkAll({ segments: s2, shots: [], input });
        const sh2 = normalizeShots(fix.parsed.shots ?? shots, l2);
        const r2 = checkAll({ segments: s2, shots: sh2, input, meta: { source: "llm", repaired: true } });
        if (r2.items.filter((i) => !i.ok).length <= report.items.filter((i) => !i.ok).length) {
          segments = s2; shots = sh2; report = r2;
        }
        calls++;
      } catch (e) {
        // 重写失败不影响首稿交付
      }
    }

    return { segments: report.segments, shots, report, gate: g, source: "llm", vision: Boolean(image), ms: Date.now() - t0, calls };
  } catch (e) {
    const fb = buildFallback(input);
    const report = checkAll({ segments: fb.segments, shots: fb.shots, input, meta: { source: "fallback" } });
    return { ...fb, report, gate: g, source: "fallback", error: e instanceof LLMError ? e.message : String(e), ms: Date.now() - t0, calls: 0 };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  console.log(new Date().toISOString(), req.method, url.pathname);
  try {
    if (req.method === "POST" && url.pathname === "/api/generate") {
      const input = await readBody(req);
      const hasImage = typeof input.image === "string" && input.image.startsWith("data:image/");
      if (!String(input.selling_point ?? "").trim() && !hasImage) {
        return json(res, 400, { error: "卖点和人群至少要有一个：填卖点，或者传一张商品图" });
      }
      if (!String(input.audience ?? "").trim()) {
        return json(res, 400, { error: "人群必须填" });
      }
      // 同一时刻只跑一条生成，避免并发把网关打满；客户端断开就中止，别白烧 token
      const ctrl = new AbortController();
      res.on("close", () => { if (!res.writableEnded) ctrl.abort(); });
      const out = await enqueue(() => generate(input, ctrl.signal));
      if (ctrl.signal.aborted) return;
      return json(res, 200, out);
    }

    if (req.method === "POST" && url.pathname === "/api/polish") {
      const body = await readBody(req);
      const segments = normalizeScript({ segments: body.segments });
      const input = body.input ?? {};
      const lay0 = checkAll({ segments, shots: [], input });
      const shots = normalizeShots(body.shots ?? [], lay0);
      const target = body.target === "all" ? "all" : String(body.target ?? "all");
      const mode = body.mode === "strong" ? "strong" : "light";
      if (!isConfigured()) return json(res, 503, { error: "模型未配置，润色需要真模型" });

      const ctrl = new AbortController();
      res.on("close", () => { if (!res.writableEnded) ctrl.abort(); });
      try {
        const out = await enqueue(() => polishScript({ segments, shots, input, target, mode, signal: ctrl.signal }));
        if (ctrl.signal.aborted) return;
        return json(res, 200, out);
      } catch (e) {
        return json(res, 502, { error: e instanceof LLMError ? e.message : "润色失败" });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/check") {
      const body = await readBody(req);
      const segments = normalizeScript({ segments: body.segments });
      const lay0 = checkAll({ segments, shots: [], input: body.input ?? {} });
      const shots = normalizeShots(body.shots ?? [], lay0);
      const report = checkAll({ segments, shots, input: body.input ?? {} });
      return json(res, 200, { segments: report.segments, shots: report.shots, report });
    }

    if (url.pathname === "/api/meta") {
      return json(res, 200, {
        banned: BANNED_META,
        model: { configured: isConfigured(), model: process.env.LLM_MODEL ?? "", base: process.env.LLM_BASE_URL ?? "" },
      });
    }

    // 静态文件
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = path.join(WEB, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(WEB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : "服务器错误" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`koubo-text  http://127.0.0.1:${PORT}`);
  console.log(isConfigured() ? `模型就绪：${process.env.LLM_MODEL}` : "模型未配置，将走本地兜底稿");
});