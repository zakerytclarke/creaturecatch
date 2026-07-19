# AGENTS.md

## Cursor Cloud specific instructions

Creature Catch is a **frontend-only** TypeScript + Phaser 3 + Vite browser game. There is no backend, database, or external service — everything (including all art) is generated procedurally at runtime.

### Services / commands

Standard commands live in `package.json` and `README.md`; use those. In short:

- `npm run dev` — Vite dev server (single service). The app is served under the base path `/creaturecatch/`, so the playable URL is `http://localhost:5173/creaturecatch/` (the bare `/` will 404). Pass `-- --host` to expose it.
- `npm test` — Vitest unit tests (type chart, battle, catch, worldgen, roster integrity).
- `npm run typecheck` — `tsc --noEmit`. This is the closest thing to a lint step; there is no ESLint config despite some `eslint-disable` comments in the source.
- `npm run build` — `tsc --noEmit` + Vite production build.
- `npm run preview` — serves the production build; open the `/creaturecatch/` path there too.

### Non-obvious gotchas

- **Base path**: because `vite.config.ts` sets `base` to `/creaturecatch/`, always open the `/creaturecatch/` URL in dev/preview. Set `BASE_PATH=/` to override if serving at root.
- **Runtime-only bugs are invisible to `tsc`/Vitest**: the type of testing that matters most here is loading the game in a real browser. `tsc` and the unit tests do not render Phaser, so runtime crashes (e.g. calling a method that doesn't exist on a Phaser object) pass CI but break the game. When touching rendering/UI code, load `http://localhost:5173/creaturecatch/` and verify the title screen, starter selection, and overworld actually render.
- **Debug hooks**: the running game exposes `window.__cc_game` (the Phaser game) and `window.__ccDebug` (e.g. `__ccDebug.battle('mosskit', 4)` to force an encounter). `scripts/smoke.mjs` is a manual Puppeteer smoke test that uses these; it requires a running preview server and a separately-installed `puppeteer`.
