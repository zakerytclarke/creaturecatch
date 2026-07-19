import Phaser from 'phaser';
import { SPECIES_LIST, Species } from '../data/creatures';
import { ElementType } from '../data/types';
import { Biome } from '../data/regions';
import { hashString } from '../systems/rng';

export const TILE = 32;
export const CREATURE_SIZE = 96;

/** Soft Animal-Crossing × Pokémon-Go type paints. */
export const TYPE_PAINT: Record<ElementType, { body: number; accent: number; belly: number }> = {
  fire: { body: 0xff8a65, accent: 0xffd54f, belly: 0xffe0b2 },
  earth: { body: 0xa1887f, accent: 0x81c784, belly: 0xd7ccc8 },
  air: { body: 0x90caf9, accent: 0xe1f5fe, belly: 0xf5fbff },
  water: { body: 0x4fc3f7, accent: 0xb2ebf2, belly: 0xe0f7fa },
  darkness: { body: 0x9575cd, accent: 0xce93d8, belly: 0xe1bee7 },
};

export function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const adj = (c: number) =>
    amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt));
  return (adj(r) << 16) | (adj(g) << 8) | adj(b);
}

interface BiomePalette {
  ground: number;
  groundAlt: number;
  tall: number;
  tallTip: number;
  block: number;
}

const BIOME_PALETTE: Record<Biome, BiomePalette> = {
  town: { ground: 0x8fd67a, groundAlt: 0x7fc86c, tall: 0x5cb85a, tallTip: 0x9ae07a, block: 0x6bb86a },
  forest: { ground: 0x6fbf6a, groundAlt: 0x5eae5c, tall: 0x3f9a4a, tallTip: 0x7ed47a, block: 0x4a8f4a },
  beach: { ground: 0xf3e2b0, groundAlt: 0xe8d39a, tall: 0xc9b06a, tallTip: 0xe8d48a, block: 0xd4b87a },
  desert: { ground: 0xedc98a, groundAlt: 0xe0b872, tall: 0xc9a04e, tallTip: 0xe8c878, block: 0xc49a5a },
  highlands: { ground: 0x8dca88, groundAlt: 0x7aba76, tall: 0x5aa86a, tallTip: 0x9ae09a, block: 0x9aa0b0 },
  cave: { ground: 0x5a5568, groundAlt: 0x4a4558, tall: 0x6a7d5a, tallTip: 0x8aaa70, block: 0x3e384c },
};

function softShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  g.fillStyle(0x2a3a2a, 0.18);
  g.fillEllipse(x, y, w, h);
}

function drawGround(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  g.fillStyle(pal.ground, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(pal.groundAlt, 0.55);
  g.fillCircle(8, 8, 3);
  g.fillCircle(22, 20, 2.5);
  g.fillCircle(14, 26, 2);
  g.fillStyle(shade(pal.ground, 0.12), 0.35);
  g.fillCircle(26, 6, 2);
  g.fillCircle(6, 22, 1.8);
}

function drawTall(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  drawGround(g, biome);
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 5;
    const h = 14 + (i % 3) * 3;
    g.fillStyle(pal.tall, 0.95);
    g.fillTriangle(x, TILE - 1, x - 3.5, TILE - h, x + 3.5, TILE - h);
    g.fillStyle(pal.tallTip, 0.9);
    g.fillTriangle(x, TILE - h + 4, x - 2, TILE - h - 6, x + 2, TILE - h - 6);
  }
  g.fillStyle(0xffffff, 0.12);
  g.fillEllipse(TILE / 2, TILE - 18, 22, 8);
}

function drawBlock(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  drawGround(g, biome);
  softShadow(g, TILE / 2, TILE - 4, 22, 6);

  if (biome === 'forest' || biome === 'town' || biome === 'highlands') {
    g.fillStyle(0x8b6a45, 1).fillRoundedRect(TILE / 2 - 3, TILE - 14, 6, 12, 2);
    g.fillStyle(pal.block, 1).fillCircle(TILE / 2, 13, 11);
    g.fillStyle(shade(pal.block, 0.18), 1).fillCircle(TILE / 2 - 3, 10, 7);
    g.fillStyle(shade(pal.block, 0.35), 0.7).fillCircle(TILE / 2 - 5, 8, 3.5);
    g.fillStyle(shade(pal.block, -0.25), 0.35).fillCircle(TILE / 2 + 4, 16, 5);
  } else if (biome === 'beach') {
    g.fillStyle(0xb8895a, 1).fillRoundedRect(TILE / 2 - 2, 14, 4, 14, 2);
    g.fillStyle(0x66bb6a, 1).fillEllipse(TILE / 2, 12, 22, 12);
    g.fillStyle(0x81c784, 1).fillEllipse(TILE / 2 - 2, 10, 10, 6);
  } else if (biome === 'desert') {
    g.fillStyle(pal.block, 1).fillRoundedRect(4, 8, TILE - 8, TILE - 12, 8);
    g.fillStyle(shade(pal.block, 0.2), 1).fillRoundedRect(7, 10, TILE - 16, 8, 5);
    g.fillStyle(shade(pal.block, -0.2), 0.4).fillRoundedRect(6, 20, TILE - 12, 6, 3);
  } else {
    g.fillStyle(pal.block, 1).fillRoundedRect(3, 5, TILE - 6, TILE - 8, 7);
    g.fillStyle(shade(pal.block, 0.22), 1).fillCircle(11, 12, 5);
    g.fillStyle(shade(pal.block, -0.2), 0.5).fillRoundedRect(8, 20, 16, 6, 3);
  }
}

function drawSpecial(
  g: Phaser.GameObjects.Graphics,
  kind: 'water' | 'warp' | 'heal' | 'shop' | 'flower' | 'path',
) {
  switch (kind) {
    case 'water':
      g.fillStyle(0x4ec4f0, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x7ad7f5, 0.8).fillEllipse(10, 10, 14, 6);
      g.fillStyle(0x2eb3e6, 0.7).fillEllipse(22, 22, 16, 5);
      g.fillStyle(0xffffff, 0.35).fillEllipse(18, 8, 8, 3);
      break;
    case 'path':
      g.fillStyle(0xe8c99a, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0xd9b888, 0.7).fillCircle(8, 12, 2);
      g.fillStyle(0xf0d8b0, 0.6).fillCircle(22, 20, 2.5);
      g.fillStyle(0xc9a878, 0.35).fillRect(0, 0, 2, TILE);
      g.fillStyle(0xc9a878, 0.35).fillRect(TILE - 2, 0, 2, TILE);
      break;
    case 'warp':
      drawSpecial(g, 'path');
      softShadow(g, TILE / 2, TILE - 3, 18, 5);
      g.fillStyle(0xa67c52, 1).fillRoundedRect(TILE / 2 - 2, 10, 4, 18, 2);
      g.fillStyle(0xc49a6c, 1).fillRoundedRect(5, 4, 22, 12, 4);
      g.fillStyle(0xfff3d0, 1).fillRoundedRect(7, 6, 18, 8, 3);
      g.fillStyle(0x8d6e63, 1).fillCircle(TILE / 2, 10, 1.5);
      break;
    case 'heal':
      drawGround(g, 'town');
      softShadow(g, TILE / 2, TILE - 3, 20, 5);
      // Soft pink clinic cottage
      g.fillStyle(0xffc1cc, 1).fillRoundedRect(4, 10, TILE - 8, 18, 5);
      g.fillStyle(0xff8a9a, 1).fillTriangle(TILE / 2, 2, 2, 14, TILE - 2, 14);
      g.fillStyle(0xffffff, 1).fillRect(TILE / 2 - 2, 16, 4, 10);
      g.fillStyle(0xffffff, 1).fillRect(TILE / 2 - 5, 19, 10, 4);
      break;
    case 'shop':
      drawGround(g, 'town');
      softShadow(g, TILE / 2, TILE - 3, 20, 5);
      g.fillStyle(0x81d4fa, 1).fillRoundedRect(4, 10, TILE - 8, 18, 5);
      g.fillStyle(0x4fc3f7, 1).fillTriangle(TILE / 2, 2, 2, 14, TILE - 2, 14);
      g.fillStyle(0xfff59d, 1).fillCircle(TILE / 2, 20, 4);
      g.fillStyle(0xffffff, 0.9).fillRect(8, 16, TILE - 16, 3);
      break;
    case 'flower':
      drawGround(g, 'town');
      softShadow(g, 10, 24, 8, 3);
      softShadow(g, 22, 26, 8, 3);
      drawBloom(g, 10, 14, 0xff8a80);
      drawBloom(g, 22, 20, 0xffe082);
      break;
  }
}

function drawBloom(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(0x66bb6a, 1).fillRect(x - 1, y, 2, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillStyle(color, 1).fillCircle(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3);
  }
  g.fillStyle(0xfff59d, 1).fillCircle(x, y, 2.2);
}

function drawPlayer(g: Phaser.GameObjects.Graphics, dir: 'down' | 'up' | 'left' | 'right') {
  const W = 28;
  const H = 32;
  softShadow(g, W / 2, H - 2, 16, 5);

  // Legs
  g.fillStyle(0x5d4037, 1);
  if (dir === 'left' || dir === 'right') {
    g.fillRoundedRect(W / 2 - 5, 22, 4, 8, 2);
    g.fillRoundedRect(W / 2 + 1, 22, 4, 8, 2);
  } else {
    g.fillRoundedRect(W / 2 - 6, 22, 5, 8, 2);
    g.fillRoundedRect(W / 2 + 1, 22, 5, 8, 2);
  }

  // Soft hoodie body (AC villager vibe)
  g.fillStyle(0x64b5f6, 1).fillRoundedRect(5, 12, W - 10, 14, 6);
  g.fillStyle(shade(0x64b5f6, 0.25), 0.7).fillRoundedRect(7, 13, W - 16, 5, 3);

  // Head
  g.fillStyle(0xffccbc, 1).fillCircle(W / 2, 9, 8);
  g.fillStyle(shade(0xffccbc, 0.25), 0.5).fillCircle(W / 2 - 2, 7, 3);

  // Soft hair bowl-cut
  g.fillStyle(0x6d4c41, 1).fillEllipse(W / 2, 5, 16, 10);
  if (dir !== 'up') g.fillStyle(0xffccbc, 1).fillCircle(W / 2, 10, 5);

  // Eyes
  g.fillStyle(0x3e2723, 1);
  if (dir === 'down') {
    g.fillCircle(W / 2 - 3, 10, 1.4);
    g.fillCircle(W / 2 + 3, 10, 1.4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(W / 2 - 3.5, 9.4, 0.5);
    g.fillCircle(W / 2 + 2.5, 9.4, 0.5);
  } else if (dir === 'left') {
    g.fillCircle(W / 2 - 3, 10, 1.4);
  } else if (dir === 'right') {
    g.fillCircle(W / 2 + 3, 10, 1.4);
  }
}

type BodyForm = 'blob' | 'quad' | 'bird' | 'bug' | 'serpent' | 'drake';

function pickForm(species: Species, seed: number): BodyForm {
  const n = species.name.toLowerCase();
  if (/moth|beetle|spider|dragonfly|fly|bug/.test(n)) return 'bug';
  if (/owl|sparrow|hawk|falcon|ray|bat|wing|kite|puff|avian|lune/.test(n)) return 'bird';
  if (/serpent|worm|eel|kelp|ray/.test(n) && seed % 2 === 0) return 'serpent';
  if (/drake|wyrm|dragon|newt|salam|infer/.test(n)) return 'drake';
  if (/pup|hound|fox|cat|kit|fawn|boar|ram|colt|cub|otter|seal|frog|crab|penguin|mole|turtle|wolf/.test(n))
    return 'quad';
  const forms: BodyForm[] = ['blob', 'quad', 'bird', 'bug', 'serpent', 'drake'];
  return forms[seed % forms.length];
}

function drawCuteEyes(
  g: Phaser.GameObjects.Graphics,
  lx: number,
  ly: number,
  rx: number,
  ry: number,
  eyeR: number,
) {
  // White
  g.fillStyle(0xffffff, 1);
  g.fillCircle(lx, ly, eyeR);
  g.fillCircle(rx, ry, eyeR);
  // Soft iris
  g.fillStyle(0x37474f, 1);
  g.fillCircle(lx, ly + eyeR * 0.1, eyeR * 0.55);
  g.fillCircle(rx, ry + eyeR * 0.1, eyeR * 0.55);
  // Shine (PoGo / AC sparkle)
  g.fillStyle(0xffffff, 1);
  g.fillCircle(lx - eyeR * 0.25, ly - eyeR * 0.3, eyeR * 0.28);
  g.fillCircle(rx - eyeR * 0.25, ry - eyeR * 0.3, eyeR * 0.28);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(lx + eyeR * 0.2, ly + eyeR * 0.25, eyeR * 0.12);
  g.fillCircle(rx + eyeR * 0.2, ry + eyeR * 0.25, eyeR * 0.12);
}

function drawCheek(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.fillStyle(0xff8a80, 0.45);
  g.fillCircle(x, y, r);
}

/**
 * Soft shaded creature sprite — Animal Crossing proportions + Pokémon Go polish.
 * Distinct silhouettes by body form; type colors + stage scale.
 */
export function drawCreature(g: Phaser.GameObjects.Graphics, species: Species, size: number) {
  const type = species.types[0];
  const paint = TYPE_PAINT[type];
  const seed = hashString(species.id);
  const hueJitter = (((seed >> 5) & 0xff) / 255 - 0.5) * 0.15;
  const body = shade(paint.body, hueJitter);
  const accent = paint.accent;
  const belly = paint.belly;
  const dark = shade(body, -0.28);
  const light = shade(body, 0.28);
  const form = pickForm(species, seed);
  const stageScale = 1 + species.stage * 0.12;

  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const R = size * 0.22 * stageScale;

  // Ground shadow
  softShadow(g, cx, size * 0.88, R * 2.2, R * 0.55);

  // Soft outer glow (PoGo catch-feel)
  g.fillStyle(accent, 0.18);
  g.fillCircle(cx, cy, R * 1.55);

  // Type accessory behind body
  drawTypeBack(g, type, form, cx, cy, R, accent, dark);

  switch (form) {
    case 'bird':
      drawBird(g, cx, cy, R, body, belly, light, dark, accent);
      break;
    case 'bug':
      drawBug(g, cx, cy, R, body, belly, light, dark, accent);
      break;
    case 'serpent':
      drawSerpent(g, cx, cy, R, body, belly, light, dark, accent);
      break;
    case 'drake':
      drawDrake(g, cx, cy, R, body, belly, light, dark, accent, species.stage);
      break;
    case 'quad':
      drawQuad(g, cx, cy, R, body, belly, light, dark, accent, seed);
      break;
    default:
      drawBlob(g, cx, cy, R, body, belly, light, dark, accent, seed);
  }

  // Soft white outline ring for PoGo readability
  g.lineStyle(Math.max(2, size * 0.02), 0xffffff, 0.55);
  g.strokeCircle(cx, cy - R * 0.05, R * 1.05);
}

function drawTypeBack(
  g: Phaser.GameObjects.Graphics,
  type: ElementType,
  form: BodyForm,
  cx: number,
  cy: number,
  R: number,
  accent: number,
  dark: number,
) {
  if (type === 'air' || form === 'bird') {
    g.fillStyle(accent, 0.9);
    g.fillEllipse(cx - R * 1.15, cy, R * 0.9, R * 0.45);
    g.fillEllipse(cx + R * 1.15, cy, R * 0.9, R * 0.45);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(cx - R * 1.15, cy - 2, R * 0.45, R * 0.18);
    g.fillEllipse(cx + R * 1.15, cy - 2, R * 0.45, R * 0.18);
  }
  if (type === 'fire') {
    g.fillStyle(accent, 0.95);
    g.fillTriangle(cx, cy - R * 1.55, cx - R * 0.45, cy - R * 0.7, cx + R * 0.45, cy - R * 0.7);
    g.fillStyle(0xfff59d, 0.9);
    g.fillTriangle(cx, cy - R * 1.25, cx - R * 0.22, cy - R * 0.7, cx + R * 0.22, cy - R * 0.7);
  }
  if (type === 'darkness') {
    g.fillStyle(dark, 0.85);
    g.fillTriangle(cx - R * 0.55, cy - R * 0.9, cx - R * 0.25, cy - R * 1.45, cx - R * 0.05, cy - R * 0.9);
    g.fillTriangle(cx + R * 0.55, cy - R * 0.9, cx + R * 0.25, cy - R * 1.45, cx + R * 0.05, cy - R * 0.9);
  }
}

function drawBlob(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  dark: number,
  accent: number,
  seed: number,
) {
  // Ears
  const ear = (seed >> 2) % 3;
  if (ear === 0) {
    g.fillStyle(body, 1);
    g.fillEllipse(cx - R * 0.7, cy - R * 0.85, R * 0.4, R * 0.55);
    g.fillEllipse(cx + R * 0.7, cy - R * 0.85, R * 0.4, R * 0.55);
    g.fillStyle(accent, 0.8);
    g.fillEllipse(cx - R * 0.7, cy - R * 0.8, R * 0.18, R * 0.28);
    g.fillEllipse(cx + R * 0.7, cy - R * 0.8, R * 0.18, R * 0.28);
  } else if (ear === 1) {
    g.fillStyle(body, 1);
    g.fillCircle(cx - R * 0.75, cy - R * 0.7, R * 0.32);
    g.fillCircle(cx + R * 0.75, cy - R * 0.7, R * 0.32);
  }

  g.fillStyle(body, 1).fillCircle(cx, cy, R);
  g.fillStyle(light, 0.55).fillCircle(cx - R * 0.3, cy - R * 0.35, R * 0.45);
  g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.35, R * 1.1, R * 0.85);
  g.fillStyle(dark, 0.25).fillEllipse(cx + R * 0.25, cy + R * 0.45, R * 0.55, R * 0.4);

  // Tiny feet
  g.fillStyle(dark, 0.9);
  g.fillEllipse(cx - R * 0.45, cy + R * 0.85, R * 0.35, R * 0.22);
  g.fillEllipse(cx + R * 0.45, cy + R * 0.85, R * 0.35, R * 0.22);

  const eyeR = R * 0.22;
  drawCuteEyes(g, cx - R * 0.35, cy - R * 0.1, cx + R * 0.35, cy - R * 0.1, eyeR);
  drawCheek(g, cx - R * 0.7, cy + R * 0.2, R * 0.16);
  drawCheek(g, cx + R * 0.7, cy + R * 0.2, R * 0.16);

  // Smile
  g.lineStyle(Math.max(1.5, R * 0.08), dark, 0.7);
  g.beginPath();
  g.arc(cx, cy + R * 0.25, R * 0.28, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
}

function drawQuad(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  dark: number,
  accent: number,
  seed: number,
) {
  // Tail
  g.fillStyle(body, 1);
  g.fillEllipse(cx + R * 1.1, cy + R * 0.2, R * 0.7, R * 0.28);
  g.fillStyle(accent, 0.8).fillCircle(cx + R * 1.45, cy + R * 0.15, R * 0.22);

  // Legs
  g.fillStyle(dark, 0.95);
  g.fillRoundedRect(cx - R * 0.75, cy + R * 0.35, R * 0.32, R * 0.7, R * 0.12);
  g.fillRoundedRect(cx + R * 0.4, cy + R * 0.35, R * 0.32, R * 0.7, R * 0.12);
  g.fillRoundedRect(cx - R * 0.35, cy + R * 0.45, R * 0.28, R * 0.55, R * 0.1);
  g.fillRoundedRect(cx + R * 0.05, cy + R * 0.45, R * 0.28, R * 0.55, R * 0.1);

  // Body
  g.fillStyle(body, 1).fillEllipse(cx, cy + R * 0.15, R * 1.5, R * 1.05);
  g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.35, R * 1.0, R * 0.7);
  g.fillStyle(light, 0.5).fillEllipse(cx - R * 0.35, cy - R * 0.15, R * 0.6, R * 0.4);

  // Head
  g.fillStyle(body, 1).fillCircle(cx - R * 0.15, cy - R * 0.55, R * 0.72);
  g.fillStyle(light, 0.45).fillCircle(cx - R * 0.35, cy - R * 0.75, R * 0.28);

  // Ears (cat vs dog from seed)
  if (seed % 2 === 0) {
    g.fillStyle(body, 1);
    g.fillTriangle(cx - R * 0.7, cy - R * 0.9, cx - R * 0.45, cy - R * 1.45, cx - R * 0.2, cy - R * 0.95);
    g.fillTriangle(cx + R * 0.2, cy - R * 0.95, cx + R * 0.45, cy - R * 1.45, cx + R * 0.7, cy - R * 0.9);
    g.fillStyle(accent, 0.85);
    g.fillTriangle(cx - R * 0.55, cy - R * 1.0, cx - R * 0.45, cy - R * 1.28, cx - R * 0.32, cy - R * 1.0);
    g.fillTriangle(cx + R * 0.32, cy - R * 1.0, cx + R * 0.45, cy - R * 1.28, cx + R * 0.55, cy - R * 1.0);
  } else {
    g.fillStyle(body, 1);
    g.fillEllipse(cx - R * 0.55, cy - R * 1.05, R * 0.28, R * 0.4);
    g.fillEllipse(cx + R * 0.35, cy - R * 1.05, R * 0.28, R * 0.4);
  }

  const eyeR = R * 0.18;
  drawCuteEyes(g, cx - R * 0.4, cy - R * 0.55, cx + R * 0.1, cy - R * 0.55, eyeR);
  drawCheek(g, cx - R * 0.65, cy - R * 0.25, R * 0.12);
  drawCheek(g, cx + R * 0.35, cy - R * 0.25, R * 0.12);

  // Nose
  g.fillStyle(0x5d4037, 1).fillEllipse(cx - R * 0.12, cy - R * 0.28, R * 0.12, R * 0.08);
}

function drawBird(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  _dark: number,
  accent: number,
) {
  // Wings already in type back for air; add body wings for others
  g.fillStyle(body, 1);
  g.fillEllipse(cx - R * 0.95, cy + R * 0.1, R * 0.7, R * 0.35);
  g.fillEllipse(cx + R * 0.95, cy + R * 0.1, R * 0.7, R * 0.35);

  g.fillStyle(body, 1).fillEllipse(cx, cy + R * 0.15, R * 1.15, R * 1.05);
  g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.35, R * 0.75, R * 0.7);
  g.fillStyle(light, 0.5).fillEllipse(cx - R * 0.25, cy - R * 0.15, R * 0.45, R * 0.35);

  // Head
  g.fillStyle(body, 1).fillCircle(cx, cy - R * 0.55, R * 0.62);
  // Beak
  g.fillStyle(accent, 1).fillTriangle(cx, cy - R * 0.4, cx + R * 0.45, cy - R * 0.5, cx, cy - R * 0.6);
  // Crest
  g.fillStyle(accent, 0.95).fillTriangle(cx, cy - R * 1.25, cx - R * 0.25, cy - R * 0.9, cx + R * 0.25, cy - R * 0.9);

  // Feet
  g.fillStyle(accent, 1);
  g.fillRoundedRect(cx - R * 0.4, cy + R * 0.9, R * 0.2, R * 0.25, 2);
  g.fillRoundedRect(cx + R * 0.2, cy + R * 0.9, R * 0.2, R * 0.25, 2);

  const eyeR = R * 0.18;
  drawCuteEyes(g, cx - R * 0.28, cy - R * 0.65, cx + R * 0.28, cy - R * 0.65, eyeR);
}

function drawBug(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  dark: number,
  accent: number,
) {
  // Wings
  g.fillStyle(accent, 0.55);
  g.fillEllipse(cx - R * 0.9, cy - R * 0.2, R * 0.85, R * 0.5);
  g.fillEllipse(cx + R * 0.9, cy - R * 0.2, R * 0.85, R * 0.5);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(cx - R * 0.9, cy - R * 0.3, R * 0.4, R * 0.22);
  g.fillEllipse(cx + R * 0.9, cy - R * 0.3, R * 0.4, R * 0.22);

  // Abdomen + thorax
  g.fillStyle(body, 1).fillEllipse(cx, cy + R * 0.25, R * 1.1, R * 0.95);
  g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.4, R * 0.7, R * 0.55);
  g.fillStyle(body, 1).fillCircle(cx, cy - R * 0.45, R * 0.55);
  g.fillStyle(light, 0.5).fillCircle(cx - R * 0.2, cy - R * 0.6, R * 0.22);

  // Antennae
  g.lineStyle(2, dark, 0.9);
  g.lineBetween(cx - R * 0.2, cy - R * 0.9, cx - R * 0.55, cy - R * 1.35);
  g.lineBetween(cx + R * 0.2, cy - R * 0.9, cx + R * 0.55, cy - R * 1.35);
  g.fillStyle(accent, 1);
  g.fillCircle(cx - R * 0.55, cy - R * 1.35, R * 0.12);
  g.fillCircle(cx + R * 0.55, cy - R * 1.35, R * 0.12);

  const eyeR = R * 0.2;
  drawCuteEyes(g, cx - R * 0.28, cy - R * 0.5, cx + R * 0.28, cy - R * 0.5, eyeR);
}

function drawSerpent(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  dark: number,
  accent: number,
) {
  g.fillStyle(body, 1);
  g.fillEllipse(cx + R * 0.6, cy + R * 0.55, R * 1.3, R * 0.55);
  g.fillEllipse(cx - R * 0.2, cy + R * 0.15, R * 1.1, R * 0.6);
  g.fillStyle(belly, 1).fillEllipse(cx - R * 0.1, cy + R * 0.3, R * 0.7, R * 0.35);
  g.fillStyle(body, 1).fillCircle(cx - R * 0.35, cy - R * 0.35, R * 0.7);
  g.fillStyle(light, 0.5).fillCircle(cx - R * 0.55, cy - R * 0.55, R * 0.28);
  g.fillStyle(accent, 1).fillTriangle(cx - R * 0.35, cy - R * 0.15, cx - R * 0.95, cy - R * 0.25, cx - R * 0.35, cy - R * 0.4);

  const eyeR = R * 0.18;
  drawCuteEyes(g, cx - R * 0.6, cy - R * 0.45, cx - R * 0.15, cy - R * 0.4, eyeR);
  g.fillStyle(dark, 0.5).fillCircle(cx + R * 1.1, cy + R * 0.55, R * 0.18);
}

function drawDrake(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  light: number,
  dark: number,
  accent: number,
  stage: number,
) {
  // Wings
  g.fillStyle(accent, 0.85);
  g.fillTriangle(cx - R * 0.4, cy - R * 0.2, cx - R * 1.5, cy - R * 0.9, cx - R * 1.1, cy + R * 0.4);
  g.fillTriangle(cx + R * 0.4, cy - R * 0.2, cx + R * 1.5, cy - R * 0.9, cx + R * 1.1, cy + R * 0.4);
  g.fillStyle(0xffffff, 0.25);
  g.fillTriangle(cx - R * 0.5, cy - R * 0.15, cx - R * 1.2, cy - R * 0.55, cx - R * 0.9, cy + R * 0.1);

  // Body
  g.fillStyle(body, 1).fillEllipse(cx, cy + R * 0.1, R * 1.35, R * 1.0);
  g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.3, R * 0.9, R * 0.65);
  g.fillStyle(light, 0.45).fillEllipse(cx - R * 0.3, cy - R * 0.2, R * 0.5, R * 0.35);

  // Head
  g.fillStyle(body, 1).fillCircle(cx + R * 0.15, cy - R * 0.55, R * 0.65);
  // Horns (more with stage)
  g.fillStyle(accent, 1);
  g.fillTriangle(cx - R * 0.1, cy - R * 0.9, cx - R * 0.25, cy - R * (1.3 + stage * 0.15), cx + R * 0.05, cy - R * 0.95);
  g.fillTriangle(cx + R * 0.35, cy - R * 0.9, cx + R * 0.5, cy - R * (1.3 + stage * 0.15), cx + R * 0.2, cy - R * 0.95);

  // Legs
  g.fillStyle(dark, 0.95);
  g.fillRoundedRect(cx - R * 0.7, cy + R * 0.5, R * 0.3, R * 0.55, 3);
  g.fillRoundedRect(cx + R * 0.35, cy + R * 0.5, R * 0.3, R * 0.55, 3);

  const eyeR = R * 0.17;
  drawCuteEyes(g, cx - R * 0.05, cy - R * 0.6, cx + R * 0.4, cy - R * 0.6, eyeR);
  drawCheek(g, cx - R * 0.2, cy - R * 0.25, R * 0.1);
  drawCheek(g, cx + R * 0.5, cy - R * 0.25, R * 0.1);
}

export function generateAllTextures(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const make = (key: string, w: number, h: number, draw: () => void) => {
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  (Object.keys(BIOME_PALETTE) as Biome[]).forEach((biome) => {
    make(`ground_${biome}`, TILE, TILE, () => drawGround(g, biome));
    make(`tall_${biome}`, TILE, TILE, () => drawTall(g, biome));
    make(`block_${biome}`, TILE, TILE, () => drawBlock(g, biome));
  });

  (['water', 'warp', 'heal', 'shop', 'flower', 'path'] as const).forEach((kind) =>
    make(`sp_${kind}`, TILE, TILE, () => drawSpecial(g, kind)),
  );

  (['down', 'up', 'left', 'right'] as const).forEach((dir) =>
    make(`player_${dir}`, 28, 32, () => drawPlayer(g, dir)),
  );

  // Soft battle sky / ground strips for PoGo-style encounter backdrop
  make('battle_sky', 448, 180, () => {
    for (let y = 0; y < 180; y++) {
      const t = y / 180;
      const c = shade(0x9ad4f5, -t * 0.25);
      g.fillStyle(c, 1).fillRect(0, y, 448, 2);
    }
    // Soft clouds
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(80, 40, 90, 28);
    g.fillEllipse(120, 36, 70, 24);
    g.fillEllipse(320, 50, 110, 30);
    g.fillEllipse(360, 46, 70, 22);
  });
  make('battle_ground', 448, 140, () => {
    for (let y = 0; y < 140; y++) {
      const t = y / 140;
      const c = shade(0x8fd67a, -t * 0.35);
      g.fillStyle(c, 1).fillRect(0, y, 448, 2);
    }
    g.fillStyle(0x6fbf6a, 0.35);
    for (let i = 0; i < 18; i++) {
      g.fillCircle(20 + i * 24, 30 + (i % 3) * 20, 6 + (i % 4));
    }
  });
  make('battle_ring', 140, 40, () => {
    g.fillStyle(0x2a3a2a, 0.2).fillEllipse(70, 22, 130, 28);
    g.fillStyle(0xffffff, 0.55).fillEllipse(70, 20, 120, 22);
    g.fillStyle(0xe8f5e9, 0.9).fillEllipse(70, 20, 100, 16);
  });

  SPECIES_LIST.forEach((sp) => {
    make(`creature_${sp.id}`, CREATURE_SIZE, CREATURE_SIZE, () => drawCreature(g, sp, CREATURE_SIZE));
  });

  g.destroy();
}
