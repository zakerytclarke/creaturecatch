import { getRegion, Region } from '../data/regions';
import { RNG, gameRng, hashString } from './rng';
import { MapData, distFromTown, regionIdAt } from '../world/mapgen';

export function rollEncounter(rate: number, rng: RNG = gameRng): boolean {
  return rng.next() < rate;
}

export interface Spawn {
  speciesId: string;
  level: number;
}

/**
 * Region-locked spawn pick from a region's table (weighted).
 * Levels are clamped to the entry's band.
 */
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

/**
 * Algorithmic, region-locked encounter at a world tile.
 * - Species ONLY from the biome/region underfoot (hard lock).
 * - Encounter chance modulated by local spawn-density noise + region base rate.
 * - Level scales with distance from town (still clamped to the species entry band,
 *   with a soft upward bias farther from hub).
 */
export function rollWorldEncounter(
  map: MapData,
  tileX: number,
  tileY: number,
  rng: RNG = gameRng,
): Spawn | null {
  const rid = regionIdAt(map, tileX, tileY);
  const region = getRegion(rid);
  if (region.biome === 'town' || region.spawnTable.length === 0) return null;

  // Local density field — some grass patches are "hotter" than others.
  const density =
    ((hashString(`${tileX},${tileY},${rid}`) >>> 0) % 1000) / 1000;
  const rate = region.encounterRate * (0.65 + density * 0.7);
  if (!rollEncounter(rate, rng)) return null;

  const base = pickSpawn(region, rng);
  if (!base) return null;

  // Distance scaling: farther from town → bias toward higher end of the band.
  const dist = distFromTown(map, tileX, tileY);
  const entry = region.spawnTable.find((e) => e.speciesId === base.speciesId);
  if (!entry) return base;

  const t = Math.min(1, dist / 70);
  const bias = Math.floor((entry.maxLevel - entry.minLevel) * t * 0.85);
  const level = Math.min(
    entry.maxLevel,
    Math.max(entry.minLevel, entry.minLevel + bias + rng.int(0, 2)),
  );

  return { speciesId: base.speciesId, level };
}
