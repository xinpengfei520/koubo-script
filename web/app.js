const $ = (id) => document.getElementById(id);
const state = { segments: [], shots: [], report: null, source: null, input: null, image: null, vision: false };
let checkTimer = null;

const fmt = (t) => {
  const s = Math.max(0, Number(t) || 0);
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function readInput() {
  return {
    selling_point: $("sp").value.trim(),
    audience: $("audience").value.trim(),
    product: $("product").value.trim(),
    offer: $("offer").value.trim(),
    platform: $("platform").value,
    tone: $("tone").value,
    image: state.image,
  };
}

async function boot() {
  try {
    const m = await fetch("/api/meta").then((r) => r.json());
    $("metaBanned").textContent = `词库 ${m.banned.total} 条 · ${Object.keys(m.banned.levels).length} 级`;
    $("metaModel").textContent = m.model.configured ? `模型 · ${m.model.model}` : "模型未配置 · 走兜底稿";
  } catch {
    $("metaBanned").textContent = "词库未就绪";
  }
}

/* ---------- 商品图 ---------- */

function compress(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 768;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("图片读不出来")); };
    img.src = url;
  });
}

async function setImage(file) {
  if (!file || !file.type.startsWith("image/")) return toast("请选一张图片");
  try {
    const dataUrl = await compress(file);
    state.image = dataUrl;
    $("preview").src = dataUrl;
    $("preview").hidden = false;
    $("dropHint").hidden = true;
    $("dropPreview").hidden = false;
    $("imgSize").textContent = `${Math.round(dataUrl.length / 1024)} KB · 已压缩`;
    $("drop").classList.add("has-image");
  } catch (e) {
    toast(e.message);
  }
}

function clearImage(e) {
  e.stopPropagation();
  state.image = null;
  $("preview").src = "";
  $("preview").hidden = true;
  $("dropHint").hidden = false;
  $("dropPreview").hidden = true;
  $("drop").classList.remove("has-image");
  $("file").value = "";
}

function bindUpload() {
  const drop = $("drop");
  $("file").onchange = () => { if ($("file").files[0]) setImage($("file").files[0]); };
  drop.onclick = (e) => { if (e.target.id !== "clearImg") $("file").click(); };
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) setImage(f);
  });
  $("clearImg").onclick = clearImage;
}

/* ---------- 渲染 ---------- */

function renderGate(issues) {
  const box = $("gate");
  box.innerHTML = "";
  for (const i of issues ?? []) {
    const d = document.createElement("div");
    d.className = `item ${i.level}`;
    d.textContent = i.msg;
    box.appendChild(d);
  }
}

function summaryHTML() {
  const r = state.report;
  const ok = r.pass;
  const tags = [];
  if (state.source === "llm") tags.push('<span class="badge alt">模型生成</span>');
  else tags.push('<span class="badge alt">模板兜底</span>');
  if (state.vision) tags.push('<span class="badge alt">看图生成</span>');
  return `<div class="stat"><span>总字数</span><b id="sumChars">${r.total_chars}</b></div>
    <div class="stat"><span>估算时长</span><b id="sumSec">${r.seconds}s</b></div>
    <div class="stat"><span>字数区间</span><b id="sumRange">${r.range.min}–${r.range.max}s</b></div>
    <span class="badge ${ok ? "ok" : "bad"}" id="sumBadge">${ok ? "可发布" : "需修改"}</span>${tags.join("")}`;
}

function segHTML(seg) {
  return `<div class="seg" data-id="${seg.id}">
    <div class="seg-head">
      <span class="seg-name">${seg.label}</span>
      <span class="seg-time">${fmt(seg.start)}–${fmt(seg.end)}</span>
      <span class="seg-char">${seg.chars} 字 · ${seg.seconds}s</span>
      <button class="mini" data-polish="${seg.id}" title="只润色这一段">润色</button>
    </div>
    <textarea rows="1" spellcheck="false">${seg.text}</textarea>
  </div>`;
}

function shotHTML(s) {
  return `<div class="shot">
    <div class="no">${s.no}</div>
    <div>
      <div class="t">${fmt(s.start)}–${fmt(s.end)} · ${s.framing}</div>
      <div class="v">${s.visual || "—"}${s.action ? `<span style="color:#9ca3af"> · ${s.action}</span>` : ""}</div>
      <div class="s">字幕：${s.subtitle || "—"}</div>
    </div>
  </div>`;
}

function paintReport(report) {
  const r = report;
  state.report = r;

  if ($("sumChars")) {
    $("sumChars").textContent = r.total_chars;
    $("sumSec").textContent = r.seconds + "s";
    $("sumRange").textContent = `${r.range.min}–${r.range.max}s`;
    const b = $("sumBadge");
    b.className = "badge " + (r.pass ? "ok" : "bad");
    b.textContent = r.pass ? "可发布" : "需修改";
  }

  for (const seg of r.segments) {
    const el = document.querySelector(`.seg[data-id="${seg.id}"]`);
    if (!el) continue;
    el.querySelector(".seg-time").textContent = `${fmt(seg.start)}–${fmt(seg.end)}`;
    el.querySelector(".seg-char").textContent = `${seg.chars} 字 · ${seg.seconds}s`;
  }

  $("checks").innerHTML = r.items
    .map(
      (i) => `<div class="check ${i.ok ? "ok" : "bad"}">
        <span class="n"><i class="mark ${i.ok ? "ok" : "bad"}">${i.ok ? "✓" : "✕"}</i>${i.id} ${i.name}</span>
        <div class="d">${i.detail}</div>
      </div>`
    )
    .join("");

  const hits = [...r.banned.hits].sort((a, b) => ({ block: 0, review: 1, warn: 2 }[a.action] - { block: 0, review: 1, warn: 2 }[b.action]));
  $("hits").innerHTML = hits.length
    ? hits
        .map(
          (h) => `<div class="hit ${h.action === "review" ? "review" : ""}">
            <code>${h.word}</code> · ${h.segment}段 · ${h.category} · <span class="rep">${h.law}</span>
            <div class="rep">建议：${(h.replace ?? []).join(" / ")}</div>
          </div>`
        )
        .join("")
    : `<div class="hit" style="background:#ecfdf3;color:#067647">没有命中禁用词</div>`;
}

function render(data) {
  state.segments = data.segments;
  state.shots = data.shots;
  state.source = data.source;
  state.report = data.report;
  state.vision = Boolean(data.vision);
  $("empty").hidden = true;
  const box = $("result");
  box.hidden = false;

  box.innerHTML = `
    <div class="summary">${summaryHTML()}</div>
    ${data.note ? `<div class="gate"><div class="item warn">${data.note}</div></div>` : ""}
    ${data.error ? `<div class="gate"><div class="item error">模型调用失败，已用兜底稿：${data.error}</div></div>` : ""}
    <h3>口播稿 · 可改可润色</h3>
    ${data.segments.map(segHTML).join("")}
    <h3>镜头提示</h3>
    <div class="shots">${data.shots.map(shotHTML).join("")}</div>
    <h3>检查表</h3>
    <div class="checks" id="checks"></div>
    <h3>禁用词</h3>
    <div class="hits" id="hits"></div>
    <div class="actions">
      <button id="shootBtn" class="shoot-btn">● 开始拍摄</button>
      <button id="polishAll">整篇润色</button>
      <button id="copyBtn">复制口播稿</button>
      <button id="mdBtn">下载 Markdown</button>
      <button id="reBtn">重新检查</button>
    </div>`;

  paintReport(data.report);
  bindResult();
}

function bindResult() {
  for (const ta of document.querySelectorAll(".seg textarea")) {
    ta.addEventListener("input", () => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
      clearTimeout(checkTimer);
      checkTimer = setTimeout(liveCheck, 700);
    });
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }
  $("copyBtn").onclick = copyScript;
  $("mdBtn").onclick = downloadMd;
  $("reBtn").onclick = liveCheck;
  $("polishAll").onclick = () => runPolish("all", "strong");
  $("shootBtn").onclick = openTeleprompter;

  document.querySelectorAll("[data-polish]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      runPolish(btn.dataset.polish, "light");
    };
  });
}

function openTeleprompter() {
  sessionStorage.setItem(
    "koubo:prompter",
    JSON.stringify({
      text: state.segments.map((s) => s.text).join("\n"),
      seconds: state.report?.seconds ?? 30,
      chars: state.report?.total_chars ?? 0,
    })
  );
  const w = window.open("/shoot.html", "_blank");
  if (!w) location.href = "/shoot.html";
}

function collectSegments() {
  return [...document.querySelectorAll(".seg")].map((el) => ({
    id: el.dataset.id,
    text: el.querySelector("textarea").value.trim(),
  }));
}

function applySegments(segments) {
  for (const s of segments) {
    const el = document.querySelector(`.seg[data-id="${s.id}"] textarea`);
    if (el) el.value = s.text;
  }
}

async function liveCheck() {
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: collectSegments(), shots: state.shots, input: state.input }),
    });
    const data = await res.json();
    if (data.report) {
      state.segments = data.segments;
      paintReport(data.report);
    }
  } catch {
    /* 检查失败不打扰编辑 */
  }
}

/* ---------- 润色 ---------- */

async function runPolish(target, mode) {
  if (!state.report) return toast("先生成一版");
  const buttons = [...document.querySelectorAll("[data-polish], #polishAll")];
  buttons.forEach((b) => (b.disabled = true));
  const label = target === "all" ? "整篇润色" : "这一段";
  toast(`${label}中，约 15–30 秒…`);

  try {
    const res = await fetch("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: collectSegments(), shots: state.shots, input: state.input, target, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "润色失败");
    applySegments(data.segments);
    paintReport(data.report);
    if (data.rejected?.length) toast(`${data.rejected.join("、")} 字数浮动太大，保留原稿`);
    else toast("润色完成");
  } catch (e) {
    toast(e.message);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

/* ---------- 导出 ---------- */

function fullText() {
  return state.segments.map((s) => s.text).join("\n");
}

async function copyScript() {
  try {
    await navigator.clipboard.writeText(fullText());
    toast("口播稿已复制");
  } catch {
    toast("复制失败，手动选中吧");
  }
}

function markdown() {
  const r = state.report;
  const i = state.input ?? {};
  const rows = r.segments
    .map((s) => `| ${s.label} | ${fmt(s.start)}–${fmt(s.end)} | ${s.chars} | ${s.text} |`)
    .join("\n");
  const shots = r.shots
    .map((s) => `| ${s.no} | ${fmt(s.start)}–${fmt(s.end)} | ${s.framing} | ${s.visual}${s.action ? " · " + s.action : ""} | ${s.subtitle} |`)
    .join("\n");
  const checks = r.items.map((c) => `- ${c.ok ? "✅" : "❌"} ${c.id} ${c.name}：${c.detail}`).join("\n");
  const hits = r.banned.hits.length
    ? r.banned.hits.map((h) => `- [${h.action}] 「${h.word}」${h.segment}段｜${h.law}｜建议：${(h.replace ?? []).join(" / ")}`).join("\n")
    : "- 无";
  return `# 30 秒口播稿

**卖点**：${i.selling_point ?? ""}
**人群**：${i.audience ?? ""}
**全片**：${r.total_chars} 字 ≈ ${r.seconds} 秒（${r.range.min}–${r.range.max} 秒区间）
**结论**：${r.conclusion}

## 口播稿

| 段落 | 时间码 | 字数 | 台词 |
|---|---|---|---|
${rows}

## 镜头提示

| # | 时间码 | 景别 | 画面 | 字幕 |
|---|---|---|---|---|
${shots}

## 检查表

${checks}

## 禁用词

${hits}
`;
}

function downloadMd() {
  const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "口播稿.md";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function generate() {
  const input = readInput();
  if (!input.audience) return toast("人群要填：谁 + 什么时候 + 什么痛点");
  if (!input.selling_point && !input.image) return toast("卖点或商品图，至少要给一个");

  state.input = input;
  const btn = $("go");
  btn.disabled = true;
  $("empty").hidden = true;
  const box = $("result");
  box.hidden = false;
  const t0 = Date.now();
  box.innerHTML = `<div class="loading"><div class="spin"></div><span id="elapsed">生成中 0s</span><span style="color:#9ca3af">· ${input.image ? "先看图，再写稿" : "先出稿，再自检"}</span></div>`;
  const tick = setInterval(() => {
    const el = $("elapsed");
    if (el) el.textContent = `生成中 ${Math.round((Date.now() - t0) / 1000)}s`;
  }, 500);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "生成失败");
    renderGate(data.gate?.issues);
    render(data);
  } catch (e) {
    box.innerHTML = `<div class="gate"><div class="item error">${e.message}</div></div>`;
  } finally {
    clearInterval(tick);
    btn.disabled = false;
  }
}

bindUpload();
$("go").onclick = generate;
window.addEventListener("error", (e) => toast("页面出错：" + e.message));
boot();
