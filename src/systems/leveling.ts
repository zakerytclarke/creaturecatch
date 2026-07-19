import { Species } from '../data/creatures';

export const MAX_LEVEL = 100;

// Total XP required to *reach* a given level (level 1 = 0 xp).
export function xpForLevel(level: number, growthRate: Species['growthRate']): number {
  const n = Math.max(1, level);
  const cube = n * n * n;
  switch (growthRate) {
    case 'fast':
      return Math.floor(0.8 * cube);
    case 'slow':
      return Math.floor(1.25 * cube);
    case 'mediumFast':
    default:
      return cube;
  }
}

export function levelFromXp(xp: number, growthRate: Species['growthRate']): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1, growthRate)) {
    level += 1;
  }
  return level;
}

// XP gained for defeating a creature (classic-style scaling).
export function xpGain(defeatedSpecies: Species, defeatedLevel: number): number {
  return Math.max(1, Math.floor((defeatedSpecies.baseXpYield * defeatedLevel) / 7));
}
