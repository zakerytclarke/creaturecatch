# Creature Catch

A fully custom, **frontend-only** Pokémon-style creature-collecting RPG. Top-down
exploration across themed regions, walk-through-grass wild encounters, turn-based battles,
catching, leveling, evolution, regional bosses, a shop, and a creature codex — all running
entirely in the browser on **desktop and mobile**.

Built with **TypeScript + Phaser 3 + Vite**. All art is generated procedurally at runtime,
so there are no binary asset dependencies.

## Play / develop

```bash
npm install
npm run dev      # local dev server (open the printed URL)
npm run build    # typecheck + production build to dist/
npm run preview  # preview the production build
npm test         # unit tests (type chart, battle, catch, roster integrity)
```

> The Vite `base` is set to `/creaturecatch/` for GitHub Pages. For local dev this is handled
> automatically; when previewing the build, open the `/creaturecatch/` path.

## Controls

- **Desktop:** Arrow keys / WASD to move, `Space`/`Enter` to interact & advance text,
  `M` or `Esc` for the menu.
- **Mobile:** on-screen joystick (bottom-left) to move, `A` button to interact, `Menu` button
  for the menu. Battle/menu options are tap targets.

## Gameplay loop

1. Pick a starter in **Willowvale Town**, then head out through a warp to any region.
2. Walk through **tall grass** to trigger wild encounters.
3. **Battle** using type matchups (Fire · Earth · Air · Water · Darkness), weaken creatures,
   and throw **Catch Orbs** to catch them.
4. Win battles to gain **XP**, level up, learn moves, and **evolve**.
5. Beat each region's **boss** for currency, buy items at the town **shop**, and heal for free
   at the town center.
6. Fill your **Codex** — 120 creature forms across 50 evolution lines.

Progress autosaves to `localStorage`; you can also export/import your save from the menu.

## Design docs

See [`PLAN.md`](PLAN.md) and [`docs/`](docs/) for the full design: type system, creature
roster, regions, systems, and architecture.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. Enable Pages (Settings → Pages → Source: GitHub Actions) for it to go live.
