export type ElementType = 'fire' | 'earth' | 'air' | 'water' | 'darkness';

export const ELEMENT_TYPES: ElementType[] = ['fire', 'earth', 'air', 'water', 'darkness'];

export const TYPE_META: Record<
  ElementType,
  { name: string; color: number; cssColor: string }
> = {
    fire: { name: 'Fire', color: 0xff8a65, cssColor: '#ff8a65' },
  earth: { name: 'Earth', color: 0xa1887f, cssColor: '#a1887f' },
  air: { name: 'Air', color: 0x90caf9, cssColor: '#64b5f6' },
  water: { name: 'Water', color: 0x4fc3f7, cssColor: '#29b6f6' },
  darkness: { name: 'Darkness', color: 0x9575cd, cssColor: '#9575cd' },
};

// Balanced pentagon: each attacking type is super effective (2x) against the next two
// types in the cycle, and not very effective (0.5x) against the two that precede it.
// Cycle: fire -> earth -> air -> water -> darkness -> fire
// See docs/design/type-system.md.
export const EFFECTIVENESS: Record<ElementType, Record<ElementType, number>> = {
  fire: { fire: 1, earth: 2, air: 2, water: 0.5, darkness: 0.5 },
  earth: { fire: 0.5, earth: 1, air: 2, water: 2, darkness: 0.5 },
  air: { fire: 0.5, earth: 0.5, air: 1, water: 2, darkness: 2 },
  water: { fire: 2, earth: 0.5, air: 0.5, water: 1, darkness: 2 },
  darkness: { fire: 2, earth: 2, air: 0.5, water: 0.5, darkness: 1 },
};
