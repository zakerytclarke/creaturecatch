import { Region } from '../data/regions';
import { RNG, gameRng } from './rng';

export function rollEncounter(rate: number, rng: RNG = gameRng): boolean {
  return rng.next() < rate;
}

export interface Spawn {
  speciesId: string;
  level: number;
}

export function pickSpawn(region: Region, rng: RNG = gameRng): Spawn | null {
  const table = region.spawnTable;
  if (table.length === 0) return null;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = rng.float(0, total);
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      return {
        speciesId: entry.speciesId,
        level: rng.int(entry.minLevel, entry.maxLevel),
      };
    }
  }
  const last = table[table.length - 1];
  return { speciesId: last.speciesId, level: rng.int(last.minLevel, last.maxLevel) };
}
