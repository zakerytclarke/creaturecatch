import Phaser from 'phaser';
import { SPECIES_LIST, Species } from '../data/creatures';
import { TYPE_META } from '../data/types';
import { Biome } from '../data/regions';
import { hashString } from '../systems/rng';

export const TILE = 32;

function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const adj = (c: number) =>
    amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt));
  return (adj(r) << 16) | (adj(g) << 8) | adj(b);
}

interface BiomePalette {
  ground: number;
  tall: number;
  block: number;
}

const BIOME_PALETTE: Record<Biome, BiomePalette> = {
  town: { ground: 0x86c56b, tall: 0x5fa25a, block: 0xc79a6a },
  forest: { ground: 0x7cbf6b, tall: 0x4e9a52, block: 0x3f6b3a },
  beach: { ground: 0xf0dfa8, tall: 0xcbb06a, block: 0xd9b57a },
  desert: { ground: 0xe8c07a, tall: 0xc79a4e, block: 0xb07b3e },
  highlands: { ground: 0x8fc98a, tall: 0x5fa06a, block: 0x8a8f9a },
  cave: { ground: 0x565163, tall: 0x6a7d5a, block: 0x3a3547 },
};

function drawGround(g: Phaser.GameObjects.Graphics, color: number) {
  g.fillStyle(color, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(shade(color, -0.06), 1);
  g.fillRect(0, 0, TILE / 2, TILE / 2);
  g.fillRect(TILE / 2, TILE / 2, TILE / 2, TILE / 2);
}

function drawTall(g: Phaser.GameObjects.Graphics, ground: number, tall: number) {
  drawGround(g, ground);
  g.fillStyle(tall, 1);
  for (let i = 0; i < 5; i++) {
    const x = 3 + i * 6;
    g.fillTriangle(x, TILE, x - 3, TILE - 16, x + 3, TILE - 16);
  }
  g.fillStyle(shade(tall, 0.15), 1);
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 6;
    g.fillTriangle(x, TILE, x - 2, TILE - 22, x + 2, TILE - 22);
  }
}

function drawBlock(g: Phaser.GameObjects.Graphics, color: number, biome: Biome) {
  drawGround(g, BIOME_PALETTE[biome].ground);
  if (biome === 'forest' || biome === 'town') {
    // tree
    g.fillStyle(0x6b4a2a, 1).fillRect(TILE / 2 - 3, TILE - 12, 6, 12);
    g.fillStyle(color, 1).fillCircle(TILE / 2, TILE / 2 - 2, 13);
    g.fillStyle(shade(color, 0.15), 1).fillCircle(TILE / 2 - 4, TILE / 2 - 5, 6);
  } else {
    // rock/wall
    g.fillStyle(color, 1).fillRoundedRect(3, 4, TILE - 6, TILE - 6, 6);
    g.fillStyle(shade(color, 0.18), 1).fillRoundedRect(6, 6, TILE - 16, 8, 4);
    g.lineStyle(2, shade(color, -0.3), 1).strokeRoundedRect(3, 4, TILE - 6, TILE - 6, 6);
  }
}

function drawSpecial(
  g: Phaser.GameObjects.Graphics,
  kind: 'water' | 'warp' | 'heal' | 'shop' | 'flower' | 'path',
) {
  switch (kind) {
    case 'water':
      g.fillStyle(0x4fc3f7, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x81d4fa, 1).fillRect(2, 6, TILE - 4, 3);
      g.fillStyle(0x29b6f6, 1).fillRect(4, 18, TILE - 6, 3);
      break;
    case 'path':
      drawGround(g, 0xd8b98a);
      break;
    case 'warp':
      drawGround(g, 0xd8b98a);
      g.fillStyle(0x5c4327, 1).fillRoundedRect(6, 2, TILE - 12, TILE - 4, 4);
      g.fillStyle(0x3a2a18, 1).fillRoundedRect(9, 6, TILE - 18, TILE - 8, 3);
      g.fillStyle(0xffe082, 1).fillCircle(TILE - 12, TILE / 2, 2);
      break;
    case 'heal':
      drawGround(g, 0xf3d1d9);
      g.fillStyle(0xe4576e, 1).fillRoundedRect(4, 4, TILE - 8, TILE - 8, 5);
      g.fillStyle(0xffffff, 1).fillRect(TILE / 2 - 2, 9, 4, TILE - 18);
      g.fillStyle(0xffffff, 1).fillRect(9, TILE / 2 - 2, TILE - 18, 4);
      break;
    case 'shop':
      drawGround(g, 0xcfe3f2);
      g.fillStyle(0x3f7fbf, 1).fillRoundedRect(4, 4, TILE - 8, TILE - 8, 5);
      g.fillStyle(0xffffff, 1).fillRect(8, 10, TILE - 16, 4);
      g.fillStyle(0xffe082, 1).fillCircle(TILE / 2, TILE - 10, 4);
      break;
    case 'flower':
      drawGround(g, 0x86c56b);
      g.fillStyle(0xffe082, 1).fillCircle(10, 10, 3);
      g.fillStyle(0xff8a80, 1).fillCircle(22, 20, 3);
      break;
  }
}

function drawPlayer(g: Phaser.GameObjects.Graphics, dir: 'down' | 'up' | 'left' | 'right') {
  const W = 24;
  const H = 28;
  // body
  g.fillStyle(0x3f6fb5, 1).fillRoundedRect(4, 12, W - 8, H - 12, 5);
  // head
  g.fillStyle(0xf4c8a0, 1).fillCircle(W / 2, 9, 8);
  // hair/cap
  g.fillStyle(0x8b5a2b, 1).fillRoundedRect(W / 2 - 8, 1, 16, 8, 4);
  // eyes depending on direction
  g.fillStyle(0x222222, 1);
  if (dir === 'down') {
    g.fillCircle(W / 2 - 3, 10, 1.6);
    g.fillCircle(W / 2 + 3, 10, 1.6);
  } else if (dir === 'up') {
    // no eyes (back)
  } else if (dir === 'left') {
    g.fillCircle(W / 2 - 4, 10, 1.6);
  } else {
    g.fillCircle(W / 2 + 4, 10, 1.6);
  }
}

// Draw a creature, sized to `size`. Style varies by type, stage and a per-species seed.
export function drawCreature(g: Phaser.GameObjects.Graphics, species: Species, size: number) {
  const type = species.types[0];
  const base = TYPE_META[type].color;
  const seed = hashString(species.id);
  const hueShift = (((seed >> 3) & 0xff) / 255 - 0.5) * 0.4;
  const body = shade(base, hueShift);
  const belly = shade(body, 0.35);
  const dark = shade(body, -0.35);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * (0.26 + species.stage * 0.04);

  // Type-flavored back features (wings/horns) behind body
  g.fillStyle(dark, 1);
  if (type === 'air') {
    g.fillTriangle(cx - r, cy, cx - r - size * 0.22, cy - r, cx - r - size * 0.05, cy + r * 0.6);
    g.fillTriangle(cx + r, cy, cx + r + size * 0.22, cy - r, cx + r + size * 0.05, cy + r * 0.6);
  }
  if (type === 'darkness' || (type === 'earth' && species.stage > 0)) {
    g.fillTriangle(cx - r * 0.6, cy - r, cx - r * 0.3, cy - r - size * 0.2, cx - r * 0.1, cy - r);
    g.fillTriangle(cx + r * 0.6, cy - r, cx + r * 0.3, cy - r - size * 0.2, cx + r * 0.1, cy - r);
  }

  // Body
  g.fillStyle(body, 1).fillCircle(cx, cy, r);
  g.fillStyle(belly, 1).fillCircle(cx, cy + r * 0.35, r * 0.55);

  // legs
  g.fillStyle(dark, 1);
  g.fillRoundedRect(cx - r * 0.7, cy + r * 0.6, r * 0.4, r * 0.5, 3);
  g.fillRoundedRect(cx + r * 0.3, cy + r * 0.6, r * 0.4, r * 0.5, 3);

  // Type-flavored top feature
  g.fillStyle(shade(base, 0.1), 1);
  if (type === 'fire') {
    g.fillTriangle(cx, cy - r - size * 0.18, cx - size * 0.08, cy - r, cx + size * 0.08, cy - r);
    g.fillStyle(0xffd54f, 1).fillTriangle(cx, cy - r - size * 0.1, cx - size * 0.04, cy - r, cx + size * 0.04, cy - r);
  } else if (type === 'water') {
    g.fillTriangle(cx, cy - r - size * 0.14, cx - size * 0.1, cy - r, cx + size * 0.02, cy - r);
  } else if (type === 'earth') {
    g.fillStyle(dark, 1).fillCircle(cx - r * 0.4, cy - r * 0.8, r * 0.18);
    g.fillCircle(cx + r * 0.4, cy - r * 0.8, r * 0.18);
  }

  // Eyes
  const eyeR = Math.max(2, r * 0.18);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - r * 0.35, cy - r * 0.1, eyeR);
  g.fillCircle(cx + r * 0.35, cy - r * 0.1, eyeR);
  g.fillStyle(0x1a1a1a, 1);
  g.fillCircle(cx - r * 0.35, cy - r * 0.1, eyeR * 0.5);
  g.fillCircle(cx + r * 0.35, cy - r * 0.1, eyeR * 0.5);

  // Outline
  g.lineStyle(2, dark, 1).strokeCircle(cx, cy, r);
}

export function generateAllTextures(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const make = (key: string, w: number, h: number, draw: () => void) => {
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  (Object.keys(BIOME_PALETTE) as Biome[]).forEach((biome) => {
    const pal = BIOME_PALETTE[biome];
    make(`ground_${biome}`, TILE, TILE, () => drawGround(g, pal.ground));
    make(`tall_${biome}`, TILE, TILE, () => drawTall(g, pal.ground, pal.tall));
    make(`block_${biome}`, TILE, TILE, () => drawBlock(g, pal.block, biome));
  });

  (['water', 'warp', 'heal', 'shop', 'flower', 'path'] as const).forEach((kind) =>
    make(`sp_${kind}`, TILE, TILE, () => drawSpecial(g, kind)),
  );

  (['down', 'up', 'left', 'right'] as const).forEach((dir) =>
    make(`player_${dir}`, 24, 28, () => drawPlayer(g, dir)),
  );

  const CSIZE = 64;
  SPECIES_LIST.forEach((sp) => {
    make(`creature_${sp.id}`, CSIZE, CSIZE, () => drawCreature(g, sp, CSIZE));
  });

  g.destroy();
}
