/** 语速与计时模型：中文口播 4.0–5.0 字/秒，默认 4.4；强停顿另算。 */

export const CPS = 4.4;
const PUNCT = /[\u3000-\u303f，。！？、；：""''（）【】《》…—·,.!?;:()"'\-]/g;
const STRONG = /[。！？；…!?;]/g;

const round1 = (n) => Math.round(n * 10) / 10;

export function analyzeText(text = "") {
  const punct = (text.match(PUNCT) || []).length;
  const strong = (text.match(STRONG) || []).length;
  const chars = [...text.replace(PUNCT, "")].filter((c) => !/\s/.test(c)).length;
  // 语速本身已包含句中自然停顿，只有句末/分号这类强停顿额外加时
  const pause = strong * 0.25;
  const seconds = chars / CPS + pause;
  return {
    chars,
    punct,
    strong,
    seconds: round1(seconds),
    min: round1(chars / 5 + pause * 0.8),
    max: round1(chars / 4 + pause * 1.2),
  };
}

/** segments: [{ id, text, ... }] → 加上 start/end/chars，并返回全片汇总 */
export function layout(segments) {
  let cursor = 0;
  const out = segments.map((s) => {
    const m = analyzeText(s.text);
    const seg = { ...s, ...m, start: round1(cursor), end: round1(cursor + m.seconds) };
    cursor = seg.end;
    return seg;
  });
  const total = out.reduce((a, b) => a + b.chars, 0);
  return {
    segments: out,
    total_chars: total,
    seconds: round1(out.reduce((a, b) => a + b.seconds, 0)),
    range: {
      min: round1(out.reduce((a, b) => a + b.min, 0)),
      max: round1(out.reduce((a, b) => a + b.max, 0)),
    },
  };
}
