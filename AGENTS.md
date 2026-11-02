# AGENTS.md

Operating notes for coding agents (Codex, Claude Code, Cursor, …) working in this repo.
Read this before changing anything. It is short on purpose.

## What this is

A local-only web app that turns one selling point + one audience into a 30-second
Chinese short-video script, plus three shot cards and a compliance report.

No framework, no bundler, no npm dependencies. Node 20+ (uses global `fetch` and
`AbortSignal.any`). The UI is vanilla HTML/CSS/JS served by a single HTTP server.

Chinese is the product language: UI copy, script content, prompts and docs are all
Simplified Chinese. Code comments are Chinese too. Do not "translate for consistency".

## Commands

| Command | What it does |
|---|---|
| `node server.js` | Serve on <http://127.0.0.1:3030> |
| `node test/smoke.mjs` | Offline checks. No model, no network. Run this before claiming done |
| `node scripts/shots.mjs design` | Screenshots → `.artifacts/`. Server must be running |
| `node scripts/shots.mjs record` | Full shoot flow with Chrome's fake camera |

`scripts/shots.mjs` also takes `pack` (product image), `shoot` (teleprompter still) and
`image` (a real photo-to-script run, needs the model). It resolves `playwright-core` from
local or global installs and Chrome from the usual places; `CHROME_PATH` overrides.

## Architecture

```
server.js          HTTP + orchestration (generate, polish, check, static)
lib/prompt.js      system + user prompts for draft / repair / polish
lib/llm.js         OpenAI-compatible client: retry, timeout, JSON repair, abort
lib/check.js       A1–A9; the single source of truth for what "good" means
lib/banned.js      normalise → longest match → whitelist → single-char audit
lib/timing.js      chars ÷ 4.4/s + 0.25s per sentence break
lib/gate.js        four selling-point gates (single, checkable, situational, distinct)
lib/fallback.js    deterministic script when there is no model
web/               index.html + app.js (app), shoot.* (teleprompter)
data/banned.json   294 entries, 7 levels, 3 dispositions
```

## Invariants

Break these and the product stops making sense.

1. **Five beats, fixed ids** — `hook`, `pain`, `selling_point`, `trust`, `cta`, in that
   order. `SEGMENTS` in `lib/check.js` is the source of truth; `lib/prompt.js` must match.
2. **Timing** — 4.4 chars/s, +0.25s per `。！？；…`. Acceptance is 27–33s, and we always
   report a range (min/max), never a single number.
3. **Banned lexicon has three dispositions** — `block` / `review` / `warn`. Never promote
   a `review` word to `block`: "纯天然" and "0 糖" are legal *with evidence*, and the
   report exists to ask for that evidence.
4. **CTA keeps both beats** — an interaction sentence ("今晚想吃吗？") and an action
   sentence ("左下角带走"). Dropping either fails A3.
5. **Check ids are user-facing** — A1–A9. Adding a check means a new id, not renumbering.
6. **One generation at a time** — requests go through `enqueue()`, and the request is
   aborted when the client disconnects. Do not remove this; the gateway falls over.
7. **`.env` never enters git** — it holds the API key. `.gitignore` covers it.

## Conventions

- ESM (`"type": "module"`), no TypeScript, no build step. Keep it that way.
- No new dependencies unless genuinely unavoidable. `node server.js` and go is the point.
- `server.js` stays thin: parsing and wiring only, logic lives in `lib/`.
- CSS lives in `web/style.css` (app) and `web/shoot.css` (teleprompter). Tokens are at
  `:root`; use them instead of raw hex.
- Model output is always JSON. Anything that parses it goes through `extractJSON()`.

## Common tasks

**Add or change a banned word** — edit `data/banned.json`, matching the existing shape:
`{id, word, level, category, law, action, scope, replace[]}`. Then `node test/smoke.mjs`.

**Change the prompt** — `lib/prompt.js`. A change is not verified until you run one real
generation (~40s) and see A1–A9 green.

**Add a check** — push an item into the `items` array in `checkAll()` with a new id, then
update the tables in both READMEs.

**Restyle** — tokens first. The palette is paper/ink/vermilion; vermilion is reserved for
three things (section dot, timeline, shoot button). Don't add a fourth accent.

## Gotchas

- **Thinking tokens eat the budget.** The model bills reasoning tokens against
  `max_tokens`; below ~8000 the JSON comes back truncated. `extractJSON` can close
  brackets, but treat that as a safety net, not a strategy.
- **Large base64 kills the socket** (`ECONNRESET`). The browser downscales to 768px JPEG
  (~40KB) before sending; the server rejects anything over 3MB.
- **`[hidden]` needs help.** `.empty` and `.result` set `display:grid`, which beats the
  UA `[hidden]` rule. Both stylesheets force `[hidden]{display:none!important}`.
- **Full-screen overlays eat clicks.** The teleprompter and shade layers need
  `pointer-events:none`. This has bitten twice.
- **The model invents claims.** A9 only catches *numbers*; adjectives ("劲道", "高弹")
  still need a human.
- **Speech rate is an estimate.** Do not "fix" a ±15% drift by changing `CPS`; report the
  range instead.

## Verifying a change

1. `node test/smoke.mjs` — golden sample must stay A1–A9 green.
2. If prompts or the model client changed: one real generation, check `pass` and duration.
3. If UI changed: screenshot at 1440px **and** 430px. The phone layout has its own rules.
