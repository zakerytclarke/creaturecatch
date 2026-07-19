import Phaser from 'phaser';
import { SPECIES_LIST, Species } from '../data/creatures';
import { ElementType } from '../data/types';
import { Biome } from '../data/regions';
import { hashString } from '../systems/rng';

export const TILE = 32;
export const CREATURE_SIZE = 96;
export const PLAYER_W = 36;
export const PLAYER_H = 40;

/** Saturated BDSP-like type paints (clean, toy-like). */
export const TYPE_PAINT: Record<ElementType, { body: number; accent: number; belly: number }> = {
  fire: { body: 0xff7043, accent: 0xffca28, belly: 0xffe0b2 },
  earth: { body: 0xbcaaa4, accent: 0x66bb6a, belly: 0xefebe9 },
  air: { body: 0x64b5f6, accent: 0xe3f2fd, belly: 0xffffff },
  water: { body: 0x29b6f6, accent: 0x81d4fa, belly: 0xe1f5fe },
  darkness: { body: 0x7e57c2, accent: 0xce93d8, belly: 0xede7f6 },
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
  groundDark: number;
  groundLight: number;
  tall: number;
  tallLight: number;
  leaf: number;
  trunk: number;
  rock: number;
}

/** High-saturation BDSP diorama palettes. */
const BIOME_PALETTE: Record<Biome, BiomePalette> = {
  town: {
    ground: 0x5ec85a,
    groundDark: 0x48b048,
    groundLight: 0x7ae06e,
    tall: 0x3ea83e,
    tallLight: 0x6ed85a,
    leaf: 0x4caf50,
    trunk: 0x8d6e45,
    rock: 0xa1887f,
  },
  forest: {
    ground: 0x4caf50,
    groundDark: 0x388e3c,
    groundLight: 0x66bb6a,
    tall: 0x2e7d32,
    tallLight: 0x66bb6a,
    leaf: 0x43a047,
    trunk: 0x6d4c41,
    rock: 0x8d6e63,
  },
  beach: {
    ground: 0xf0d9a0,
    groundDark: 0xe0c484,
    groundLight: 0xffe8b8,
    tall: 0xc9a84e,
    tallLight: 0xe8d070,
    leaf: 0x66bb6a,
    trunk: 0xa1887f,
    rock: 0xd7ccc8,
  },
  desert: {
    ground: 0xecc078,
    groundDark: 0xd4a85c,
    groundLight: 0xf5d698,
    tall: 0xc9a04e,
    tallLight: 0xe8c878,
    leaf: 0xa5d6a7,
    trunk: 0xa1887f,
    rock: 0xc4a574,
  },
  highlands: {
    ground: 0x66bb6a,
    groundDark: 0x4caf50,
    groundLight: 0x81c784,
    tall: 0x43a047,
    tallLight: 0x81c784,
    leaf: 0x66bb6a,
    trunk: 0x795548,
    rock: 0x90a4ae,
  },
  cave: {
    ground: 0x5c5668,
    groundDark: 0x453f52,
    groundLight: 0x6d667a,
    tall: 0x689f38,
    tallLight: 0x8bc34a,
    leaf: 0x7cb342,
    trunk: 0x5d4037,
    rock: 0x455a64,
  },
};

function ovalShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, a = 0.28) {
  g.fillStyle(0x1a1a1a, a);
  g.fillEllipse(x, y, w, h);
}

function sphere(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
) {
  // BDSP toy-sphere: base + top-left highlight + bottom-right shade
  g.fillStyle(color, 1).fillCircle(x, y, r);
  g.fillStyle(shade(color, -0.22), 0.35).fillCircle(x + r * 0.22, y + r * 0.28, r * 0.7);
  g.fillStyle(shade(color, 0.45), 0.55).fillCircle(x - r * 0.32, y - r * 0.35, r * 0.38);
  g.fillStyle(0xffffff, 0.35).fillCircle(x - r * 0.38, y - r * 0.42, r * 0.16);
}

function drawGround(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  g.fillStyle(pal.ground, 1).fillRect(0, 0, TILE, TILE);

  if (biome === 'beach' || biome === 'desert') {
    // Wavy sand ridges (BDSP shore)
    g.lineStyle(1.5, pal.groundDark, 0.35);
    for (let i = 0; i < 4; i++) {
      const y = 6 + i * 7;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(8, y + 1.5);
      g.lineTo(16, y - 1);
      g.lineTo(24, y + 1.5);
      g.lineTo(32, y);
      g.strokePath();
    }
    g.fillStyle(pal.groundLight, 0.35);
    g.fillCircle(10, 8, 2);
    g.fillCircle(22, 18, 1.5);
  } else if (biome === 'cave') {
    g.fillStyle(pal.groundDark, 0.4);
    g.fillCircle(8, 10, 3);
    g.fillCircle(20, 22, 4);
    g.fillStyle(pal.groundLight, 0.25);
    g.fillCircle(24, 8, 2);
  } else {
    // Saturated grass tuft noise
    g.fillStyle(pal.groundDark, 0.35);
    g.fillCircle(7, 9, 2.2);
    g.fillCircle(18, 20, 2.6);
    g.fillCircle(26, 11, 1.8);
    g.fillStyle(pal.groundLight, 0.4);
    g.fillCircle(12, 24, 2);
    g.fillCircle(24, 6, 1.6);
    // Tiny blade ticks
    g.lineStyle(1.2, pal.groundDark, 0.45);
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 6;
      g.lineBetween(x, 28, x + 1, 24);
    }
  }
}

function drawTall(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  drawGround(g, biome);
  // Dense BDSP-style tall grass clumps (rounded tops, not triangles)
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 6;
    const h = 12 + (i % 3) * 3;
    g.fillStyle(pal.tall, 1);
    g.fillRoundedRect(x - 2.5, TILE - h, 5, h, 2.5);
    sphere(g, x, TILE - h + 1, 3.2, pal.tallLight);
  }
  // Soft highlight sheen
  g.fillStyle(0xffffff, 0.12);
  g.fillEllipse(TILE / 2, TILE - 14, 20, 6);
}

/** Classic Sinnoh remake pom-pom tree (3 leafy orbs + thick trunk). */
function drawBdspTree(g: Phaser.GameObjects.Graphics, leaf: number, trunk: number) {
  ovalShadow(g, TILE / 2, TILE - 3, 20, 5, 0.3);
  // Trunk
  g.fillStyle(trunk, 1).fillRoundedRect(TILE / 2 - 3.5, 16, 7, 14, 2);
  g.fillStyle(shade(trunk, 0.2), 1).fillRect(TILE / 2 - 2.5, 17, 2, 12);
  // Three pom-pom canopies
  sphere(g, TILE / 2 - 7, 12, 8, leaf);
  sphere(g, TILE / 2 + 7, 12, 8, leaf);
  sphere(g, TILE / 2, 6, 9, shade(leaf, 0.08));
}

function drawBlock(g: Phaser.GameObjects.Graphics, biome: Biome) {
  const pal = BIOME_PALETTE[biome];
  drawGround(g, biome);

  if (biome === 'forest' || biome === 'town' || biome === 'highlands') {
    drawBdspTree(g, pal.leaf, pal.trunk);
  } else if (biome === 'beach') {
    ovalShadow(g, TILE / 2, TILE - 3, 16, 4, 0.25);
    // Palm: thick trunk lean + 3 green frond orbs
    g.fillStyle(pal.trunk, 1).fillRoundedRect(TILE / 2 - 2, 12, 4, 16, 2);
    sphere(g, TILE / 2 - 8, 10, 6, pal.leaf);
    sphere(g, TILE / 2 + 8, 10, 6, pal.leaf);
    sphere(g, TILE / 2, 5, 7, shade(pal.leaf, 0.1));
  } else if (biome === 'desert') {
    ovalShadow(g, TILE / 2, TILE - 3, 20, 5, 0.25);
    // Sandstone rock with cliff face
    g.fillStyle(pal.rock, 1).fillRoundedRect(3, 8, TILE - 6, TILE - 10, 6);
    g.fillStyle(shade(pal.rock, -0.2), 1).fillRect(3, 20, TILE - 6, 8);
    g.fillStyle(shade(pal.rock, -0.2), 1).fillRoundedRect(3, 22, TILE - 6, 6, 4);
    g.fillStyle(shade(pal.rock, 0.25), 1).fillRoundedRect(6, 10, 12, 5, 3);
  } else {
    ovalShadow(g, TILE / 2, TILE - 3, 18, 5, 0.3);
    // Cave boulder
    sphere(g, TILE / 2, 16, 11, pal.rock);
    g.fillStyle(shade(pal.rock, -0.25), 0.5).fillCircle(TILE / 2 + 3, 20, 7);
  }
}

function drawSpecial(
  g: Phaser.GameObjects.Graphics,
  kind: 'water' | 'warp' | 'heal' | 'shop' | 'flower' | 'path',
) {
  switch (kind) {
    case 'water': {
      // Deep saturated BDSP water
      g.fillStyle(0x1e88e5, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x1565c0, 0.5).fillRect(0, TILE / 2, TILE, TILE / 2);
      // Caustic sparkles
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(8, 8, 1.4);
      g.fillCircle(20, 14, 1.1);
      g.fillCircle(12, 22, 1.3);
      g.fillCircle(26, 6, 1);
      // Foam ripples
      g.fillStyle(0xb3e5fc, 0.55);
      g.fillEllipse(10, 10, 12, 4);
      g.fillEllipse(22, 20, 14, 4);
      break;
    }
    case 'path': {
      g.fillStyle(0xe6c988, 1).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0xd4b46e, 0.5);
      g.fillCircle(8, 10, 2);
      g.fillCircle(20, 22, 2.5);
      g.fillStyle(0xf5deb0, 0.4);
      g.fillCircle(24, 8, 1.8);
      // Soft edge darkening like BDSP path borders
      g.fillStyle(0xc9a85c, 0.35).fillRect(0, 0, 2, TILE);
      g.fillStyle(0xc9a85c, 0.35).fillRect(TILE - 2, 0, 2, TILE);
      break;
    }
    case 'warp': {
      drawSpecial(g, 'path');
      ovalShadow(g, TILE / 2, TILE - 2, 14, 4, 0.25);
      g.fillStyle(0x8d6e45, 1).fillRoundedRect(TILE / 2 - 2, 12, 4, 16, 2);
      g.fillStyle(0xc4a574, 1).fillRoundedRect(4, 4, 24, 12, 4);
      g.fillStyle(0xfff8e1, 1).fillRoundedRect(6, 6, 20, 8, 3);
      g.fillStyle(0x6d4c41, 1).fillCircle(TILE / 2, 10, 1.4);
      break;
    }
    case 'heal': {
      drawGround(g, 'town');
      ovalShadow(g, TILE / 2, TILE - 2, 18, 4, 0.28);
      // Chibi clinic building
      g.fillStyle(0xffcdd2, 1).fillRoundedRect(4, 12, TILE - 8, 16, 4);
      g.fillStyle(0xef5350, 1).fillTriangle(TILE / 2, 2, 1, 14, TILE - 1, 14);
      g.fillStyle(0xffffff, 1).fillRect(TILE / 2 - 2, 16, 4, 9);
      g.fillStyle(0xffffff, 1).fillRect(TILE / 2 - 5, 19, 10, 4);
      break;
    }
    case 'shop': {
      drawGround(g, 'town');
      ovalShadow(g, TILE / 2, TILE - 2, 18, 4, 0.28);
      g.fillStyle(0xbbdefb, 1).fillRoundedRect(4, 12, TILE - 8, 16, 4);
      g.fillStyle(0x1e88e5, 1).fillTriangle(TILE / 2, 2, 1, 14, TILE - 1, 14);
      g.fillStyle(0xfff176, 1).fillCircle(TILE / 2, 20, 4);
      g.fillStyle(0xffffff, 0.9).fillRect(7, 16, TILE - 14, 3);
      break;
    }
    case 'flower': {
      drawGround(g, 'town');
      ovalShadow(g, 10, 26, 8, 3, 0.2);
      ovalShadow(g, 22, 28, 8, 3, 0.2);
      drawBloom(g, 10, 16, 0xef5350);
      drawBloom(g, 22, 20, 0xffee58);
      break;
    }
  }
}

function drawBloom(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number) {
  g.fillStyle(0x66bb6a, 1).fillRect(x - 1, y, 2, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    sphere(g, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 2.6, color);
  }
  sphere(g, x, y, 2.2, 0xfff59d);
}

/**
 * BDSP chibi player: oversized head, stubby body, soft oval shadow.
 * Drawn as if viewed from a high angle (diorama).
 */
function drawPlayer(g: Phaser.GameObjects.Graphics, dir: 'down' | 'up' | 'left' | 'right') {
  const W = PLAYER_W;
  const H = PLAYER_H;
  ovalShadow(g, W / 2, H - 2, 18, 6, 0.32);

  // Stubby legs
  g.fillStyle(0x5d4037, 1);
  g.fillRoundedRect(W / 2 - 7, H - 12, 5, 8, 2);
  g.fillRoundedRect(W / 2 + 2, H - 12, 5, 8, 2);

  // Tiny cylindrical body (hoodie)
  g.fillStyle(0x42a5f5, 1).fillRoundedRect(W / 2 - 7, 16, 14, 12, 5);
  g.fillStyle(shade(0x42a5f5, 0.3), 0.7).fillRoundedRect(W / 2 - 5, 17, 10, 4, 2);

  // HUGE chibi head
  const hx = W / 2;
  const hy = 12;
  const hr = 11;
  sphere(g, hx, hy, hr, 0xffccbc);

  // Hair bowl (direction-aware)
  g.fillStyle(0x6d4c41, 1);
  if (dir === 'up') {
    g.fillEllipse(hx, hy - 2, 22, 16);
  } else {
    g.fillEllipse(hx, hy - 4, 20, 12);
    // Bangs leave face open
    g.fillStyle(0xffccbc, 1).fillCircle(hx, hy + 2, 7);
  }

  // Eyes
  if (dir !== 'up') {
    g.fillStyle(0x3e2723, 1);
    if (dir === 'down') {
      g.fillCircle(hx - 3.5, hy + 1, 1.6);
      g.fillCircle(hx + 3.5, hy + 1, 1.6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(hx - 4, hy + 0.3, 0.6);
      g.fillCircle(hx + 3, hy + 0.3, 0.6);
    } else if (dir === 'left') {
      g.fillCircle(hx - 4, hy + 1, 1.6);
      g.fillStyle(0xffffff, 1).fillCircle(hx - 4.5, hy + 0.3, 0.55);
    } else {
      g.fillCircle(hx + 4, hy + 1, 1.6);
      g.fillStyle(0xffffff, 1).fillCircle(hx + 3.5, hy + 0.3, 0.55);
    }
  }

  // Soft blush
  if (dir === 'down') {
    g.fillStyle(0xff8a80, 0.4);
    g.fillCircle(hx - 7, hy + 4, 2);
    g.fillCircle(hx + 7, hy + 4, 2);
  }
}

type BodyForm = 'blob' | 'quad' | 'bird' | 'bug' | 'serpent' | 'drake';

function pickForm(species: Species, seed: number): BodyForm {
  const n = species.name.toLowerCase();
  if (/moth|beetle|spider|dragonfly|fly|bug/.test(n)) return 'bug';
  if (/owl|sparrow|hawk|falcon|ray|bat|wing|kite|puff|avian|lune/.test(n)) return 'bird';
  if (/serpent|worm|eel|kelp/.test(n)) return 'serpent';
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
  g.fillStyle(0xffffff, 1);
  g.fillCircle(lx, ly, eyeR);
  g.fillCircle(rx, ry, eyeR);
  g.fillStyle(0x263238, 1);
  g.fillCircle(lx, ly + eyeR * 0.08, eyeR * 0.58);
  g.fillCircle(rx, ry + eyeR * 0.08, eyeR * 0.58);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(lx - eyeR * 0.28, ly - eyeR * 0.28, eyeR * 0.3);
  g.fillCircle(rx - eyeR * 0.28, ry - eyeR * 0.28, eyeR * 0.3);
}

/**
 * BDSP chibi creature: oversized head, stubby body, vinyl-toy shading, oval shadow.
 */
export function drawCreature(g: Phaser.GameObjects.Graphics, species: Species, size: number) {
  const type = species.types[0];
  const paint = TYPE_PAINT[type];
  const seed = hashString(species.id);
  const hueJitter = (((seed >> 5) & 0xff) / 255 - 0.5) * 0.1;
  const body = shade(paint.body, hueJitter);
  const accent = paint.accent;
  const belly = paint.belly;
  const dark = shade(body, -0.25);
  const form = pickForm(species, seed);
  const stageScale = 1 + species.stage * 0.1;

  const cx = size / 2;
  const cy = size / 2 + size * 0.06;
  const R = size * 0.2 * stageScale;

  ovalShadow(g, cx, size * 0.9, R * 2.4, R * 0.55, 0.3);

  // Type back props
  if (type === 'fire') {
    g.fillStyle(accent, 1);
    g.fillTriangle(cx, cy - R * 1.7, cx - R * 0.4, cy - R * 0.85, cx + R * 0.4, cy - R * 0.85);
    g.fillStyle(0xfff59d, 1);
    g.fillTriangle(cx, cy - R * 1.35, cx - R * 0.2, cy - R * 0.85, cx + R * 0.2, cy - R * 0.85);
  }
  if (type === 'air' || form === 'bird') {
    g.fillStyle(accent, 0.95);
    g.fillEllipse(cx - R * 1.2, cy + R * 0.1, R * 0.95, R * 0.4);
    g.fillEllipse(cx + R * 1.2, cy + R * 0.1, R * 0.95, R * 0.4);
  }
  if (type === 'darkness') {
    g.fillStyle(dark, 1);
    g.fillTriangle(cx - R * 0.5, cy - R * 0.95, cx - R * 0.25, cy - R * 1.5, cx - R * 0.05, cy - R * 0.95);
    g.fillTriangle(cx + R * 0.5, cy - R * 0.95, cx + R * 0.25, cy - R * 1.5, cx + R * 0.05, cy - R * 0.95);
  }

  // Stubby body (small relative to head — chibi)
  const bodyY = cy + R * 0.45;
  if (form === 'serpent') {
    g.fillStyle(body, 1);
    g.fillEllipse(cx + R * 0.5, bodyY + R * 0.2, R * 1.4, R * 0.5);
    sphere(g, cx - R * 0.1, bodyY - R * 0.1, R * 0.55, body);
  } else {
    sphere(g, cx, bodyY, R * 0.7, body);
    g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.15, R * 0.85, R * 0.55);
  }

  // Tiny feet
  if (form !== 'serpent' && form !== 'bird') {
    g.fillStyle(dark, 1);
    g.fillEllipse(cx - R * 0.4, bodyY + R * 0.65, R * 0.32, R * 0.18);
    g.fillEllipse(cx + R * 0.4, bodyY + R * 0.65, R * 0.32, R * 0.18);
  }
  if (form === 'bird') {
    g.fillStyle(accent, 1);
    g.fillRoundedRect(cx - R * 0.35, bodyY + R * 0.55, R * 0.18, R * 0.28, 2);
    g.fillRoundedRect(cx + R * 0.18, bodyY + R * 0.55, R * 0.18, R * 0.28, 2);
  }

  // OVERSIZED head (BDSP chibi)
  const headR = R * 0.95;
  const headY = cy - R * 0.35;
  sphere(g, cx, headY, headR, body);

  // Ears / features by form
  if (form === 'quad' || form === 'blob') {
    if (seed % 2 === 0) {
      // Pointy ears
      g.fillStyle(body, 1);
      g.fillTriangle(cx - headR * 0.7, headY - headR * 0.3, cx - headR * 0.45, headY - headR * 1.15, cx - headR * 0.15, headY - headR * 0.45);
      g.fillTriangle(cx + headR * 0.7, headY - headR * 0.3, cx + headR * 0.45, headY - headR * 1.15, cx + headR * 0.15, headY - headR * 0.45);
      g.fillStyle(accent, 0.9);
      g.fillTriangle(cx - headR * 0.55, headY - headR * 0.45, cx - headR * 0.45, headY - headR * 0.95, cx - headR * 0.3, headY - headR * 0.5);
      g.fillTriangle(cx + headR * 0.55, headY - headR * 0.45, cx + headR * 0.45, headY - headR * 0.95, cx + headR * 0.3, headY - headR * 0.5);
    } else {
      sphere(g, cx - headR * 0.7, headY - headR * 0.55, headR * 0.28, body);
      sphere(g, cx + headR * 0.7, headY - headR * 0.55, headR * 0.28, body);
    }
  }
  if (form === 'drake') {
    g.fillStyle(accent, 1);
    g.fillTriangle(cx - headR * 0.35, headY - headR * 0.6, cx - headR * 0.5, headY - headR * 1.25, cx - headR * 0.05, headY - headR * 0.7);
    g.fillTriangle(cx + headR * 0.35, headY - headR * 0.6, cx + headR * 0.5, headY - headR * 1.25, cx + headR * 0.05, headY - headR * 0.7);
  }
  if (form === 'bug') {
    g.lineStyle(2, dark, 1);
    g.lineBetween(cx - headR * 0.25, headY - headR * 0.7, cx - headR * 0.6, headY - headR * 1.2);
    g.lineBetween(cx + headR * 0.25, headY - headR * 0.7, cx + headR * 0.6, headY - headR * 1.2);
    sphere(g, cx - headR * 0.6, headY - headR * 1.2, headR * 0.12, accent);
    sphere(g, cx + headR * 0.6, headY - headR * 1.2, headR * 0.12, accent);
  }
  if (form === 'bird') {
    g.fillStyle(accent, 1);
    g.fillTriangle(cx, headY + headR * 0.15, cx + headR * 0.55, headY, cx, headY - headR * 0.1);
    g.fillTriangle(cx, headY - headR * 1.15, cx - headR * 0.22, headY - headR * 0.7, cx + headR * 0.22, headY - headR * 0.7);
  }

  // Face
  const eyeR = headR * 0.22;
  drawCuteEyes(g, cx - headR * 0.35, headY - headR * 0.05, cx + headR * 0.35, headY - headR * 0.05, eyeR);
  g.fillStyle(0xff8a80, 0.45);
  g.fillCircle(cx - headR * 0.65, headY + headR * 0.25, headR * 0.16);
  g.fillCircle(cx + headR * 0.65, headY + headR * 0.25, headR * 0.16);

  // Tiny smile
  g.lineStyle(Math.max(1.5, headR * 0.08), dark, 0.65);
  g.beginPath();
  g.arc(cx, headY + headR * 0.3, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
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
    make(`player_${dir}`, PLAYER_W, PLAYER_H, () => drawPlayer(g, dir)),
  );

  // Standalone shadow for world entities
  make('soft_shadow', 40, 16, () => {
    ovalShadow(g, 20, 8, 36, 12, 0.35);
  });

  // BDSP-bright battle backdrop
  make('battle_sky', 448, 180, () => {
    for (let y = 0; y < 180; y++) {
      const t = y / 180;
      // Bright sunny blue → lighter horizon
      const c = shade(0x64b5f6, t * 0.35);
      g.fillStyle(c, 1).fillRect(0, y, 448, 2);
    }
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(90, 42, 100, 30);
    g.fillEllipse(130, 38, 70, 24);
    g.fillEllipse(330, 48, 120, 32);
    g.fillEllipse(370, 44, 70, 22);
    // Soft sun glow
    g.fillStyle(0xfff59d, 0.35).fillCircle(400, 24, 28);
    g.fillStyle(0xffee58, 0.5).fillCircle(400, 24, 14);
  });
  make('battle_ground', 448, 140, () => {
    for (let y = 0; y < 140; y++) {
      const t = y / 140;
      const c = shade(0x66bb6a, -t * 0.25);
      g.fillStyle(c, 1).fillRect(0, y, 448, 2);
    }
    g.fillStyle(0x43a047, 0.3);
    for (let i = 0; i < 20; i++) {
      g.fillCircle(16 + i * 22, 24 + (i % 4) * 18, 5 + (i % 3));
    }
  });
  make('battle_ring', 140, 40, () => {
    ovalShadow(g, 70, 22, 128, 28, 0.25);
    g.fillStyle(0xffffff, 0.4).fillEllipse(70, 18, 110, 18);
    g.fillStyle(0xe8f5e9, 0.75).fillEllipse(70, 18, 90, 12);
  });

  SPECIES_LIST.forEach((sp) => {
    make(`creature_${sp.id}`, CREATURE_SIZE, CREATURE_SIZE, () => drawCreature(g, sp, CREATURE_SIZE));
  });

  g.destroy();
}
