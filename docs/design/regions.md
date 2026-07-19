# World & Regions

An open-feeling world of connected, themed regions. Exploration is **ungated** — you can
travel anywhere; difficulty comes from creature levels, not locked doors. Each region has a
distinct biome, a themed spawn table, and a beatable **regional boss**.

## World layout

A central hub town connects outward to the wild regions. Regions link to each other via edge
warps so the world feels continuous rather than a menu of levels.

```
                 [ Skyreach Highlands ]  (Air)
                          |
[ Emberscar Desert ] — [ Willowvale Town ] — [ Verdant Forest ]
      (Fire)            (Hub / start)             (Earth/Air)
                          |
                 [ Sunhaven Beach ]  (Water)
                          |
                 [ Gloomhollow Cave ]  (Darkness)
```

(Exact adjacency is authored in `data/regions.ts` via `connections`.)

## Regions

Each region defines: dominant type(s), suggested wild-level band, spawn table (weighted),
and a boss.

### 🏘️ Willowvale Town — Hub (start)
- **Biome:** cozy town (Animal Crossing vibe): shop, healing center, starter selection.
- **Encounters:** none (safe zone). Small grass patch outside for early catches.
- **Role:** heal, shop, save, choose starter, gateway to all regions.

### 🌲 Verdant Forest — Earth / Air
- **Levels:** ~2–8 (gentle early region).
- **Spawn focus:** Earth (Mosskit, Sprouturtle, Rootling, Fernram) + light Air (Breezling,
  Gustsparrow, Featherowl).
- **Grass:** dense forest-floor tall grass along winding paths.
- **Boss:** *Grove Warden* — Earth team (~L10), reward: currency + item.

### 🏖️ Sunhaven Beach — Water
- **Levels:** ~6–14.
- **Spawn focus:** Water (Bubblotter, Splashfrog, Coralcrab, Rippleray, Brinepenguin) + some
  Air near the shore.
- **Grass:** beach grass / dune tufts; shoreline tiles.
- **Boss:** *Tidecaller* — Water team (~L16).

### 🏜️ Emberscar Desert — Fire
- **Levels:** ~12–22.
- **Spawn focus:** Fire (Sparkit, Magmaboar, Ashfawn, Searam, Igndrake) + Earth.
- **Grass:** sparse dry brush patches between dunes.
- **Boss:** *Ashen Marauder* — Fire team (~L24).

### 🗻 Skyreach Highlands — Air
- **Levels:** ~18–30.
- **Spawn focus:** Air (Cloudkit, Skydragonfly, Zephyrkite, Driftbat) + high-altitude Fire/Earth.
- **Grass:** windswept cliff-top grass; verticality via stairs/ledges.
- **Boss:** *Storm Sovereign* — Air team (~L32).

### 🕳️ Gloomhollow Cave — Darkness
- **Levels:** ~24–40 (toughest region).
- **Spawn focus:** Darkness (Shadepup, Murkling, Shadowbat, Duskwolf, Wispghast) + rare Water.
- **Grass:** bioluminescent cave moss patches (functions as encounter grass).
- **Boss:** *Voidkeeper* — Darkness team (~L42), the marquee challenge.

## Encounter design

- Walking on **grass tiles** accumulates encounter chance per step (see
  [`systems.md`](systems.md#wild-encounters)).
- Each region's `spawnTable` is a **weighted list** with per-entry min/max level, so common
  creatures appear often and rares occasionally, always within the region's level band.
- A species can appear in multiple regions (via `regionTags`), with different level bands.

## Bosses ("obsessed to defeat")

Interpreted as **regional bosses/champions** — a strong trainer with a fixed team you can
choose to fight in each region.

- **Ungated:** you may attempt any boss any time; they're just hard if you're underleveled.
- **Reward:** in-game currency + a useful item on first defeat; a `flags` entry records the
  win (used by the codex/completion and to prevent repeat rewards; optional rematches later).
- **Team scaling:** fixed teams themed to the region's type, at the levels noted above.

## Map authoring (Tiled)

Each region is a Tiled map (`public/maps/<region>.json`) with layers:

- `ground`, `decoration` — visual tiles (soft/rounded Animal-Crossing palette).
- `collision` — blocked tiles.
- `grass` — encounter-triggering tiles (read by the encounter system).
- `warps` (object layer) — link points to adjacent regions (`connections`).
- `spawns`/`npcs` (object layer) — boss trainer placement, healing/shop interactables.
