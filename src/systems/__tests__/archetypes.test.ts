import { describe, it, expect } from 'vitest';
import { SPECIES_LIST } from '../../data/creatures';
import { hashString } from '../rng';
import { pickArchetype, type Archetype } from '../../gfx/creatureParts';

describe('creature archetypes', () => {
  it('covers many distinct body plans across the roster', () => {
    const set = new Set(
      SPECIES_LIST.map((s) => pickArchetype(s.name, hashString(s.id))),
    );
    expect(set.size).toBeGreaterThanOrEqual(18);
    const need: Archetype[] = ['snake', 'ghost', 'spider', 'crab', 'cat', 'dog', 'bird', 'dragon', 'frog', 'lion', 'fish'];
    for (const arch of need) {
      expect(set.has(arch)).toBe(true);
    }
  });

  it('maps iconic species to the expected silhouettes', () => {
    const expectArch = (name: string, arch: Archetype) => {
      const id = name.toLowerCase();
      expect(pickArchetype(name, hashString(id))).toBe(arch);
    };
    expectArch('Kelpserpent', 'snake');
    expectArch('Wispghast', 'ghost');
    expectArch('Hexspider', 'spider');
    expectArch('Coralcrab', 'crab');
    expectArch('Sparkit', 'cat');
    expectArch('Blazepup', 'dog');
    expectArch('Nightreaver', 'lion');
    expectArch('Gustsparrow', 'bird');
    expectArch('Igndrake', 'dragon');
    expectArch('Splashfrog', 'frog');
    expectArch('Flarefox', 'fox');
    expectArch('Magmaboar', 'boar');
    expectArch('Pearljelly', 'jelly');
    expectArch('Driftbat', 'bat');
  });

  it('gives mammals different archetypes so cats ≠ dogs ≠ lions', () => {
    const cat = pickArchetype('Sparkit', hashString('sparkit'));
    const dog = pickArchetype('Blazepup', hashString('blazepup'));
    const lion = pickArchetype('Nightreaver', hashString('nightreaver'));
    expect(cat).toBe('cat');
    expect(dog).toBe('dog');
    expect(lion).toBe('lion');
    expect(new Set([cat, dog, lion]).size).toBe(3);
  });
});
