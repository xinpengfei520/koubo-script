@AGENTS.md

# CLAUDE.md

Claude Code reads this file automatically. Everything durable lives in `AGENTS.md`
(imported above) — this file only adds workflow notes specific to this setup.

## Working here

- Start the app with `node server.js` in a background job, not a blocking shell. Port 3030.
- Verify with `node test/smoke.mjs` before saying a change works. It is offline and takes
  under a second.
- A real generation costs roughly 40–60 seconds and is the only way to validate prompt
  changes. Run it once, read the result, don't loop on it.
- Screenshots: `node scripts/shots.mjs design` writes to `.artifacts/` (gitignored).
  Requires the server to be up and `npm i -D playwright-core` once.

## Things that will waste your time

- Restarting the server after every edit. Static files are read per request; only
  `server.js` and `lib/*` need a restart.
- Chasing a "page does nothing" bug in the UI before checking the browser console. Two of
  the worst bugs here were an undefined function and an unset state field, both swallowed
  into a permanent loading state.
- Trusting a green `/api/check` on hand-written text. It proves the checker works, not that
  generation works.

## Style

- Keep UI copy in Simplified Chinese.
- Match the existing voice: short sentences, concrete numbers, no marketing filler.
- When you touch `web/style.css`, reuse the tokens at `:root` instead of new hex values.
