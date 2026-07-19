import { BaseStats, getSpecies, Species } from '../data/creatures';
import { getMove, Move } from '../data/moves';
import { RNG, gameRng } from '../systems/rng';
import { levelFromXp, xpForLevel } from '../systems/leveling';

export type StatKey = 'attack' | 'defense' | 'speed';

export interface CreatureInstance {
  speciesId: string;
  level: number;
  xp: number;
  currentHp: number;
  moves: { moveId: string; pp: number }[];
  ivs: BaseStats;
  nickname?: string;
  originalCaughtLevel: number;
}

export function speciesOf(inst: CreatureInstance): Species {
  return getSpecies(inst.speciesId);
}

export function displayName(inst: CreatureInstance): string {
  return inst.nickname ?? speciesOf(inst).name;
}

export function maxHp(inst: CreatureInstance): number {
  const base = speciesOf(inst).baseStats.hp;
  return Math.floor(((2 * base + inst.ivs.hp) * inst.level) / 100) + inst.level + 10;
}

export function getStat(inst: CreatureInstance, key: StatKey): number {
  const base = speciesOf(inst).baseStats[key];
  const iv = inst.ivs[key];
  return Math.floor(((2 * base + iv) * inst.level) / 100) + 5;
}

export function isFainted(inst: CreatureInstance): boolean {
  return inst.currentHp <= 0;
}

export function movesUpToLevel(species: Species, level: number): string[] {
  const learned = species.learnset
    .filter((l) => l.level <= level)
    .map((l) => l.moveId);
  // Keep the most recent 4 unique moves.
  const unique = [...new Set(learned)];
  return unique.slice(-4);
}

export function getMoves(inst: CreatureInstance): Move[] {
  return inst.moves.map((m) => getMove(m.moveId));
}

export function createInstance(
  speciesId: string,
  level: number,
  rng: RNG = gameRng,
): CreatureInstance {
  const species = getSpecies(speciesId);
  const ivs: BaseStats = {
    hp: rng.int(0, 15),
    attack: rng.int(0, 15),
    defense: rng.int(0, 15),
    speed: rng.int(0, 15),
  };
  const inst: CreatureInstance = {
    speciesId,
    level,
    xp: xpForLevel(level, species.growthRate),
    currentHp: 0,
    moves: movesUpToLevel(species, level).map((moveId) => ({
      moveId,
      pp: getMove(moveId).pp,
    })),
    ivs,
    originalCaughtLevel: level,
  };
  inst.currentHp = maxHp(inst);
  return inst;
}

export function healFull(inst: CreatureInstance): void {
  inst.currentHp = maxHp(inst);
  inst.moves.forEach((m) => (m.pp = getMove(m.moveId).pp));
}

export function currentLevelFromXp(inst: CreatureInstance): number {
  return levelFromXp(inst.xp, speciesOf(inst).growthRate);
}
