import { ElementType } from './types';
import { baseSpeciesByType, speciesByType } from './creatures';

export type Biome = 'town' | 'forest' | 'beach' | 'desert' | 'highlands' | 'cave';

export interface SpawnEntry {
  speciesId: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
}

export interface BossMon {
  speciesId: string;
  level: number;
}

export interface Region {
  id: string;
  name: string;
  biome: Biome;
  primaryTypes: ElementType[];
  encounterRate: number; // per-step probability on grass
  spawnTable: SpawnEntry[];
  connections: string[];
  boss?: {
    id: string;
    name: string;
    team: BossMon[];
    reward: number;
  };
}

// Build a spawn table from the base species of the given types within a level band.
function spawnFromTypes(
  types: ElementType[],
  minLevel: number,
  maxLevel: number,
): SpawnEntry[] {
  const entries: SpawnEntry[] = [];
  types.forEach((type, ti) => {
    baseSpeciesByType(type).forEach((sp, i) => {
      entries.push({
        speciesId: sp.id,
        // Give the region's first type slightly more presence; vary weights by index.
        weight: (ti === 0 ? 10 : 6) - (i % 4),
        minLevel,
        maxLevel,
      });
    });
  });
  return entries;
}

// A themed boss team: strongest available forms of a type near the given level.
function bossTeam(type: ElementType, level: number, size: number): BossMon[] {
  const pool = speciesByType(type).sort((a, b) => b.stage - a.stage || b.dexNumber - a.dexNumber);
  const team: BossMon[] = [];
  for (let i = 0; i < size; i++) {
    const sp = pool[i % pool.length];
    team.push({ speciesId: sp.id, level: level - (size - 1 - i) });
  }
  return team;
}

export const REGIONS: Record<string, Region> = {
  town: {
    id: 'town',
    name: 'Willowvale Town',
    biome: 'town',
    primaryTypes: [],
    encounterRate: 0,
    spawnTable: [],
    connections: ['forest', 'beach', 'desert', 'highlands', 'cave'],
  },
  forest: {
    id: 'forest',
    name: 'Verdant Forest',
    biome: 'forest',
    primaryTypes: ['earth', 'air'],
    encounterRate: 0.12,
    spawnTable: spawnFromTypes(['earth', 'air'], 2, 8),
    connections: ['town'],
    boss: {
      id: 'grove_warden',
      name: 'Grove Warden Ivy',
      team: bossTeam('earth', 11, 3),
      reward: 400,
    },
  },
  beach: {
    id: 'beach',
    name: 'Sunhaven Beach',
    biome: 'beach',
    primaryTypes: ['water'],
    encounterRate: 0.12,
    spawnTable: spawnFromTypes(['water'], 6, 13),
    connections: ['town'],
    boss: {
      id: 'tidecaller',
      name: 'Tidecaller Marina',
      team: bossTeam('water', 17, 3),
      reward: 700,
    },
  },
  desert: {
    id: 'desert',
    name: 'Emberscar Desert',
    biome: 'desert',
    primaryTypes: ['fire'],
    encounterRate: 0.12,
    spawnTable: spawnFromTypes(['fire'], 12, 22),
    connections: ['town'],
    boss: {
      id: 'ashen_marauder',
      name: 'Ashen Marauder Rook',
      team: bossTeam('fire', 25, 4),
      reward: 1100,
    },
  },
  highlands: {
    id: 'highlands',
    name: 'Skyreach Highlands',
    biome: 'highlands',
    primaryTypes: ['air'],
    encounterRate: 0.12,
    spawnTable: spawnFromTypes(['air'], 18, 30),
    connections: ['town'],
    boss: {
      id: 'storm_sovereign',
      name: 'Storm Sovereign Zephyr',
      team: bossTeam('air', 33, 4),
      reward: 1500,
    },
  },
  cave: {
    id: 'cave',
    name: 'Gloomhollow Cave',
    biome: 'cave',
    primaryTypes: ['darkness'],
    encounterRate: 0.14,
    spawnTable: spawnFromTypes(['darkness'], 24, 40),
    connections: ['town'],
    boss: {
      id: 'voidkeeper',
      name: 'Voidkeeper Nyx',
      team: bossTeam('darkness', 43, 5),
      reward: 2500,
    },
  },
};

export function getRegion(id: string): Region {
  const r = REGIONS[id];
  if (!r) throw new Error(`Unknown region: ${id}`);
  return r;
}

export const REGION_ORDER = ['town', 'forest', 'beach', 'desert', 'highlands', 'cave'];
