import { getRegion } from '../data/regions';
import { Biome } from '../data/regions';
import { RNG } from '../systems/rng';

export const T = {
  GROUND: 0,
  TALL: 1,
  BLOCK: 2,
  WATER: 3,
  WARP: 4,
  HEAL: 5,
  SHOP: 6,
  FLOWER: 7,
  PATH: 8,
} as const;

export type TileCode = (typeof T)[keyof typeof T];

export const WALKABLE = new Set<number>([T.GROUND, T.TALL, T.WARP, T.FLOWER, T.PATH]);

/** Large seamless overworld (tiles). ~192×144 ≈ 27k tiles. */
export const WORLD_W = 192;
export const WORLD_H = 144;
export const WORLD_SEED = 0xccea7c11;

export interface WarpPoint {
  x: number;
  y: number;
  target: string;
  label?: string;
}

export interface MapData {
  /** Always 'world' for the seamless map; per-tile region lives in `regions`. */
  regionId: string;
  width: number;
  height: number;
  tiles: number[][];
  /** Per-tile region id (town/forest/beach/...). Region-locks spawns. */
  regions: string[][];
  warps: WarpPoint[];
  spawnX: number;
  spawnY: number;
  bosses: { regionId: string; x: number; y: number }[];
  heal?: { x: number; y: number };
  shop?: { x: number; y: number };
}

interface RegionCenter {
  id: string;
  biome: Biome;
  x: number;
  y: number;
  weight: number;
}

function emptyNum(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

function emptyStr(w: number, h: number, fill: string): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

/** Value noise in [0,1) — deterministic, cheap, good enough for biomes/props. */
function valueNoise2D(x: number, y: number, seed: number): number {
  // Keep everything in int32 space — large seed*constant products lose precision in JS floats.
  let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  return ((n >>> 0) % 10000) / 10000;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    // Sample in tile space with frequency scaling (not pre-scaled floats).
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function carveLine(
  tiles: number[][],
  regions: string[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  code: number,
) {
  let x = x0;
  let y = y0;
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  // Manhattan corridor with 1-tile width + soft edges
  while (x !== x1 || y !== y1) {
    if (x >= 0 && y >= 0 && x < tiles[0].length && y < tiles.length) {
      tiles[y][x] = code;
      if (y > 0 && tiles[y - 1][x] !== T.HEAL && tiles[y - 1][x] !== T.SHOP) {
        if (tiles[y - 1][x] === T.BLOCK || tiles[y - 1][x] === T.WATER) tiles[y - 1][x] = T.GROUND;
      }
    }
    if (x !== x1 && (y === y1 || Math.abs(x1 - x) >= Math.abs(y1 - y))) x += dx;
    else if (y !== y1) y += dy;
  }
  if (x1 >= 0 && y1 >= 0 && x1 < tiles[0].length && y1 < tiles.length) tiles[y1][x1] = code;
  void regions;
}

function regionCenters(w: number, h: number): RegionCenter[] {
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  return [
    { id: 'town', biome: 'town', x: cx, y: cy, weight: 1.15 },
    { id: 'forest', biome: 'forest', x: Math.floor(w * 0.18), y: cy, weight: 1 },
    { id: 'beach', biome: 'beach', x: Math.floor(w * 0.82), y: cy, weight: 1 },
    { id: 'desert', biome: 'desert', x: cx, y: Math.floor(h * 0.82), weight: 1 },
    { id: 'highlands', biome: 'highlands', x: cx, y: Math.floor(h * 0.16), weight: 1 },
    { id: 'cave', biome: 'cave', x: Math.floor(w * 0.78), y: Math.floor(h * 0.78), weight: 0.92 },
  ];
}

function pickRegionAt(x: number, y: number, centers: RegionCenter[], seed: number): RegionCenter {
  // Warped Voronoi: jitter query point with low-frequency noise so borders feel organic.
  const jx = x + (fbm(x * 0.08, y * 0.08, seed) - 0.5) * 28;
  const jy = y + (fbm(x * 0.08, y * 0.08, seed + 3) - 0.5) * 28;
  let best = centers[0];
  let bestD = Infinity;
  for (const c of centers) {
    const dx = jx - c.x;
    const dy = jy - c.y;
    const d = (dx * dx + dy * dy) / (c.weight * c.weight);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Build one huge interconnected overworld. Biomes are contiguous regions;
 * you walk between them with no warp gates (except optional signposts).
 */
export function generateWorld(seed = WORLD_SEED): MapData {
  const w = WORLD_W;
  const h = WORLD_H;
  const rng = new RNG(seed);
  const centers = regionCenters(w, h);
  const tiles = emptyNum(w, h, T.GROUND);
  const regions = emptyStr(w, h, 'town');

  // --- Assign biomes ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = pickRegionAt(x, y, centers, seed);
      regions[y][x] = c.id;
    }
  }

  // --- Terrain features per tile ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const rid = regions[y][x];
      const biome = getRegion(rid).biome;
      const elev = fbm(x * 0.06, y * 0.06, seed + 11);
      const moist = fbm(x * 0.07, y * 0.07, seed + 29);
      const clutter = fbm(x * 0.18, y * 0.18, seed + 47);
      const grassN = fbm(x * 0.14, y * 0.14, seed + 61);

      // World border cliffs
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tiles[y][x] = T.BLOCK;
        continue;
      }

      // Water: beach shoreline + moist lowlands in beach; cave pools
      if (biome === 'beach' && (moist > 0.55 || elev < 0.38)) {
        tiles[y][x] = T.WATER;
        continue;
      }
      if (biome === 'cave' && moist > 0.7 && elev < 0.45) {
        tiles[y][x] = T.WATER;
        continue;
      }

      // Trees / rocks
      const treeThresh =
        biome === 'forest' ? 0.62 : biome === 'highlands' ? 0.68 : biome === 'town' ? 0.86 : biome === 'desert' ? 0.8 : biome === 'cave' ? 0.75 : 0.78;
      if (clutter > treeThresh && elev > 0.3) {
        tiles[y][x] = T.BLOCK;
        continue;
      }

      // Tall grass (wild only) — region-locked encounter substrate
      const grassThresh = biome === 'forest' ? 0.42 : biome === 'desert' ? 0.5 : 0.46;
      if (biome !== 'town' && grassN > grassThresh && clutter < treeThresh - 0.02) {
        tiles[y][x] = T.TALL;
        continue;
      }

      // Flowers
      if (biome !== 'cave' && clutter > 0.82 && grassN < 0.45) {
        tiles[y][x] = T.FLOWER;
        continue;
      }

      tiles[y][x] = T.GROUND;
    }
  }

  // --- Town plaza ---
  const town = centers.find((c) => c.id === 'town')!;
  const plazaR = 8;
  for (let y = town.y - plazaR; y <= town.y + plazaR; y++) {
    for (let x = town.x - plazaR; x <= town.x + plazaR; x++) {
      if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;
      regions[y][x] = 'town';
      const dx = Math.abs(x - town.x);
      const dy = Math.abs(y - town.y);
      if (dx <= 1 || dy <= 1) tiles[y][x] = T.PATH;
      else if (dx <= plazaR && dy <= plazaR) tiles[y][x] = T.GROUND;
    }
  }

  // Decorative town trees just outside the plaza ring
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const tx = Math.round(town.x + Math.cos(a) * (plazaR + 2));
    const ty = Math.round(town.y + Math.sin(a) * (plazaR + 2));
    if (tx > 1 && ty > 1 && tx < w - 2 && ty < h - 2) {
      tiles[ty][tx] = T.BLOCK;
      regions[ty][tx] = 'town';
    }
  }

  const heal = { x: town.x - 4, y: town.y - 3 };
  const shop = { x: town.x + 4, y: town.y - 3 };
  tiles[heal.y][heal.x] = T.HEAL;
  tiles[shop.y][shop.x] = T.SHOP;
  regions[heal.y][heal.x] = 'town';
  regions[shop.y][shop.x] = 'town';

  // --- Roads from town to each wild region center ---
  for (const c of centers) {
    if (c.id === 'town') continue;
    carveLine(tiles, regions, town.x, town.y, c.x, c.y, T.PATH);
  }

  // --- Boss landmarks near each wild region center (clear a pad) ---
  const bosses: { regionId: string; x: number; y: number }[] = [];
  for (const c of centers) {
    if (c.id === 'town') continue;
    const region = getRegion(c.id);
    if (!region.boss) continue;
    let bx = c.x;
    let by = c.y;
    // Find nearby clearable ground
    for (let attempt = 0; attempt < 40; attempt++) {
      const ox = rng.int(-3, 3);
      const oy = rng.int(-3, 3);
      const x = c.x + ox;
      const y = c.y + oy;
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
      if (regions[y][x] !== c.id) continue;
      bx = x;
      by = y;
      break;
    }
    for (let yy = by - 1; yy <= by + 1; yy++) {
      for (let xx = bx - 1; xx <= bx + 1; xx++) {
        tiles[yy][xx] = T.GROUND;
        regions[yy][xx] = c.id;
      }
    }
    bosses.push({ regionId: c.id, x: bx, y: by });
  }

  // Ensure heal/shop adjacency is walkable
  for (const p of [heal, shop]) {
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (tiles[y][x] === T.BLOCK || tiles[y][x] === T.WATER) tiles[y][x] = T.PATH;
    }
  }

  return {
    regionId: 'world',
    width: w,
    height: h,
    tiles,
    regions,
    warps: [],
    spawnX: town.x,
    spawnY: town.y,
    bosses,
    heal,
    shop,
  };
}

/** @deprecated small per-region maps — kept for API compat; always returns the world. */
export function generateMap(_regionId?: string): MapData {
  return generateWorld();
}

export function biomeAt(map: MapData, x: number, y: number): Biome {
  const rid = map.regions[y]?.[x] ?? 'town';
  return getRegion(rid).biome;
}

export function regionIdAt(map: MapData, x: number, y: number): string {
  return map.regions[y]?.[x] ?? 'town';
}

/** Distance from Willowvale plaza — used to scale wild levels. */
export function distFromTown(map: MapData, x: number, y: number): number {
  return Math.hypot(x - map.spawnX, y - map.spawnY);
}
