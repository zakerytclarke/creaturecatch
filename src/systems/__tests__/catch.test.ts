import { describe, it, expect } from 'vitest';
import { attemptCatch } from '../catch';
import { RNG } from '../rng';
import { createInstance } from '../../entities/CreatureInstance';

describe('catch', () => {
  it('guarantees a catch on a weakened, easy-to-catch creature with a strong orb', () => {
    const target = createInstance('embernewt', 3, new RNG(1)); // catchRate 190 (base stage)
    target.currentHp = 1;
    const res = attemptCatch(target, 2.5, new RNG(1));
    expect(res.caught).toBe(true);
  });

  it('is harder to catch a full-HP high-stage creature', () => {
    const target = createInstance('infernewt', 60, new RNG(1)); // catchRate 45 (stage 2)
    let catches = 0;
    for (let i = 0; i < 50; i++) {
      if (attemptCatch(target, 1, new RNG(i + 1)).caught) catches += 1;
    }
    expect(catches).toBeLessThan(25);
  });
});
