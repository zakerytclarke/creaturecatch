# Type System & Battle Math

Five elemental types drive the combat triangle: **Fire, Earth, Water, Air, Darkness**.

## Design goal

A perfectly **balanced pentagon**: every type is super-effective against exactly **2** other
types and weak against exactly **2** — no type is strictly better than another. This keeps team
building meaningful without a dominant pick.

## Effectiveness cycle

Order the types in a cycle; each type is **super effective (×2)** against the **next two** types
in the cycle, and **not very effective (×0.5)** against the two that precede it. Same matchup or
neutral pairs are **×1**.

```
Fire → Earth → Air → Water → Darkness → (back to Fire)
```

- **Fire** beats Earth, Air
- **Earth** beats Air, Water
- **Air** beats Water, Darkness
- **Water** beats Darkness, Fire
- **Darkness** beats Fire, Earth

### Effectiveness matrix

Rows = attacking type, Columns = defending type. `2` = super effective, `½` = not very
effective, `1` = neutral.

| ATK ↓ / DEF → | Fire | Earth | Air | Water | Darkness |
|---------------|:----:|:-----:|:---:|:-----:|:--------:|
| **Fire**      |  1   |  2    |  2  |  ½    |  ½       |
| **Earth**     |  ½   |  1    |  2  |  2    |  ½       |
| **Air**       |  ½   |  ½    |  1  |  2    |  2       |
| **Water**     |  2   |  ½    |  ½  |  1    |  2       |
| **Darkness**  |  2   |  2    |  ½  |  ½    |  1       |

Sanity check: each row has exactly two `2`s and two `½`s; each column also has exactly two `2`s
and two `½`s. Balanced. ✔

### Flavor justification (tunable)

- Fire scorches **Earth** and ignites/consumes **Air**.
- Earth grounds **Air** and dams/absorbs **Water**.
- Air evaporates **Water** and scatters **Darkness** with light and wind.
- Water douses **Fire** and cleanses **Darkness**.
- Darkness smothers **Fire**'s light and rots **Earth**.

## Dual types

A creature may have 1 or 2 types. When attacked, multipliers **multiply** across both defending
types (e.g., a Fire move on an Earth/Air creature = ×2 × ×2 = ×4). We keep this uncapped for
punchy matchups but can clamp to ×4 / ÷4 if balance requires.

## STAB (Same-Type Attack Bonus)

If a creature uses a move whose type matches one of its own types, damage ×**1.5**.

## Damage formula

Simplified from the classic Pokémon formula (single Attack/Defense stat):

```
base = floor( floor( (2 * level / 5 + 2) * power * (attack / defense) ) / 50 ) + 2
damage = floor( base * STAB * effectiveness * random(0.85..1.00) )
```

- `STAB` = 1.5 if move type ∈ attacker types, else 1.0
- `effectiveness` = product of type multipliers vs the defender's type(s)
- `random` = uniform in [0.85, 1.00] (from seedable PRNG for testability)
- Status moves (`power = 0`) skip damage and apply their effect instead.

## Accuracy

A move hits if `random(0..100) < move.accuracy`. Misses deal no damage. (Status/evasion
modifiers are a later addition.)

## Turn order

Higher **Speed** acts first. Ties broken by PRNG. (Priority moves are a later addition.)

## Reference implementation targets (`src/systems/`)

- `typeChart.ts` — `effectiveness(attacking: ElementType, defending: ElementType[]): number`
- `battle.ts` — `computeDamage(attacker, defender, move, rng): number` + turn resolution
- All covered by Vitest unit tests (every cell of the matrix, STAB, dual-type stacking,
  min-damage floor).
