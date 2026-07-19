import { getRegion } from '../data/regions';
import { RNG, hashString } from '../systems/rng';

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

// HEAL and SHOP are buildings: solid, interacted with from an adjacent tile.
export const WALKABLE = new Set<number>([T.GROUND, T.TALL, T.WARP, T.FLOWER, T.PATH]);

export interface WarpPoint {
  x: number;
  y: number;
  target: string;
  label?: string;
}

export interface MapData {
  regionId: string;
  width: number;
  height: number;
  tiles: number[][];
  warps: WarpPoint[];
  spawnX: number;
  spawnY: number;
  boss?: { x: number; y: number };
  heal?: { x: number; y: number };
  shop?: { x: number; y: number };
}

function empty(width: number, height: number, fill: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function border(tiles: number[][], width: number, height: number, code: number) {
  for (let x = 0; x < width; x++) {
    tiles[0][x] = code;
    tiles[height - 1][x] = code;
  }
  for (let y = 0; y < height; y++) {
    tiles[y][0] = code;
    tiles[y][width - 1] = code;
  }
}

function generateTown(): MapData {
  const width = 20;
  const height = 15;
  const tiles = empty(width, height, T.GROUND);
  border(tiles, width, height, T.BLOCK);

  // central plaza path
  for (let x = 3; x < width - 3; x++) tiles[Math.floor(height / 2)][x] = T.PATH;
  for (let y = 3; y < height - 3; y++) tiles[y][Math.floor(width / 2)] = T.PATH;

  // buildings
  const heal = { x: 5, y: 4 };
  const shop = { x: 14, y: 4 };
  tiles[heal.y][heal.x] = T.HEAL;
  tiles[shop.y][shop.x] = T.SHOP;

  // decorative flowers
  tiles[10][6] = T.FLOWER;
  tiles[10][13] = T.FLOWER;
  tiles[4][10] = T.FLOWER;

  // Region warps around the town edges.
  const warps: WarpPoint[] = [
    { x: 2, y: 7, target: 'forest', label: 'Verdant Forest' },
    { x: width - 3, y: 7, target: 'beach', label: 'Sunhaven Beach' },
    { x: Math.floor(width / 2), y: 2, target: 'highlands', label: 'Skyreach Highlands' },
    { x: 6, y: height - 3, target: 'desert', label: 'Emberscar Desert' },
    { x: width - 6, y: height - 3, target: 'cave', label: 'Gloomhollow Cave' },
  ];
  warps.forEach((w) => (tiles[w.y][w.x] = T.WARP));

  return {
    regionId: 'town',
    width,
    height,
    tiles,
    warps,
    spawnX: Math.floor(width / 2),
    spawnY: Math.floor(height / 2),
    heal,
    shop,
  };
}

function generateWild(regionId: string): MapData {
  const region = getRegion(regionId);
  const rng = new RNG(hashString(regionId));
  const width = 22;
  const height = 17;
  const tiles = empty(width, height, T.GROUND);
  border(tiles, width, height, T.BLOCK);

  const useWater = region.biome === 'beach';

  // scatter obstacles
  const obstacleCount = 22;
  for (let i = 0; i < obstacleCount; i++) {
    const x = rng.int(2, width - 3);
    const y = rng.int(2, height - 3);
    tiles[y][x] = useWater && rng.chance(0.5) ? T.WATER : T.BLOCK;
  }

  // grass clusters
  const clusters = 7;
  for (let c = 0; c < clusters; c++) {
    const cx = rng.int(3, width - 4);
    const cy = rng.int(3, height - 4);
    const w = rng.int(2, 4);
    const h = rng.int(2, 3);
    for (let y = cy; y < Math.min(height - 1, cy + h); y++) {
      for (let x = cx; x < Math.min(width - 1, cx + w); x++) {
        if (tiles[y][x] === T.GROUND) tiles[y][x] = T.TALL;
      }
    }
  }

  // flowers
  for (let i = 0; i < 6; i++) {
    const x = rng.int(2, width - 3);
    const y = rng.int(2, height - 3);
    if (tiles[y][x] === T.GROUND) tiles[y][x] = T.FLOWER;
  }

  // Warp back to town near the bottom center; clear a landing area.
  const warpX = Math.floor(width / 2);
  const warpY = height - 2;
  for (let y = warpY - 1; y <= warpY; y++) {
    for (let x = warpX - 1; x <= warpX + 1; x++) tiles[y][x] = T.GROUND;
  }
  tiles[warpY][warpX] = T.WARP;
  const spawnX = warpX;
  const spawnY = warpY - 1;

  // Boss placed in the upper area on clear ground.
  let boss: { x: number; y: number } | undefined;
  if (region.boss) {
    let bx = Math.floor(width / 2);
    let by = 2;
    for (let attempt = 0; attempt < 40 && tiles[by][bx] !== T.GROUND; attempt++) {
      bx = rng.int(2, width - 3);
      by = rng.int(2, 4);
    }
    tiles[by][bx] = T.GROUND;
    boss = { x: bx, y: by };
  }

  return {
    regionId,
    width,
    height,
    tiles,
    warps: [{ x: warpX, y: warpY, target: 'town', label: 'Willowvale Town' }],
    spawnX,
    spawnY,
    boss,
  };
}

export function generateMap(regionId: string): MapData {
  return regionId === 'town' ? generateTown() : generateWild(regionId);
}
