const $ = (id) => document.getElementById(id);
let payload = { text: "", seconds: 30 };
try { payload = JSON.parse(sessionStorage.getItem("koubo:prompter") || "null") || payload; } catch {}

const scrollEl = $("scroll");
const prompter = $("prompter");

const state = {
  running: false,
  offset: 0,
  font: Math.min(38, Math.max(24, Math.round(window.innerWidth * 0.075))),
  mult: 1,
  stream: null,
  recorder: null,
  chunks: [],
  startedAt: 0,
  timerId: 0,
  rafId: 0,
  idleTimer: 0,
};

/* ---------- 文本 ---------- */

function renderText() {
  const paras = String(payload.text || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  scrollEl.innerHTML = paras.length
    ? paras.map((p) => `<p>${p.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</p>`).join("")
    : "<p>还没有稿子，回去生成一条再来。</p>";
  scrollEl.style.fontSize = state.font + "px";
}

const readingY = () => prompter.clientHeight * 0.34;
const totalDistance = () => Math.max(1, scrollEl.scrollHeight);

function apply() {
  scrollEl.style.transform = `translateY(${readingY() - state.offset}px)`;
}

function resetScroll(applyNow = true) {
  state.offset = 0;
  if (applyNow) apply();
}

/* ---------- 滚动 ---------- */

function startLoop() {
  cancelAnimationFrame(state.rafId);
  let last = performance.now();
  const base = totalDistance() / Math.max(5, Number(payload.seconds) || 30);

  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // 倍速实时生效，录到一半觉得快/慢可以直接调
    state.offset += base * state.mult * dt;
    if (state.offset >= totalDistance()) {
      state.offset = totalDistance();
      apply();
      stopRecording(true);
      return;
    }
    apply();
    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  cancelAnimationFrame(state.rafId);
}

/* ---------- 摄像头 ---------- */

async function initCamera() {
  if (state.stream) return true;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1080 }, height: { ideal: 1920 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    $("cam").srcObject = state.stream;
    $("camState").textContent = "摄像头就绪";
    return true;
  } catch (e) {
    $("camState").textContent = "无摄像头";
    showErr(`打不开摄像头：${e.name === "NotAllowedError" ? "权限被拒绝，去地址栏左侧允许" : e.message}。没有摄像头也能用提词器，但录不了。`);
    return false;
  }
}

function stopCamera() {
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
}

/* ---------- 录制 ---------- */

function pickMime() {
  const cands = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return cands.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}

function startTimer() {
  const tick = () => {
    const s = Math.floor((Date.now() - state.startedAt) / 1000);
    $("timer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  tick();
  state.timerId = setInterval(tick, 500);
}

function countdown(cb) {
  const box = $("countdown");
  const num = $("countNum");
  box.hidden = false;
  let n = 3;
  num.textContent = n;
  const t = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(t);
      box.hidden = true;
      cb();
      return;
    }
    num.textContent = n;
    num.style.animation = "none";
    void num.offsetWidth;
    num.style.animation = "";
  }, 800);
}

async function startRecording() {
  const ok = await initCamera();
  if (!ok) return;
  countdown(() => {
    const mime = pickMime();
    try {
      state.recorder = new MediaRecorder(state.stream, mime ? { mimeType: mime, videoBitsPerSecond: 5_000_000 } : undefined);
    } catch {
      showErr("这个浏览器不支持录制");
      return;
    }
    state.chunks = [];
    state.recorder.ondataavailable = (e) => { if (e.data.size) state.chunks.push(e.data); };
    state.recorder.onstop = onStopped;
    state.recorder.start(250);

    state.startedAt = Date.now();
    state.running = true;
    resetScroll();
    startLoop();
    startTimer();
    $("recDot").hidden = false;
    $("recBtn").classList.add("on");
    hideSoon();
  });
}

function stopRecording(auto = false) {
  if (!state.running) return;
  state.running = false;
  stopLoop();
  clearInterval(state.timerId);
  $("recDot").hidden = true;
  $("recBtn").classList.remove("on");
  if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  if (auto) $("tip").textContent = "稿子念完了，已自动停止";
}

function onStopped() {
  const type = state.recorder?.mimeType || "video/webm";
  const blob = new Blob(state.chunks, { type });
  const url = URL.createObjectURL(blob);
  $("playback").src = url;
  const a = $("download");
  a.href = url;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  a.download = `口播_${stamp}.${type.includes("mp4") ? "mp4" : "webm"}`;
  $("result").hidden = false;
}

/* ---------- 交互 ---------- */

function showErr(msg) {
  const el = $("err");
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 6000);
}

function hideSoon() {
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    if (state.running) $("controls").classList.add("hide");
  }, 3500);
}

document.addEventListener("mousemove", () => {
  $("controls").classList.remove("hide");
  hideSoon();
});
document.addEventListener("touchstart", () => {
  $("controls").classList.remove("hide");
  hideSoon();
}, { passive: true });

$("recBtn").onclick = () => (state.running ? stopRecording() : startRecording());
$("again").onclick = () => {
  $("result").hidden = true;
  resetScroll();
  $("tip").textContent = "空格 开始 / 暂停 · ↑↓ 调速 · Esc 退出";
};
$("closeBtn").onclick = exit;

document.querySelectorAll("[data-act]").forEach((btn) => {
  btn.onclick = () => {
    const act = btn.dataset.act;
    if (act === "speed+") { state.mult = Math.min(2, +(state.mult + 0.15).toFixed(2)); $("tip").textContent = `语速 ×${state.mult.toFixed(2)}`; }
    if (act === "speed-") { state.mult = Math.max(0.5, +(state.mult - 0.15).toFixed(2)); $("tip").textContent = `语速 ×${state.mult.toFixed(2)}`; }
    if (act === "font+") { state.font = Math.min(54, state.font + 3); scrollEl.style.fontSize = state.font + "px"; apply(); }
    if (act === "font-") { state.font = Math.max(22, state.font - 3); scrollEl.style.fontSize = state.font + "px"; apply(); }
    if (act === "reset") { resetScroll(); }
    if (act === "exit") { exit(); }
  };
});

function exit() {
  stopRecording();
  stopCamera();
  if (window.opener) window.close();
  else location.href = "/";
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); state.running ? stopRecording() : startRecording(); }
  if (e.code === "Escape") exit();
  if (e.code === "ArrowUp") { state.mult = Math.min(2, +(state.mult + 0.1).toFixed(2)); $("tip").textContent = `语速 ×${state.mult.toFixed(2)}`; }
  if (e.code === "ArrowDown") { state.mult = Math.max(0.5, +(state.mult - 0.1).toFixed(2)); $("tip").textContent = `语速 ×${state.mult.toFixed(2)}`; }
});

window.addEventListener("resize", apply);
window.addEventListener("beforeunload", () => { stopCamera(); });

renderText();
resetScroll();
setTimeout(() => { resetScroll(); }, 60);
initCamera();
