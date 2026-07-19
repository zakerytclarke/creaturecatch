# Architecture

Technical design for Creature Catch. See [`../PLAN.md`](../PLAN.md) for the roadmap.

## Stack summary

- **TypeScript** everywhere.
- **Phaser 3** for the game runtime (tilemaps, camera, physics, input, audio, scenes).
- **Vite** for dev server + static builds.
- **Tiled** for authoring region maps (exported as JSON).
- **Vitest** for unit tests of pure systems.
- **localStorage** for persistence (with JSON export/import).

## Project structure

```
src/
├─ main.ts                 # Phaser.Game config, scale mode, scene registration
├─ scenes/
│  ├─ BootScene.ts         # set scale/input, hand off to Preload
│  ├─ PreloadScene.ts      # load atlases, maps, audio; show progress bar
│  ├─ TitleScene.ts        # start / continue / settings
│  ├─ WorldScene.ts        # overworld: map, player, NPCs, grass, warps
│  ├─ BattleScene.ts       # turn-based battle (launched over WorldScene)
│  ├─ MenuScene.ts         # pause menu: party, bag, save, codex
│  └─ CodexScene.ts        # creature dex
├─ systems/                # PURE, no Phaser imports — unit tested
│  ├─ battle.ts            # damage formula, turn resolution, faint handling
│  ├─ typeChart.ts         # effectiveness lookups
│  ├─ catch.ts             # catch-rate + shake checks
│  ├─ leveling.ts          # XP curves, level-up, stat growth
│  ├─ evolution.ts         # evolution trigger checks
│  ├─ encounters.ts        # step counter + spawn-table roll
│  └─ rng.ts               # seedable PRNG wrapper
├─ data/                   # typed content (source of truth)
│  ├─ types.ts             # ElementType enum + effectiveness matrix
│  ├─ moves.ts             # move definitions
│  ├─ creatures.ts         # species definitions + evolution links + learnsets
│  ├─ regions.ts           # region metadata + spawn tables + boss teams
│  └─ items.ts             # items, prices, effects
├─ entities/
│  ├─ Player.ts            # avatar controller, animations
│  ├─ NpcTrainer.ts        # boss/trainer entity
│  └─ CreatureInstance.ts  # a specific owned/wild creature (level, xp, moves, hp, iv-ish)
├─ ui/                     # HTML/CSS overlays via Phaser DOM elements
│  ├─ Hud.ts
│  ├─ Dialog.ts
│  ├─ PartyMenu.ts
│  ├─ Bag.ts
│  └─ styles.css
├─ input/
│  ├─ Keyboard.ts
│  └─ VirtualJoystick.ts   # on-screen d-pad/stick for touch
└─ save/
   ├─ schema.ts            # SaveGame type + version
   ├─ storage.ts           # load/save/migrate/export/import
```

### The pure-systems boundary

Everything in `systems/` is deterministic, engine-agnostic TypeScript. Scenes call into
systems and render the results. This keeps battle/catch/evolution math fully unit-testable and
prevents Phaser coupling from leaking into game rules.

## Data model (TypeScript sketches)

```ts
// data/types.ts
export type ElementType = 'fire' | 'earth' | 'water' | 'air' | 'darkness';

// systems: base stats block (simplified 4-stat model)
export interface BaseStats {
  hp: number; attack: number; defense: number; speed: number;
}

// data/creatures.ts
export interface Species {
  id: string;                 // 'embernewt'
  name: string;               // 'Embernewt'
  types: ElementType[];       // 1–2 types
  baseStats: BaseStats;
  catchRate: number;          // 1..255 (higher = easier)
  baseXpYield: number;
  growthRate: 'fast' | 'mediumFast' | 'slow';
  learnset: { level: number; moveId: string }[];
  evolvesTo?: { speciesId: string; atLevel: number }[];
  dexNumber: number;
  regionTags: string[];       // where it naturally appears
}

// data/moves.ts
export interface Move {
  id: string;
  name: string;
  type: ElementType;
  power: number;              // 0 for status moves
  accuracy: number;           // 0..100
  pp: number;
  category: 'physical' | 'status';
}

// entities/CreatureInstance.ts
export interface CreatureInstance {
  speciesId: string;
  level: number;
  xp: number;
  currentHp: number;
  moves: { moveId: string; pp: number }[];
  nickname?: string;
  originalCaughtLevel: number;
}

// data/regions.ts
export interface SpawnEntry { speciesId: string; weight: number; minLevel: number; maxLevel: number; }
export interface Region {
  id: string;
  name: string;
  biome: 'forest' | 'beach' | 'desert' | 'cave' | 'highlands' | 'town';
  mapKey: string;             // Tiled map asset key
  spawnTable: SpawnEntry[];   // grass encounters
  connections: string[];      // adjacent region ids (warps)
  boss?: { name: string; team: { speciesId: string; level: number }[]; reward: number };
}

// save/schema.ts
export interface SaveGame {
  version: number;
  player: { name: string; regionId: string; x: number; y: number; money: number };
  party: CreatureInstance[];
  box: CreatureInstance[];
  bag: { itemId: string; qty: number }[];
  dex: { seen: string[]; caught: string[] };
  flags: Record<string, boolean>;   // defeated bosses, unlocked warps, etc.
}
```

## Rendering & style

- **Art direction:** Animal-Crossing-like — soft, warm palette, rounded organic tiles,
  chunky friendly creature silhouettes. Top-down 3/4 perspective.
- **Tiles:** authored in Tiled; separate ground / decoration / collision / grass layers. The
  grass layer is tagged so the encounter system knows which tiles trigger encounters.
- **Creatures:** sprite atlases (idle + simple battle pose). Placeholder art first, upgraded later.

## Input (desktop + mobile)

- **Desktop:** WASD/Arrows to move, `Z`/`Enter`/`Space` to confirm, `X`/`Esc` to cancel/menu.
- **Mobile:** on-screen **virtual joystick** for movement + A/B action buttons; menus are
  tap-friendly HTML overlays.
- **Responsive scaling:** Phaser `Scale.FIT` with a fixed logical resolution and letterboxing,
  or `RESIZE` with camera bounds. Portrait and landscape both supported; UI overlays reflow
  with CSS. Touch controls only render when a touch device is detected.

## Persistence

- Autosave on key events (catch, evolve, boss defeat, region change) + manual save in menu.
- Versioned `SaveGame` with a migration function so save format can evolve.
- **Export/Import** save as JSON string (copy/paste or file) since there's no cloud.

## Build & deploy

- `vite build` → `dist/`. Set `base: '/creaturecatch/'` for GitHub Pages.
- GitHub Actions workflow builds on push to `main` and deploys `dist/` to Pages.
- No environment variables, secrets, or servers required.
