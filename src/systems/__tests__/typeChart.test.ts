import { describe, it, expect } from 'vitest';
import { effectiveness } from '../typeChart';
import { EFFECTIVENESS, ELEMENT_TYPES } from '../../data/types';

describe('type chart', () => {
  it('applies single-type multipliers', () => {
    expect(effectiveness('fire', ['earth'])).toBe(2);
    expect(effectiveness('fire', ['water'])).toBe(0.5);
    expect(effectiveness('fire', ['fire'])).toBe(1);
  });

  it('stacks dual-type multipliers', () => {
    expect(effectiveness('fire', ['earth', 'air'])).toBe(4);
    expect(effectiveness('fire', ['water', 'darkness'])).toBe(0.25);
  });

  it('is a balanced pentagon (each type has exactly 2 supers and 2 weaks)', () => {
    for (const atk of ELEMENT_TYPES) {
      const row = ELEMENT_TYPES.map((def) => EFFECTIVENESS[atk][def]);
      expect(row.filter((v) => v === 2).length).toBe(2);
      expect(row.filter((v) => v === 0.5).length).toBe(2);
    }
    // Columns should also be balanced.
    for (const def of ELEMENT_TYPES) {
      const col = ELEMENT_TYPES.map((atk) => EFFECTIVENESS[atk][def]);
      expect(col.filter((v) => v === 2).length).toBe(2);
      expect(col.filter((v) => v === 0.5).length).toBe(2);
    }
  });
});
