# Creature Catch — Master Plan

A fully custom, Pokémon-style creature-collecting RPG. **100% frontend**, playable on
**desktop and mobile**, with a **top-down view** and **Animal Crossing–inspired** visuals.
Explore an open-feeling world of distinct regions, walk through grass to trigger wild
encounters, battle and catch creatures, level them up, and evolve them.

> This repository currently contains planning docs only. See the roadmap below for the
> build sequence. Design details live in [`docs/`](docs/).

---

## 1. Vision

- **Genre:** Top-down monster-collecting RPG (a conceptual homage to Pokémon Brilliant Diamond).
- **Feel:** Cozy, open-world exploration with Animal Crossing warmth — soft colors, rounded
  tiles, cute creatures, ambient life. Discovery-driven rather than grind-driven.
- **Core fantasy:** Wander diverse regions, brush through tall grass, meet and catch creatures,
  build a team, evolve them through battle, and take on regional bosses.
- **Platform:** Runs entirely in the browser. No backend, no login. Static hosting.
- **Progression gating:** Exploration and catching are **not hard-gated**. The only limits are
  your team's strength and your resources (potions, catch orbs, revives). You can wander
  anywhere; tougher regions simply have stronger creatures.

## 2. Content targets (from the brief)

| Item | Target |
|------|--------|
| Elemental types | 5 — **Fire, Earth, Water, Air, Darkness** |
| Base creatures per type | 10 (**50 base species**) |
| Evolutions per line | 1–2 further stages (up to **~150 total forms**) |
| Regions | 6+ themed biomes (beach, forest, desert, cave, highlands, hub town, …) |
| Encounter mechanic | Walk through tall grass → random wild encounters |
| Bosses | A defeatable boss/champion per region (ungated, difficulty-scaled) |

Design references:
- Types & battle math → [`docs/design/type-system.md`](docs/design/type-system.md)
- Creature roster & evolutions → [`docs/design/creatures.md`](docs/design/creatures.md)
- World & regions → [`docs/design/regions.md`](docs/design/regions.md)
- Gameplay systems → [`docs/design/systems.md`](docs/design/systems.md)
- Tech architecture → [`docs/architecture.md`](docs/architecture.md)

## 3. Tech stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | **TypeScript** | Type-safe data/entities, scales with content |
| Bundler/dev | **Vite** | Fast HMR, trivial static builds |
| Engine | **Phaser 3** | Mature 2D engine: tilemaps, camera, physics, scenes, input, audio |
| Tilemaps | **Tiled** (`.tmj`/`.json`) | Standard editor; Phaser loads Tiled maps natively |
| State/save | **`localStorage`** (+ export/import JSON) | Zero infra persistence |
| UI overlays | Phaser DOM + lightweight HTML/CSS | Menus, HUD, codex |
| Audio | Phaser sound (WebAudio) | Music + SFX |
| Hosting | **GitHub Pages** (static) | Free, matches "frontend only" |
| Tests | **Vitest** | Unit-test pure systems (battle/catch/evolution math) |
| Lint/format | ESLint + Prettier | Consistency |

Why Phaser over a React/DOM game: the top-down, tile-based, grass-encounter loop with a
camera-followed avatar and sprite animation is exactly Phaser's wheelhouse. UI-heavy screens
(codex, menus) still use HTML/CSS overlays for accessibility and responsive layout.

## 4. High-level architecture

```
creaturecatch/
├─ index.html
├─ vite.config.ts
├─ public/                # static assets served as-is
│  ├─ assets/tiles/       # tilesets (Animal-Crossing-style, rounded, soft palette)
│  ├─ assets/sprites/     # creature + character spritesheets
│  ├─ assets/audio/       # music + sfx
│  └─ maps/               # Tiled map JSON per region
├─ src/
│  ├─ main.ts             # Phaser bootstrap + global config
│  ├─ scenes/             # Boot, Preload, World, Battle, Menu, Codex, TitleShaded
│  ├─ systems/            # PURE logic: battle, catch, leveling, evolution, encounters, spawn
│  ├─ data/               # creatures.ts, types.ts, moves.ts, regions.ts, items.ts (typed)
│  ├─ entities/           # Player, NpcTrainer, WildEncounter, CreatureInstance
│  ├─ ui/                 # HUD, dialog, party menu, bag, codex (HTML/CSS overlays)
│  ├─ save/               # save/load, schema versioning, export/import
│  └─ input/              # keyboard + virtual joystick / touch controls
└─ docs/                  # this planning package
```

The **`systems/` layer is engine-agnostic and pure** (no Phaser imports) so it can be unit
tested in isolation. Scenes/entities orchestrate; systems compute.

## 5. Roadmap / milestones

Each milestone is independently demoable. Ship vertically (thin end-to-end slices first).

### M0 — Scaffold & CI
- Vite + TS + Phaser project, ESLint/Prettier, Vitest.
- Empty `World` scene renders, GitHub Pages deploy workflow (`.github/workflows/deploy.yml`).
- **Done when:** blank game deploys to Pages and runs on desktop + mobile browsers.

### M1 — Movement & world tech
- Tiled tilemap loading, collision layer, grid-based (or smooth) top-down movement.
- Camera follow, animated player (4-direction walk), one starter region map.
- Desktop (WASD/arrows) + mobile (virtual joystick) input; responsive canvas scaling.
- **Done when:** you can walk around a region on phone and desktop with collisions.

### M2 — Data layer & type system
- Author `types.ts` (5 types + effectiveness matrix), `moves.ts`, and creature schema.
- Seed a handful of creatures across types with stats, moves, evolution links.
- Unit tests for type effectiveness and stat/XP curves.
- **Done when:** data validates and math is test-covered.

### M3 — Wild encounters & battle
- Tall-grass encounter trigger (step-based probability + region spawn tables).
- Turn-based battle scene: HP, moves, damage formula, type effectiveness, faint/win/lose.
- XP award, level-up, learn moves.
- **Done when:** walk in grass → battle a wild creature → win/lose → gain XP.

### M4 — Catching & party/box
- Catch mechanic (weaken + throw orb, catch-rate formula, shake checks).
- Party (max 6) + storage box; party menu UI; switch/heal.
- **Done when:** you can catch, store, and field creatures.

### M5 — Evolution & progression
- Level-based evolution (single/dual stage), evolution animation, learnset updates.
- Full creature roster authored (50 base + evolutions).
- **Done when:** all lines evolve correctly and roster is complete.

### M6 — Regions & bosses
- All regions authored as Tiled maps with region-specific spawn tables and connections.
- Region bosses (trainer battles) with fixed teams; reward on defeat.
- **Done when:** the full world is traversable and every region has a beatable boss.

### M7 — Items, shop, healing
- Bag + items (potions, revives, catch orbs, tiered), item use in/out of battle.
- Healing points (town center) + a shop to spend an in-game currency.
- **Done when:** the resource loop (earn → buy → heal → catch) is closed.

### M8 — Codex, save/load, polish
- Codex/creature-dex (seen vs caught, per-region), autosave + manual save, export/import.
- Audio, particles, transitions, mobile UX polish, balance pass.
- **Done when:** a full play session persists and feels cohesive.

### M9 — Content & balance expansion
- More creatures/moves tuning, additional regions, optional post-game boss.

> Milestones are sequenced by dependency, not calendar time. Each PR should land one
> vertical slice with tests where the logic is pure.

## 6. Deployment

- Static build (`vite build`) → `dist/`.
- GitHub Actions builds and publishes to **GitHub Pages** on push to `main`.
- Set Vite `base` to the repo path for Pages (`/creaturecatch/`).
- Fully client-side; no server, secrets, or database required.

## 7. Testing strategy

- **Unit (Vitest):** battle damage, type effectiveness, catch rate, XP/level curves,
  evolution triggers, spawn-table selection, save schema migration.
- **Manual playtest matrix:** desktop (keyboard) + mobile (touch) for each milestone.
- **Data validation:** a script asserts every creature has valid types, moves, and evolution
  targets, and every region references existing creatures.

## 8. Decisions locked for MVP (chosen to avoid blocking)

1. **Engine:** Phaser 3 + TypeScript + Vite.
2. **Movement:** grid-based tile movement first (simplest, matches classic feel); smooth
   movement can be layered later.
3. **Battle:** single-creature turn-based (1v1 on field), party switching allowed.
4. **Stats:** simplified — `HP, Attack, Defense, Speed` (single Atk/Def, no split
   special) to keep balance tractable for 150 forms. Revisit if depth is wanted.
5. **Art:** ship with placeholder rounded-tile + simple creature sprites; upgrade art as a
   parallel track. Style target: soft, warm, Animal-Crossing-like.
6. **Type chart:** balanced 5-type pentagon (see type-system doc).

## 9. Open questions (nice-to-haves, non-blocking)

- Do you want split **physical/special** stats (more depth) or keep the simplified 4-stat model?
- Status conditions (burn/soak/blind) in MVP or later?
- Day/night cycle affecting spawns (great fit for Darkness type)?
- Do bosses give badges/story beats, or are they purely optional challenges + rewards?
- Any existing art assets, or do we generate/commission the Animal-Crossing-style set?

These don't block M0–M4; we can decide as content work begins.
