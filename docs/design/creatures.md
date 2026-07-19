# Creatures, Stats & Evolution

**50 base species** — 10 per type — each with **1–2 further evolution stages** (up to ~150
forms). Names below are a concrete starting roster; they can be renamed during content
authoring. Stages: **B** = base, **E1** = first evolution, **E2** = second evolution.

## Stat model

Each species has base stats: `HP, Attack, Defense, Speed` (simplified 4-stat model — see
[`type-system.md`](type-system.md) for why we skip split special stats in MVP).

- A `CreatureInstance` derives actual stats from base stats + level (light growth curve; a
  small hidden per-instance variance keeps individuals slightly unique).
- Evolutions have higher base-stat totals and often learn stronger moves.

## Leveling & XP

- Level range: **1–100**.
- Growth rates: `fast`, `mediumFast`, `slow` (classic cubic-ish curves).
- XP is awarded on winning a battle, scaled by the defeated creature's level + `baseXpYield`.
- On level-up: recompute stats, check `learnset` for new moves, check evolution triggers.

## Evolution

- Trigger: **level-based** for MVP (`evolvesTo: [{ speciesId, atLevel }]`).
- Single-stage lines evolve once (B→E1); dual-stage lines evolve twice (B→E1→E2).
- Evolution plays an animation, updates species (stats/typing/learnset), and can unlock
  new moves. Typing may shift or gain a second type on evolution.
- Hooks left open for later: item-based or friendship-based evolutions.

---

## Roster

Each line lists its stages and how many evolutions it has. Types shown per line (a line may
gain a second type on evolution).

### 🔥 Fire (10 lines)

| # | Base | E1 | E2 | Evos |
|---|------|----|----|------|
| 1 | Embernewt | Cindersal | Infernewt | 2 |
| 2 | Blazepup | Scorchound | — | 1 |
| 3 | Sparkit | Flarefox | Pyrovix | 2 |
| 4 | Magmaboar | Moltentusk | — | 1 |
| 5 | Ashfawn | Charstag | — | 1 |
| 6 | Coalcub | Emberbruin | Magmursa | 2 |
| 7 | Kindlemoth | Pyrelune | — | 1 |
| 8 | Searam | Solarhorn | — | 1 |
| 9 | Charcolt | Blazemare | Inferneigh | 2 |
| 10 | Igndrake | Volcanwyrm | — | 1 |

### ⛰️ Earth (10 lines)

| # | Base | E1 | E2 | Evos |
|---|------|----|----|------|
| 1 | Pebblemole | Boulderdig | Terraquake | 2 |
| 2 | Mosskit | Loamlynx | — | 1 |
| 3 | Sprouturtle | Barkshell | Grovtoise | 2 |
| 4 | Clayworm | Quartzerp | — | 1 |
| 5 | Ironbeetle | Granitusk | — | 1 |
| 6 | Fernram | Thornhorn | Craggoat | 2 |
| 7 | Rootling | Timberent | — | 1 |
| 8 | Mudpup | Terrahound | — | 1 |
| 9 | Cragcub | Bouldursa | Mountursa | 2 |
| 10 | Geodillo | Quartzadillo | — | 1 |

### 💧 Water (10 lines)

| # | Base | E1 | E2 | Evos |
|---|------|----|----|------|
| 1 | Bubblotter | Tidalotter | Aqualord | 2 |
| 2 | Splashfrog | Marshtoad | — | 1 |
| 3 | Coralcrab | Reefclaw | Brinabyss | 2 |
| 4 | Drizzlefin | Currentfish | — | 1 |
| 5 | Pearljelly | Tidaljelly | — | 1 |
| 6 | Mistseal | Frostwalrus | — | 1 |
| 7 | Rippleray | Tidalray | Abyssray | 2 |
| 8 | Kelpling | Kelpserpent | Leviakelp | 2 |
| 9 | Puddlepup | Aquahound | — | 1 |
| 10 | Brinepenguin | Glaciguin | — | 1 |

### 🌬️ Air (10 lines)

| # | Base | E1 | E2 | Evos |
|---|------|----|----|------|
| 1 | Breezling | Galewing | Tempestrix | 2 |
| 2 | Cloudkit | Cumulynx | — | 1 |
| 3 | Gustsparrow | Zephyrhawk | Cyclofalcon | 2 |
| 4 | Wispmoth | Auroramoth | — | 1 |
| 5 | Driftbat | Galebat | — | 1 |
| 6 | Skydragonfly | Stormdrake | Aerowyrm | 2 |
| 7 | Featherowl | Tempestowl | — | 1 |
| 8 | Puffling | Nimbowl | — | 1 |
| 9 | Zephyrkite | Windfalcon | — | 1 |
| 10 | Zephyrsprite | Auravian | — | 1 |

### 🌑 Darkness (10 lines)

| # | Base | E1 | E2 | Evos |
|---|------|----|----|------|
| 1 | Shadepup | Duskhound | Nightreaver | 2 |
| 2 | Gloomkit | Umbracat | — | 1 |
| 3 | Murkling | Netherfiend | Voidlord | 2 |
| 4 | Ravenling | Duskraven | — | 1 |
| 5 | Hexspider | Wraithweaver | — | 1 |
| 6 | Shadowbat | Nightwing | Eclipsewyrm | 2 |
| 7 | Shadeimp | Phantimp | — | 1 |
| 8 | Obsidianewt | Voidsalamander | — | 1 |
| 9 | Duskwolf | Nightfang | Umbrafenrir | 2 |
| 10 | Wispghast | Wraithlord | — | 1 |

**Totals:** 50 base + 30 first-evos... (each line has ≥1 evo) — per type, 4 lines with 2 evos
and 6 lines with 1 evo → `10 base + 10 E1 + 4 E2 = 24 forms/type` × 5 = **120 forms**.
(Adjust the split of 1- vs 2-evo lines if you want closer to 150 — e.g., make more lines
2-evo.)

## Starters

Player picks 1 of 3 starters at the beginning (suggested: a Fire, a Water, and an Earth base
line, e.g. **Embernewt / Bubblotter / Sprouturtle**). Air and Darkness starters can be an
option or reserved as early wild catches.

## Content-authoring checklist (M2 / M5)

- [ ] `creatures.ts`: all 50 base species with stats, types, catch rate, growth rate.
- [ ] Evolution links (`evolvesTo`) with level thresholds for every line.
- [ ] `learnset` per species (4–8 leveled moves).
- [ ] `moves.ts`: enough moves per type (≥3 damaging + 1 status each) for varied movesets.
- [ ] `dexNumber` assigned (stable ordering for the codex).
- [ ] `regionTags` mapping each species to the regions where it spawns.
- [ ] Validation script: every `evolvesTo.speciesId` and `learnset.moveId` exists.
