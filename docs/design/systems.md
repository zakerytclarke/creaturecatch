# Gameplay Systems

How the moment-to-moment game works. Battle math lives in
[`type-system.md`](type-system.md); this doc covers the loops that use it.

## Overworld movement

- **Top-down**, grid-based tile movement for MVP (crisp, classic feel); optional smooth
  movement later.
- Player faces one of 4 directions with a walk animation; camera follows with map bounds.
- Collision from the Tiled `collision` layer. Warps on the `warps` object layer move the
  player between regions.
- **Interact** button triggers NPCs/bosses, healing center, and shop when facing them.

## Wild encounters

- Each step **onto a `grass` tile** rolls for an encounter.
- Encounter chance model: a per-step probability (e.g., ~10%) optionally modulated by a step
  counter to avoid long dry/streaky runs. Tunable per region.
- On trigger: pick a species from the region `spawnTable` by **weight**, roll a level within
  that entry's `[minLevel, maxLevel]`, build a wild `CreatureInstance`, and launch
  `BattleScene` over the paused `WorldScene`.

```
step onto grass → roll(encounterChance) → pick weighted species
   → roll level → instantiate wild creature → start battle
```

## Battle loop

Single active creature per side (1v1 on field), party switching allowed.

Per turn, the player chooses one of:
1. **Fight** — pick a move (consumes PP; damage via the formula in `type-system.md`).
2. **Bag** — use an item (potion, catch orb, etc.).
3. **Party** — switch active creature (costs the turn).
4. **Run** — flee a wild battle (not allowed vs bosses).

Resolution order by **Speed**. After both act, apply faints. Battle ends when one side has no
usable creatures, the wild creature is caught, or the player runs.

- **Win:** award XP to participants → level-ups → move learns → evolution checks.
- **Lose (all party fainted):** warp back to the last healing center, party revived (small
  penalty optional).

## Catching

Only in **wild** battles (not vs bosses). Throwing a catch orb runs the catch formula:

```
maxHp, currentHp = defender stats
ballBonus       = orb tier multiplier (basic=1, great=1.5, ultra=2, ...)
statusBonus     = 1 (reserved for future status effects)

a = ((3*maxHp - 2*currentHp) * catchRate * ballBonus * statusBonus) / (3*maxHp)
if a >= 255 → guaranteed catch
else:
  b = 1048560 / floor( sqrt( floor( sqrt( floor(16711680 / a) ) ) ) )
  shake succeeds if rng(0..65535) < b, checked 4 times → all 4 pass = catch
```

Lower current HP and higher orb tier ⇒ higher catch chance. Caught creatures go to the party
(if <6) or storage box. Update `dex.caught`.

## Party & storage box

- **Party:** up to 6 active creatures. Reorder, view stats/moves, use items, revive/heal.
- **Box:** unlimited storage for the rest; move creatures between party and box in town
  (or anywhere, TBD). Fainted party members must be healed to battle.

## Items & economy

- **Currency:** earned from winning battles and first-time boss defeats.
- **Items:** potions (HP tiers), revives, catch orbs (tiers), status heals; optional stat
  boosts.
- **Shop:** in Willowvale Town (and possibly per-region vendors) to spend currency.
- **Healing center:** free full party heal in town; also the respawn point on blackout.
- This closes the resource loop the brief calls for: *catching is limited only by team
  strength and resources.*

## Progression & evolution

- Winning battles → XP → level-ups (see [`creatures.md`](creatures.md)).
- On reaching an evolution level, prompt/animate evolution, swap to the evolved species,
  update stats/typing/learnset.
- No badges or hard story gates required; the world is open. Bosses are optional
  difficulty spikes with rewards.

## Save / load

- **Autosave** on: catch, evolve, boss defeat, region change, shop purchase.
- **Manual save** from the pause menu.
- Persist the full `SaveGame` (player pos/money, party, box, bag, dex, flags) to
  `localStorage`, versioned with a migration path.
- **Export/Import** save as JSON (no cloud), so players can back up or move devices.

## Codex (creature-dex)

- Tracks **seen** (encountered) and **caught** per species, grouped by type/region.
- Shows stats, types, and evolution line for caught creatures; silhouettes for unseen.
- Completion % as a soft long-term goal.

## Testing hooks (pure systems)

All of these are deterministic given a seeded PRNG and are unit-tested:
- damage & type effectiveness (`battle.ts`, `typeChart.ts`)
- catch rate & shake checks (`catch.ts`)
- XP/level growth & stat derivation (`leveling.ts`)
- evolution triggers (`evolution.ts`)
- weighted spawn selection & encounter rolls (`encounters.ts`)
