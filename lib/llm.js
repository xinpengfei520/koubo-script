export class LLMError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "LLMError";
    this.cause = cause;
  }
}

export function llmConfig() {
  return {
    base: (process.env.LLM_BASE_URL ?? "").replace(/\/+$/, ""),
    model: process.env.LLM_MODEL ?? "",
    key: process.env.LLM_API_KEY ?? "",
  };
}

export function isConfigured() {
  const c = llmConfig();
  return Boolean(c.base && c.model && c.key);
}

/** 模型被截断时，尽量把没闭合的括号补上，别整篇作废 */
function closeBrackets(s) {
  let inStr = false;
  let esc = false;
  const stack = [];
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s;
  if (esc) out = out.slice(0, -1);
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

export function extractJSON(text) {
  if (!text) throw new LLMError("模型返回空内容");
  let s = String(text).trim();
  s = s.replace(/^\u0060{3}(?:json)?\s*/i, "").replace(/\s*\u0060{3}$/, "");
  const a = s.indexOf("{");
  if (a === -1) throw new LLMError("模型没吐 JSON");
  const body = s.slice(a);
  try {
    return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1));
  } catch {
    try {
      return JSON.parse(closeBrackets(body));
    } catch (e) {
      throw new LLMError(`JSON 解析失败（${body.length} 字）`, e);
    }
  }
}

export async function chat(messages, { temperature = 0.6, maxTokens = 8000, timeoutMs = 180000, signal } = {}) {
  const cfg = llmConfig();
  if (!isConfigured()) throw new LLMError("未配置模型（缺 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY）");

  const t0 = Date.now();
  const payload = JSON.stringify({ model: cfg.model, messages, temperature, max_tokens: maxTokens });

  async function once() {
    return fetch(`${cfg.base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: payload,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });
  }

  let res;
  let lastErr;
  for (let i = 0; i < 2; i++) {
    try {
      res = await once();
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      break;
    } catch (err) {
      lastErr = err;
      // 网关偶发断连，退避后重试一次
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  if (!res) {
    const reason = lastErr?.name === "TimeoutError" ? "超时" : `${lastErr?.message ?? ""}${lastErr?.cause?.message ? "（" + lastErr.cause.message + "）" : ""}`;
    throw new LLMError(`模型请求失败：${reason}`, lastErr);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LLMError(`模型返回 ${res.status}：${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return {
    content,
    parsed: extractJSON(content),
    usage: json?.usage ?? null,
    finish: json?.choices?.[0]?.finish_reason ?? null,
    ms: Date.now() - t0,
    model: json?.model ?? cfg.model,
  };
}
