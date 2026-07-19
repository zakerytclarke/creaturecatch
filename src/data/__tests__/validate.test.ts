import { describe, it, expect } from 'vitest';
import { SPECIES, SPECIES_LIST, baseSpeciesByType } from '../creatures';
import { MOVES } from '../moves';
import { REGIONS } from '../regions';
import { ELEMENT_TYPES } from '../types';

describe('roster integrity', () => {
  it('has 10 base species per type (50 base total)', () => {
    for (const type of ELEMENT_TYPES) {
      expect(baseSpeciesByType(type).length).toBe(10);
    }
    expect(SPECIES_LIST.filter((s) => s.stage === 0).length).toBe(50);
  });

  it('every evolution target exists', () => {
    for (const sp of SPECIES_LIST) {
      if (sp.evolvesTo) {
        expect(SPECIES[sp.evolvesTo.speciesId]).toBeDefined();
      }
    }
  });

  it('every learnset move exists', () => {
    for (const sp of SPECIES_LIST) {
      for (const l of sp.learnset) {
        expect(MOVES[l.moveId]).toBeDefined();
      }
    }
  });

  it('every region spawn + boss references a real species', () => {
    for (const region of Object.values(REGIONS)) {
      region.spawnTable.forEach((e) => expect(SPECIES[e.speciesId]).toBeDefined());
      region.boss?.team.forEach((m) => expect(SPECIES[m.speciesId]).toBeDefined());
    }
  });

  it('assigns unique, contiguous dex numbers', () => {
    const nums = SPECIES_LIST.map((s) => s.dexNumber).sort((a, b) => a - b);
    nums.forEach((n, i) => expect(n).toBe(i + 1));
  });
});
