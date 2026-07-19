import { describe, it, expect } from 'vitest';
import { computeDamage } from '../battle';
import { RNG } from '../rng';
import { createInstance } from '../../entities/CreatureInstance';
import { getMove } from '../../data/moves';

describe('battle damage', () => {
  it('deals more damage when super effective than when not very effective', () => {
    const fireAttacker = createInstance('embernewt', 25, new RNG(1));
    const earthTarget = createInstance('pebblemole', 25, new RNG(2)); // fire > earth (2x)
    const waterTarget = createInstance('bubblotter', 25, new RNG(2)); // fire < water (0.5x)
    const move = getMove('fire_2');

    const superEff = computeDamage(fireAttacker, earthTarget, move, new RNG(99));
    const notVeryEff = computeDamage(fireAttacker, waterTarget, move, new RNG(99));

    expect(superEff.effectiveness).toBe(2);
    expect(notVeryEff.effectiveness).toBe(0.5);
    expect(superEff.damage).toBeGreaterThan(notVeryEff.damage);
  });

  it('status moves deal no damage', () => {
    const a = createInstance('embernewt', 10, new RNG(1));
    const b = createInstance('bubblotter', 10, new RNG(2));
    expect(computeDamage(a, b, getMove('fire_status'), new RNG(1)).damage).toBe(0);
  });

  it('applies STAB', () => {
    const fire = createInstance('embernewt', 20, new RNG(5));
    const target = createInstance('sprouturtle', 20, new RNG(6));
    const res = computeDamage(fire, target, getMove('fire_1'), new RNG(7));
    expect(res.stab).toBe(true);
  });
});
