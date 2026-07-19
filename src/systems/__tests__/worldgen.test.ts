import { describe, it, expect } from 'vitest';
import { generateWorld, regionIdAt, T } from '../../world/mapgen';
import { getRegion } from '../../data/regions';
import { rollWorldEncounter, pickSpawn } from '../encounters';
import { RNG } from '../rng';
import { SPECIES } from '../../data/creatures';

describe('large world + region-locked spawns', () => {
  const world = generateWorld();

  it('builds a large interconnected map', () => {
    expect(world.width).toBeGreaterThanOrEqual(160);
    expect(world.height).toBeGreaterThanOrEqual(120);
    expect(world.regions.length).toBe(world.height);
    expect(world.tiles.length).toBe(world.height);
  });

  it('has all biomes present', () => {
    const seen = new Set<string>();
    for (let y = 0; y < world.height; y += 4) {
      for (let x = 0; x < world.width; x += 4) {
        seen.add(regionIdAt(world, x, y));
      }
    }
    for (const id of ['town', 'forest', 'beach', 'desert', 'highlands', 'cave']) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it('keeps town plaza walkable with heal + shop', () => {
    expect(world.heal).toBeDefined();
    expect(world.shop).toBeDefined();
    expect(world.tiles[world.spawnY][world.spawnX]).not.toBe(T.BLOCK);
    expect(world.tiles[world.heal!.y][world.heal!.x]).toBe(T.HEAL);
    expect(world.tiles[world.shop!.y][world.shop!.x]).toBe(T.SHOP);
  });

  it('only spawns region-locked species', () => {
    // Probe several forest tiles until we get a spawn.
    let hits = 0;
    for (let y = 0; y < world.height && hits < 5; y++) {
      for (let x = 0; x < world.width && hits < 5; x++) {
        if (regionIdAt(world, x, y) !== 'forest') continue;
        if (world.tiles[y][x] !== T.TALL) continue;
        // Force many rolls with different seeds
        for (let s = 0; s < 40 && hits < 5; s++) {
          const spawn = rollWorldEncounter(world, x, y, new RNG(s + x * 17 + y));
          if (!spawn) continue;
          const region = getRegion('forest');
          const allowed = new Set(region.spawnTable.map((e) => e.speciesId));
          expect(allowed.has(spawn.speciesId)).toBe(true);
          expect(SPECIES[spawn.speciesId].types[0]).toMatch(/earth|air/);
          hits += 1;
        }
      }
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('pickSpawn never leaves its table', () => {
    const beach = getRegion('beach');
    for (let i = 0; i < 50; i++) {
      const s = pickSpawn(beach, new RNG(i));
      expect(s).not.toBeNull();
      expect(beach.spawnTable.some((e) => e.speciesId === s!.speciesId)).toBe(true);
    }
  });
});
