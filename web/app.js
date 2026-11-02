const $ = (id) => document.getElementById(id);
const state = { segments: [], shots: [], report: null, source: null, input: null, image: null, vision: false, lastData: null, meta: null };
let checkTimer = null;

const FRAME_EN = { 特写: "Close-up", 近景: "Medium close", 中景: "Medium", 全景: "Wide", 远景: "Long shot" };
const framing = (f) => (getLang() === "en" ? FRAME_EN[f] || f : f);

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
    lang: getLang(),
    image: state.image,
  };
}

function paintMeta(m) {
  $("metaBanned").textContent = t("meta.banned", { n: m.banned.total, l: Object.keys(m.banned.levels).length });
  $("metaModel").textContent = m.model.configured ? t("meta.model", { m: m.model.model }) : t("meta.nomodel");
}

async function boot() {
  try {
    const m = await fetch("/api/meta").then((r) => r.json());
    state.meta = m;
    paintMeta(m);
  } catch {
    $("metaBanned").textContent = t("meta.loading");
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t("toast.unreadable"))); };
    img.src = url;
  });
}

async function setImage(file) {
  if (!file || !file.type.startsWith("image/")) return toast(t("toast.pickimage"));
  try {
    const dataUrl = await compress(file);
    state.image = dataUrl;
    $("preview").src = dataUrl;
    $("preview").hidden = false;
    $("dropHint").hidden = true;
    $("dropPreview").hidden = false;
    $("imgSize").textContent = `${Math.round(dataUrl.length / 1024)} KB`;
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
  tags.push(`<span class="badge alt">${t(state.source === "llm" ? "tag.model" : "tag.template")}</span>`);
  if (state.vision) tags.push(`<span class="badge alt">${t("tag.vision")}</span>`);
  return `<div class="stat"><span>${t("sum.chars")}</span><b id="sumChars">${r.total_chars}</b></div>
    <div class="stat"><span>${t("sum.seconds")}</span><b id="sumSec">${r.seconds}s</b></div>
    <div class="stat"><span>${t("sum.range")}</span><b id="sumRange">${r.range.min}–${r.range.max}s</b></div>
    <span class="badge ${ok ? "ok" : "bad"}" id="sumBadge">${t(ok ? "badge.ready" : "badge.work")}</span>${tags.join("")}`;
}

function segHTML(seg) {
  return `<div class="seg" data-id="${seg.id}">
    <div class="seg-head">
      <span class="seg-name">${seg.label}</span>
      <span class="seg-time">${fmt(seg.start)}–${fmt(seg.end)}</span>
      <span class="seg-char">${t("seg.chars", { n: seg.chars })} · ${seg.seconds}s</span>
      <button class="mini" data-polish="${seg.id}">${t("btn.polish")}</button>
    </div>
    <textarea rows="1" spellcheck="false">${seg.text}</textarea>
  </div>`;
}

function shotHTML(s) {
  return `<div class="shot">
    <div class="no">${s.no}</div>
    <div>
      <div class="t">${fmt(s.start)}–${fmt(s.end)} · ${framing(s.framing)}</div>
      <div class="v">${s.visual || "—"}${s.action ? `<span style="color:#9ca3af"> · ${s.action}</span>` : ""}</div>
      <div class="s">${t("shot.subtitle")}: ${s.subtitle || "—"}</div>
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
    b.textContent = t(r.pass ? "badge.ready" : "badge.work");
  }

  for (const seg of r.segments) {
    const el = document.querySelector(`.seg[data-id="${seg.id}"]`);
    if (!el) continue;
    el.querySelector(".seg-time").textContent = `${fmt(seg.start)}–${fmt(seg.end)}`;
    el.querySelector(".seg-char").textContent = `${t("seg.chars", { n: seg.chars })} · ${seg.seconds}s`;
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
            <code>${h.word}</code> · ${h.segment} · ${h.category} · <span class="rep">${h.law}</span>
            <div class="rep">${t("hits.suggest")} ${(h.replace ?? []).join(" / ")}</div>
          </div>`
        )
        .join("")
    : `<div class="hit" style="background:#ecfdf3;color:#067647">${t("hits.none")}</div>`;
}

function render(data) {
  state.lastData = data;
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
    ${data.error ? `<div class="gate"><div class="item error">${t("toast.env", { m: data.error })}</div></div>` : ""}
    <h3>${t("sec.script")}</h3>
    ${data.segments.map(segHTML).join("")}
    <h3>${t("sec.shots")}</h3>
    <div class="shots">${data.shots.map(shotHTML).join("")}</div>
    <h3>${t("sec.checks")}</h3>
    <div class="checks" id="checks"></div>
    <h3>${t("sec.hits")}</h3>
    <div class="hits" id="hits"></div>
    <div class="actions">
      <button id="shootBtn" class="shoot-btn">${t("btn.shoot")}</button>
      <button id="polishAll">${t("btn.polishAll")}</button>
      <button id="copyBtn">${t("btn.copy")}</button>
      <button id="mdBtn">${t("btn.md")}</button>
      <button id="reBtn">${t("btn.recheck")}</button>
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
      lang: getLang(),
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
      body: JSON.stringify({ segments: collectSegments(), shots: state.shots, input: state.input, lang: getLang() }),
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

/* ---------- 语言切换 ---------- */

async function relocalize() {
  if (!state.lastData) return;
  const current = collectSegments();
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: current, shots: state.shots, input: state.input, lang: getLang() }),
    });
    const data = await res.json();
    render({ ...state.lastData, segments: data.segments, shots: data.shots, report: data.report });
  } catch {
    /* 网络抖一下就算了 */
  }
}

function initLangSwitch() {
  const box = $("langSwitch");
  box.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.lang === getLang()) return;
      setLang(btn.dataset.lang);
      syncLangButtons();
      applyI18n();
      if (state.meta) paintMeta(state.meta);
      relocalize();
    };
  });
}

/* ---------- 润色 ---------- */

async function runPolish(target, mode) {
  if (!state.report) return toast(t("toast.first"));
  const buttons = [...document.querySelectorAll("[data-polish], #polishAll")];
  buttons.forEach((b) => (b.disabled = true));
  toast(t(target === "all" ? "toast.polishall" : "toast.polishseg"));

  try {
    const res = await fetch("/api/polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: collectSegments(), shots: state.shots, input: state.input, target, mode, lang: getLang() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "polish failed");
    applySegments(data.segments);
    paintReport(data.report);
    if (data.rejected?.length) toast(t("toast.reverted", { names: data.rejected.join(getLang() === "en" ? ", " : "、") }));
    else toast(t("toast.polished"));
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
    toast(t("toast.copied"));
  } catch {
    toast(t("toast.copyfail"));
  }
}

function markdown() {
  const r = state.report;
  const i = state.input ?? {};
  const rows = r.segments
    .map((s) => `| ${s.label} | ${fmt(s.start)}–${fmt(s.end)} | ${s.chars} | ${s.text} |`)
    .join("\n");
  const shots = r.shots
    .map((s) => `| ${s.no} | ${fmt(s.start)}–${fmt(s.end)} | ${framing(s.framing)} | ${s.visual}${s.action ? " · " + s.action : ""} | ${s.subtitle} |`)
    .join("\n");
  const checks = r.items.map((c) => `- ${c.ok ? "✅" : "❌"} ${c.id} ${c.name}：${c.detail}`).join("\n");
  const hits = r.banned.hits.length
    ? r.banned.hits.map((h) => `- [${h.action}] 「${h.word}」${h.segment}｜${h.law}｜${(h.replace ?? []).join(" / ")}`).join("\n")
    : `- ${t("md.none")}`;
  return `# ${t("md.title")}

**${t("md.sp")}**: ${i.selling_point ?? ""}
**${t("md.audience")}**: ${i.audience ?? ""}
**${t("md.total")}**: ${r.total_chars} → ${r.seconds}s (${r.range.min}–${r.range.max}s)
**${t("md.conclusion")}**: ${r.conclusion}

## ${t("md.script")}

| ${t("md.segment")} | ${t("md.time")} | ${t("md.chars")} | ${t("md.line")} |
|---|---|---|
${rows}

## ${t("md.shots")}

| ${t("md.no")} | ${t("md.time")} | ${t("md.framing")} | ${t("md.visual")} | ${t("md.subtitle")} |
|---|---|---|---|---|
${shots}

## ${t("md.checks")}

${checks}

## ${t("md.banned")}

${hits}
`;
}

function downloadMd() {
  const blob = new Blob([markdown()], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = t("md.file");
  a.click();
  URL.revokeObjectURL(a.href);
}

async function generate() {
  const input = readInput();
  if (!input.audience) return toast(t("toast.needaudience"));
  if (!input.selling_point && !input.image) return toast(t("toast.needone"));

  state.input = input;
  const btn = $("go");
  btn.disabled = true;
  $("empty").hidden = true;
  const box = $("result");
  box.hidden = false;
  const t0 = Date.now();
  const hint = !input.image ? t("gen.hint.model") : t("gen.hint.template");
  box.innerHTML = `<div class="loading"><div class="spin"></div><span id="elapsed">${t("gen.elapsed", { s: 0 })}</span><span style="opacity:.6">· ${hint}</span></div>`;
  const tick = setInterval(() => {
    const el = $("elapsed");
    if (el) el.textContent = t("gen.elapsed", { s: Math.round((Date.now() - t0) / 1000) });
  }, 500);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "failed");
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
initLangSwitch();
$("go").onclick = generate;
window.addEventListener("error", (e) => toast(t("toast.pageerror", { m: e.message })));

applyI18n();
syncLangButtons();
boot();
