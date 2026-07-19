import { ElementType, ELEMENT_TYPES } from './types';
import { hashString } from '../systems/rng';

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Species {
  id: string;
  name: string;
  types: ElementType[];
  baseStats: BaseStats;
  catchRate: number; // 1..255, higher = easier
  baseXpYield: number;
  growthRate: 'fast' | 'mediumFast' | 'slow';
  learnset: { level: number; moveId: string }[];
  evolvesTo?: { speciesId: string; atLevel: number };
  dexNumber: number;
  stage: number; // 0 base, 1 first evo, 2 second evo
  lineId: string;
}

// The 50 evolution lines (10 per type). Each inner array is base -> evo1 -> [evo2].
// Mirrors docs/design/creatures.md.
const LINES: Record<ElementType, string[][]> = {
  fire: [
    ['Embernewt', 'Cindersal', 'Infernewt'],
    ['Blazepup', 'Scorchound'],
    ['Sparkit', 'Flarefox', 'Pyrovix'],
    ['Magmaboar', 'Moltentusk'],
    ['Ashfawn', 'Charstag'],
    ['Coalcub', 'Emberbruin', 'Magmursa'],
    ['Kindlemoth', 'Pyrelune'],
    ['Searam', 'Solarhorn'],
    ['Charcolt', 'Blazemare', 'Inferneigh'],
    ['Igndrake', 'Volcanwyrm'],
  ],
  earth: [
    ['Pebblemole', 'Boulderdig', 'Terraquake'],
    ['Mosskit', 'Loamlynx'],
    ['Sprouturtle', 'Barkshell', 'Grovtoise'],
    ['Clayworm', 'Quartzerp'],
    ['Ironbeetle', 'Granitusk'],
    ['Fernram', 'Thornhorn', 'Craggoat'],
    ['Rootling', 'Timberent'],
    ['Mudpup', 'Terrahound'],
    ['Cragcub', 'Bouldursa', 'Mountursa'],
    ['Geodillo', 'Quartzadillo'],
  ],
  air: [
    ['Breezling', 'Galewing', 'Tempestrix'],
    ['Cloudkit', 'Cumulynx'],
    ['Gustsparrow', 'Zephyrhawk', 'Cyclofalcon'],
    ['Wispmoth', 'Auroramoth'],
    ['Driftbat', 'Galebat'],
    ['Skydragonfly', 'Stormdrake', 'Aerowyrm'],
    ['Featherowl', 'Tempestowl'],
    ['Puffling', 'Nimbowl'],
    ['Zephyrkite', 'Windfalcon'],
    ['Zephyrsprite', 'Auravian'],
  ],
  water: [
    ['Bubblotter', 'Tidalotter', 'Aqualord'],
    ['Splashfrog', 'Marshtoad'],
    ['Coralcrab', 'Reefclaw', 'Brinabyss'],
    ['Drizzlefin', 'Currentfish'],
    ['Pearljelly', 'Tidaljelly'],
    ['Mistseal', 'Frostwalrus'],
    ['Rippleray', 'Tidalray', 'Abyssray'],
    ['Kelpling', 'Kelpserpent', 'Leviakelp'],
    ['Puddlepup', 'Aquahound'],
    ['Brinepenguin', 'Glaciguin'],
  ],
  darkness: [
    ['Shadepup', 'Duskhound', 'Nightreaver'],
    ['Gloomkit', 'Umbracat'],
    ['Murkling', 'Netherfiend', 'Voidlord'],
    ['Ravenling', 'Duskraven'],
    ['Hexspider', 'Wraithweaver'],
    ['Shadowbat', 'Nightwing', 'Eclipsewyrm'],
    ['Shadeimp', 'Phantimp'],
    ['Obsidianewt', 'Voidsalamander'],
    ['Duskwolf', 'Nightfang', 'Umbrafenrir'],
    ['Wispghast', 'Wraithlord'],
  ],
};

// Stat-total per stage and how each type distributes those points (percent, sums to 100).
const STAGE_TOTAL = [300, 415, 520];
const TYPE_WEIGHTS: Record<ElementType, [number, number, number, number]> = {
  // [hp, attack, defense, speed]
  fire: [22, 32, 18, 28],
  earth: [30, 24, 32, 14],
  air: [20, 24, 18, 38],
  water: [26, 24, 26, 24],
  darkness: [22, 34, 20, 24],
};

const CATCH_RATE_BY_STAGE = [190, 90, 45];
const XP_YIELD_BY_STAGE = [64, 142, 220];
const GROWTH: Species['growthRate'][] = ['fast', 'mediumFast', 'slow'];
const EVOLVE_LEVELS = [16, 34]; // base->evo1 at 16, evo1->evo2 at 34

function id(name: string): string {
  return name.toLowerCase();
}

function makeStats(type: ElementType, stage: number, seed: number): BaseStats {
  const total = STAGE_TOTAL[stage];
  const [wh, wa, wd, ws] = TYPE_WEIGHTS[type];
  // Deterministic jitter in [-8%, +8%] per stat so creatures within a type differ.
  const j = (salt: number) => 0.92 + (((seed >> (salt * 3)) & 0xff) / 255) * 0.16;
  const raw = {
    hp: Math.round((total * wh) / 100 * j(0)),
    attack: Math.round((total * wa) / 100 * j(1)),
    defense: Math.round((total * wd) / 100 * j(2)),
    speed: Math.round((total * ws) / 100 * j(3)),
  };
  return {
    hp: Math.max(20, raw.hp),
    attack: Math.max(15, raw.attack),
    defense: Math.max(15, raw.defense),
    speed: Math.max(15, raw.speed),
  };
}

function makeLearnset(type: ElementType): Species['learnset'] {
  return [
    { level: 1, moveId: `${type}_1` },
    { level: 1, moveId: `${type}_status` },
    { level: 12, moveId: `${type}_2` },
    { level: 28, moveId: `${type}_3` },
  ];
}

export const SPECIES: Record<string, Species> = {};
export const SPECIES_LIST: Species[] = [];

let dex = 0;
for (const type of ELEMENT_TYPES) {
  LINES[type].forEach((line, lineIdx) => {
    const lineId = `${type}_${lineIdx}`;
    line.forEach((name, stage) => {
      dex += 1;
      const speciesId = id(name);
      const seed = hashString(speciesId);
      const evolvesTo =
        stage < line.length - 1
          ? { speciesId: id(line[stage + 1]), atLevel: EVOLVE_LEVELS[stage] }
          : undefined;
      const sp: Species = {
        id: speciesId,
        name,
        types: [type],
        baseStats: makeStats(type, stage, seed),
        catchRate: CATCH_RATE_BY_STAGE[stage],
        baseXpYield: XP_YIELD_BY_STAGE[stage],
        growthRate: GROWTH[(lineIdx + stage) % GROWTH.length],
        learnset: makeLearnset(type),
        evolvesTo,
        dexNumber: dex,
        stage,
        lineId,
      };
      SPECIES[speciesId] = sp;
      SPECIES_LIST.push(sp);
    });
  });
}

export function getSpecies(id: string): Species {
  const s = SPECIES[id];
  if (!s) throw new Error(`Unknown species: ${id}`);
  return s;
}

export function speciesByType(type: ElementType): Species[] {
  return SPECIES_LIST.filter((s) => s.types.includes(type));
}

export function baseSpeciesByType(type: ElementType): Species[] {
  return speciesByType(type).filter((s) => s.stage === 0);
}

export const STARTER_IDS = ['embernewt', 'bubblotter', 'sprouturtle'];
