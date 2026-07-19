import { CreatureInstance, maxHp, speciesOf } from '../entities/CreatureInstance';
import { RNG, gameRng } from './rng';

export interface CatchResult {
  caught: boolean;
  shakes: number; // 0..3 shakes before breaking out, 4 = caught
}

// Classic-style catch formula. ballBonus scales with orb tier.
export function attemptCatch(
  target: CreatureInstance,
  ballBonus: number,
  rng: RNG = gameRng,
): CatchResult {
  const hpMax = maxHp(target);
  const catchRate = speciesOf(target).catchRate;
  const a =
    ((3 * hpMax - 2 * target.currentHp) * catchRate * ballBonus) / (3 * hpMax);

  if (a >= 255) return { caught: true, shakes: 4 };

  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(16711680 / a)))));

  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (rng.int(0, 65535) < b) {
      shakes += 1;
    } else {
      return { caught: false, shakes };
    }
  }
  return { caught: true, shakes: 4 };
}
