import Phaser from 'phaser';
import { Species } from '../data/creatures';
import { ElementType } from '../data/types';
import { hashString } from '../systems/rng';

/** Local copy to avoid circular import with textures.ts */
const TYPE_PAINT: Record<ElementType, { body: number; accent: number; belly: number }> = {
  fire: { body: 0xff7043, accent: 0xffca28, belly: 0xffe0b2 },
  earth: { body: 0xbcaaa4, accent: 0x66bb6a, belly: 0xefebe9 },
  air: { body: 0x64b5f6, accent: 0xe3f2fd, belly: 0xffffff },
  water: { body: 0x29b6f6, accent: 0x81d4fa, belly: 0xe1f5fe },
  darkness: { body: 0x7e57c2, accent: 0xce93d8, belly: 0xede7f6 },
};

function shade(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const adj = (c: number) =>
    amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt));
  return (adj(r) << 16) | (adj(g) << 8) | adj(b);
}

/**
 * Modular creature silhouette system.
 * Picks an archetype from the species name, then mixes seeded body parts
 * (ears, tails, legs, extras) so cats ≠ dogs ≠ lions ≠ snakes ≠ ghosts, etc.
 */

export type Archetype =
  | 'snake'
  | 'ghost'
  | 'spider'
  | 'crab'
  | 'cat'
  | 'dog'
  | 'lion'
  | 'fox'
  | 'bird'
  | 'bat'
  | 'frog'
  | 'turtle'
  | 'beetle'
  | 'moth'
  | 'fish'
  | 'jelly'
  | 'otter'
  | 'seal'
  | 'penguin'
  | 'bear'
  | 'deer'
  | 'ram'
  | 'horse'
  | 'boar'
  | 'mole'
  | 'armadillo'
  | 'dragon'
  | 'newt'
  | 'imp'
  | 'blob';

type EarStyle = 'none' | 'pointy' | 'round' | 'floppy' | 'tuft' | 'horn' | 'antenna';
type TailStyle = 'none' | 'flame' | 'fluffy' | 'thin' | 'fin' | 'stinger' | 'curl' | 'ghost';
type LegStyle = 'none' | 'stub' | 'quad' | 'bird' | 'crab' | 'spider' | 'flipper';

interface CreatureBuild {
  archetype: Archetype;
  ear: EarStyle;
  tail: TailStyle;
  legs: LegStyle;
  hasMane: boolean;
  hasShell: boolean;
  hasWings: boolean;
  hasCloak: boolean;
  spots: boolean;
  stripes: boolean;
  eyeGap: number; // 0.25..0.45 of headR
}

function ovalShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, a = 0.28) {
  g.fillStyle(0x1a1a1a, a);
  g.fillEllipse(x, y, w, h);
}

function sphere(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number) {
  g.fillStyle(color, 1).fillCircle(x, y, r);
  g.fillStyle(shade(color, -0.22), 0.35).fillCircle(x + r * 0.22, y + r * 0.28, r * 0.7);
  g.fillStyle(shade(color, 0.45), 0.55).fillCircle(x - r * 0.32, y - r * 0.35, r * 0.38);
  g.fillStyle(0xffffff, 0.35).fillCircle(x - r * 0.38, y - r * 0.42, r * 0.16);
}

function pickArchetype(name: string, seed: number): Archetype {
  const n = name.toLowerCase();
  if (/serpent|worm|kelp|eel|quartzerp/.test(n)) return 'snake';
  if (/ghast|wraith|ghost|shadeimp|phant|murkling|nether|voidlord/.test(n)) return 'ghost';
  if (/spider|weaver|hex/.test(n)) return 'spider';
  if (/crab|claw|reef|brina/.test(n)) return 'crab';
  if (/lynx|cat|kit(?!e)|gloomkit|umbracat|cloudkit|sparkit/.test(n)) return 'cat';
  if (/fox|flare|pyrovix/.test(n)) return 'fox';
  if (/lion|mane|reaver/.test(n)) return 'lion';
  if (/pup|hound|wolf|fang|dog|mudpup|puddle|shade|dusk|scorch|terra/.test(n)) return 'dog';
  if (/owl|sparrow|hawk|falcon|kite|avian|puff|nimb|raven|lune|tempestowl|feather/.test(n)) return 'bird';
  if (/bat|wing|nightwing|drift|galebat|shadowbat/.test(n)) return 'bat';
  if (/frog|toad|splash|marsh/.test(n)) return 'frog';
  if (/turtle|shell|toise|bark|grov/.test(n)) return 'turtle';
  if (/beetle|iron|granit/.test(n)) return 'beetle';
  if (/moth|kindle|pyre|wisp(?!ghast)|auroramoth/.test(n)) return 'moth';
  if (/fin|fish|ray|drizzle|current|ripple|tidal|abyssray/.test(n)) return 'fish';
  if (/jelly|pearl/.test(n)) return 'jelly';
  if (/otter|bubble|tidalotter|aqua/.test(n)) return 'otter';
  if (/seal|walrus|mist|frost/.test(n)) return 'seal';
  if (/penguin|brine|glaci/.test(n)) return 'penguin';
  if (/cub|bruin|ursa|bear|coal|emberbruin|magmur|crag|bouldur|mountur/.test(n)) return 'bear';
  if (/fawn|stag|deer|ash|charstag/.test(n)) return 'deer';
  if (/ram|goat|horn|fern|thorn|craggoat|solar|sear/.test(n)) return 'ram';
  if (/colt|mare|neigh|char|blaze|inferneigh/.test(n)) return 'horse';
  if (/boar|tusk|magma|molten/.test(n)) return 'boar';
  if (/mole|pebble|boulder|terraquake/.test(n)) return 'mole';
  if (/dillo|geo|quartzad/.test(n)) return 'armadillo';
  if (/drake|wyrm|dragon|storm|aero|eclipse|volcan|ign/.test(n)) return 'dragon';
  if (/newt|salam|cinder|infernewt|obsidian|voidsal/.test(n)) return 'newt';
  if (/imp|fiend|sprite|breez|zephyr|gale|tempest|cumul|root|timber/.test(n)) return 'imp';
  const fallback: Archetype[] = ['blob', 'dog', 'cat', 'bird', 'frog', 'imp', 'bear'];
  return fallback[seed % fallback.length];
}

function buildFromArchetype(arch: Archetype, seed: number): CreatureBuild {
  const bit = (n: number) => ((seed >>> n) & 1) === 1;
  const base: CreatureBuild = {
    archetype: arch,
    ear: 'none',
    tail: 'none',
    legs: 'stub',
    hasMane: false,
    hasShell: false,
    hasWings: false,
    hasCloak: false,
    spots: bit(3),
    stripes: bit(5),
    eyeGap: 0.32 + ((seed >>> 8) & 7) * 0.015,
  };

  switch (arch) {
    case 'snake':
      return { ...base, ear: 'none', tail: 'none', legs: 'none', eyeGap: 0.38 };
    case 'ghost':
      return { ...base, ear: bit(1) ? 'tuft' : 'none', tail: 'ghost', legs: 'none', hasCloak: true, eyeGap: 0.4 };
    case 'spider':
      return { ...base, ear: 'none', tail: 'stinger', legs: 'spider', eyeGap: 0.28 };
    case 'crab':
      return { ...base, ear: 'none', tail: 'none', legs: 'crab', hasShell: true, eyeGap: 0.42 };
    case 'cat':
      return { ...base, ear: 'pointy', tail: bit(2) ? 'fluffy' : 'thin', legs: 'quad', eyeGap: 0.34 };
    case 'fox':
      return { ...base, ear: 'pointy', tail: 'fluffy', legs: 'quad', eyeGap: 0.33 };
    case 'dog':
      return { ...base, ear: bit(2) ? 'floppy' : 'round', tail: bit(4) ? 'fluffy' : 'curl', legs: 'quad' };
    case 'lion':
      return { ...base, ear: 'round', tail: 'fluffy', legs: 'quad', hasMane: true, eyeGap: 0.3 };
    case 'bird':
      return { ...base, ear: 'none', tail: 'fin', legs: 'bird', hasWings: true };
    case 'bat':
      return { ...base, ear: 'pointy', tail: 'none', legs: 'stub', hasWings: true, eyeGap: 0.36 };
    case 'frog':
      return { ...base, ear: 'none', tail: 'none', legs: 'stub', eyeGap: 0.4 };
    case 'turtle':
      return { ...base, ear: 'none', tail: 'thin', legs: 'stub', hasShell: true };
    case 'beetle':
      return { ...base, ear: 'antenna', tail: 'none', legs: 'stub', hasShell: true };
    case 'moth':
      return { ...base, ear: 'antenna', tail: 'none', legs: 'stub', hasWings: true };
    case 'fish':
      return { ...base, ear: 'none', tail: 'fin', legs: 'none', hasWings: false };
    case 'jelly':
      return { ...base, ear: 'none', tail: 'ghost', legs: 'none', hasCloak: true, eyeGap: 0.36 };
    case 'otter':
      return { ...base, ear: 'round', tail: 'fluffy', legs: 'stub' };
    case 'seal':
      return { ...base, ear: 'none', tail: 'fin', legs: 'flipper', eyeGap: 0.35 };
    case 'penguin':
      return { ...base, ear: 'none', tail: 'fin', legs: 'stub' };
    case 'bear':
      return { ...base, ear: 'round', tail: 'none', legs: 'quad', eyeGap: 0.3 };
    case 'deer':
      return { ...base, ear: 'tuft', tail: 'thin', legs: 'quad', eyeGap: 0.36 };
    case 'ram':
      return { ...base, ear: 'horn', tail: 'thin', legs: 'quad' };
    case 'horse':
      return { ...base, ear: 'tuft', tail: 'fluffy', legs: 'quad', hasMane: bit(1) };
    case 'boar':
      return { ...base, ear: 'round', tail: 'thin', legs: 'quad', eyeGap: 0.28 };
    case 'mole':
      return { ...base, ear: 'none', tail: 'thin', legs: 'stub', eyeGap: 0.26 };
    case 'armadillo':
      return { ...base, ear: 'round', tail: 'thin', legs: 'stub', hasShell: true };
    case 'dragon':
      return { ...base, ear: 'horn', tail: bit(2) ? 'flame' : 'thin', legs: 'quad', hasWings: true };
    case 'newt':
      return { ...base, ear: 'none', tail: 'flame', legs: 'stub' };
    case 'imp':
      return { ...base, ear: bit(1) ? 'pointy' : 'horn', tail: 'curl', legs: 'stub', hasWings: bit(4) };
    default:
      return { ...base, ear: bit(1) ? 'round' : 'none', tail: bit(2) ? 'curl' : 'none', legs: 'stub' };
  }
}

function drawCuteEyes(
  g: Phaser.GameObjects.Graphics,
  lx: number,
  ly: number,
  rx: number,
  ry: number,
  eyeR: number,
  spooky = false,
) {
  if (spooky) {
    // Hollow / glowing ghost eyes
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(lx, ly, eyeR * 1.1);
    g.fillCircle(rx, ry, eyeR * 1.1);
    g.fillStyle(0x7e57c2, 0.85);
    g.fillCircle(lx, ly, eyeR * 0.55);
    g.fillCircle(rx, ry, eyeR * 0.55);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(lx - eyeR * 0.2, ly - eyeR * 0.25, eyeR * 0.22);
    g.fillCircle(rx - eyeR * 0.2, ry - eyeR * 0.25, eyeR * 0.22);
    return;
  }
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

function drawEars(
  g: Phaser.GameObjects.Graphics,
  style: EarStyle,
  cx: number,
  headY: number,
  headR: number,
  body: number,
  accent: number,
  dark: number,
) {
  switch (style) {
    case 'pointy':
      g.fillStyle(body, 1);
      g.fillTriangle(cx - headR * 0.75, headY - headR * 0.2, cx - headR * 0.5, headY - headR * 1.2, cx - headR * 0.2, headY - headR * 0.4);
      g.fillTriangle(cx + headR * 0.75, headY - headR * 0.2, cx + headR * 0.5, headY - headR * 1.2, cx + headR * 0.2, headY - headR * 0.4);
      g.fillStyle(accent, 0.9);
      g.fillTriangle(cx - headR * 0.58, headY - headR * 0.35, cx - headR * 0.5, headY - headR * 0.95, cx - headR * 0.35, headY - headR * 0.45);
      g.fillTriangle(cx + headR * 0.58, headY - headR * 0.35, cx + headR * 0.5, headY - headR * 0.95, cx + headR * 0.35, headY - headR * 0.45);
      break;
    case 'round':
      sphere(g, cx - headR * 0.75, headY - headR * 0.55, headR * 0.32, body);
      sphere(g, cx + headR * 0.75, headY - headR * 0.55, headR * 0.32, body);
      break;
    case 'floppy':
      g.fillStyle(body, 1);
      g.fillEllipse(cx - headR * 0.85, headY + headR * 0.05, headR * 0.45, headR * 0.7);
      g.fillEllipse(cx + headR * 0.85, headY + headR * 0.05, headR * 0.45, headR * 0.7);
      g.fillStyle(accent, 0.5);
      g.fillEllipse(cx - headR * 0.85, headY + headR * 0.1, headR * 0.22, headR * 0.4);
      g.fillEllipse(cx + headR * 0.85, headY + headR * 0.1, headR * 0.22, headR * 0.4);
      break;
    case 'tuft':
      g.fillStyle(body, 1);
      g.fillEllipse(cx - headR * 0.65, headY - headR * 0.85, headR * 0.28, headR * 0.45);
      g.fillEllipse(cx + headR * 0.65, headY - headR * 0.85, headR * 0.28, headR * 0.45);
      break;
    case 'horn':
      g.fillStyle(accent, 1);
      g.fillTriangle(cx - headR * 0.35, headY - headR * 0.55, cx - headR * 0.55, headY - headR * 1.35, cx - headR * 0.05, headY - headR * 0.7);
      g.fillTriangle(cx + headR * 0.35, headY - headR * 0.55, cx + headR * 0.55, headY - headR * 1.35, cx + headR * 0.05, headY - headR * 0.7);
      g.fillStyle(dark, 0.4);
      g.fillTriangle(cx - headR * 0.28, headY - headR * 0.65, cx - headR * 0.42, headY - headR * 1.15, cx - headR * 0.12, headY - headR * 0.75);
      break;
    case 'antenna':
      g.lineStyle(Math.max(2, headR * 0.1), dark, 1);
      g.lineBetween(cx - headR * 0.25, headY - headR * 0.7, cx - headR * 0.65, headY - headR * 1.35);
      g.lineBetween(cx + headR * 0.25, headY - headR * 0.7, cx + headR * 0.65, headY - headR * 1.35);
      sphere(g, cx - headR * 0.65, headY - headR * 1.35, headR * 0.14, accent);
      sphere(g, cx + headR * 0.65, headY - headR * 1.35, headR * 0.14, accent);
      break;
    default:
      break;
  }
}

function drawTail(
  g: Phaser.GameObjects.Graphics,
  style: TailStyle,
  cx: number,
  bodyY: number,
  R: number,
  body: number,
  accent: number,
) {
  switch (style) {
    case 'flame':
      g.fillStyle(accent, 1);
      g.fillTriangle(cx + R * 0.9, bodyY, cx + R * 1.7, bodyY - R * 0.55, cx + R * 1.15, bodyY + R * 0.25);
      g.fillStyle(0xfff59d, 0.95);
      g.fillTriangle(cx + R * 1.05, bodyY - R * 0.05, cx + R * 1.45, bodyY - R * 0.35, cx + R * 1.15, bodyY + R * 0.1);
      break;
    case 'fluffy':
      sphere(g, cx + R * 1.15, bodyY - R * 0.05, R * 0.42, body);
      sphere(g, cx + R * 1.35, bodyY - R * 0.15, R * 0.28, accent);
      break;
    case 'thin':
      g.fillStyle(body, 1);
      g.fillEllipse(cx + R * 1.1, bodyY + R * 0.1, R * 0.85, R * 0.22);
      break;
    case 'fin':
      g.fillStyle(accent, 1);
      g.fillTriangle(cx + R * 0.7, bodyY, cx + R * 1.55, bodyY - R * 0.55, cx + R * 1.55, bodyY + R * 0.55);
      break;
    case 'stinger':
      g.fillStyle(accent, 1);
      g.fillTriangle(cx, bodyY + R * 0.9, cx - R * 0.2, bodyY + R * 0.45, cx + R * 0.2, bodyY + R * 0.45);
      break;
    case 'curl':
      g.fillStyle(body, 1);
      g.fillEllipse(cx + R * 0.95, bodyY + R * 0.15, R * 0.55, R * 0.28);
      g.fillCircle(cx + R * 1.25, bodyY - R * 0.05, R * 0.22);
      break;
    case 'ghost':
      g.fillStyle(body, 0.7);
      for (let i = 0; i < 4; i++) {
        g.fillEllipse(cx - R * 0.45 + i * R * 0.3, bodyY + R * 0.85, R * 0.28, R * 0.45);
      }
      break;
    default:
      break;
  }
}

function drawLegs(
  g: Phaser.GameObjects.Graphics,
  style: LegStyle,
  cx: number,
  bodyY: number,
  R: number,
  dark: number,
  accent: number,
) {
  switch (style) {
    case 'stub':
      g.fillStyle(dark, 1);
      g.fillEllipse(cx - R * 0.4, bodyY + R * 0.7, R * 0.32, R * 0.2);
      g.fillEllipse(cx + R * 0.4, bodyY + R * 0.7, R * 0.32, R * 0.2);
      break;
    case 'quad':
      g.fillStyle(dark, 1);
      g.fillRoundedRect(cx - R * 0.75, bodyY + R * 0.25, R * 0.28, R * 0.7, R * 0.1);
      g.fillRoundedRect(cx + R * 0.45, bodyY + R * 0.25, R * 0.28, R * 0.7, R * 0.1);
      g.fillRoundedRect(cx - R * 0.35, bodyY + R * 0.35, R * 0.24, R * 0.55, R * 0.08);
      g.fillRoundedRect(cx + R * 0.1, bodyY + R * 0.35, R * 0.24, R * 0.55, R * 0.08);
      break;
    case 'bird':
      g.fillStyle(accent, 1);
      g.fillRoundedRect(cx - R * 0.35, bodyY + R * 0.55, R * 0.18, R * 0.35, 2);
      g.fillRoundedRect(cx + R * 0.18, bodyY + R * 0.55, R * 0.18, R * 0.35, 2);
      g.fillTriangle(cx - R * 0.25, bodyY + R * 0.9, cx - R * 0.55, bodyY + R * 1.05, cx - R * 0.15, bodyY + R * 1.0);
      g.fillTriangle(cx + R * 0.28, bodyY + R * 0.9, cx + R * 0.55, bodyY + R * 1.05, cx + R * 0.15, bodyY + R * 1.0);
      break;
    case 'flipper':
      g.fillStyle(dark, 1);
      g.fillEllipse(cx - R * 0.7, bodyY + R * 0.35, R * 0.55, R * 0.22);
      g.fillEllipse(cx + R * 0.7, bodyY + R * 0.35, R * 0.55, R * 0.22);
      break;
    case 'crab':
      // Sideways legs + big claws
      g.fillStyle(dark, 1);
      for (const side of [-1, 1]) {
        g.fillEllipse(cx + side * R * 0.85, bodyY + R * 0.35, R * 0.55, R * 0.18);
        g.fillEllipse(cx + side * R * 1.05, bodyY + R * 0.55, R * 0.4, R * 0.14);
      }
      g.fillStyle(accent, 1);
      g.fillEllipse(cx - R * 1.15, bodyY - R * 0.15, R * 0.35, R * 0.25);
      g.fillEllipse(cx + R * 1.15, bodyY - R * 0.15, R * 0.35, R * 0.25);
      g.fillTriangle(cx - R * 1.35, bodyY - R * 0.35, cx - R * 1.7, bodyY, cx - R * 1.2, bodyY + R * 0.1);
      g.fillTriangle(cx + R * 1.35, bodyY - R * 0.35, cx + R * 1.7, bodyY, cx + R * 1.2, bodyY + R * 0.1);
      break;
    case 'spider': {
      g.lineStyle(Math.max(2, R * 0.12), dark, 1);
      for (let i = 0; i < 4; i++) {
        const ang = -0.5 + i * 0.35;
        const len = R * (1.1 + (i % 2) * 0.2);
        g.lineBetween(cx - R * 0.3, bodyY, cx - Math.cos(ang) * len - R * 0.2, bodyY + Math.sin(ang) * len + R * 0.5);
        g.lineBetween(cx + R * 0.3, bodyY, cx + Math.cos(ang) * len + R * 0.2, bodyY + Math.sin(ang) * len + R * 0.5);
      }
      break;
    }
    default:
      break;
  }
}

function drawWings(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  R: number,
  accent: number,
  moth: boolean,
) {
  if (moth) {
    g.fillStyle(accent, 0.55);
    g.fillEllipse(cx - R * 1.05, cy - R * 0.15, R * 0.95, R * 0.55);
    g.fillEllipse(cx + R * 1.05, cy - R * 0.15, R * 0.95, R * 0.55);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(cx - R * 1.05, cy - R * 0.25, R * 0.4, R * 0.22);
    g.fillEllipse(cx + R * 1.05, cy - R * 0.25, R * 0.4, R * 0.22);
  } else {
    g.fillStyle(accent, 0.9);
    g.fillTriangle(cx - R * 0.35, cy, cx - R * 1.45, cy - R * 0.85, cx - R * 1.05, cy + R * 0.45);
    g.fillTriangle(cx + R * 0.35, cy, cx + R * 1.45, cy - R * 0.85, cx + R * 1.05, cy + R * 0.45);
    g.fillStyle(0xffffff, 0.28);
    g.fillTriangle(cx - R * 0.45, cy - R * 0.05, cx - R * 1.15, cy - R * 0.5, cx - R * 0.85, cy + R * 0.15);
  }
}

function drawPatterns(
  g: Phaser.GameObjects.Graphics,
  build: CreatureBuild,
  cx: number,
  headY: number,
  bodyY: number,
  headR: number,
  R: number,
  accent: number,
  dark: number,
) {
  if (build.spots) {
    g.fillStyle(dark, 0.35);
    g.fillCircle(cx - R * 0.25, bodyY - R * 0.05, R * 0.12);
    g.fillCircle(cx + R * 0.3, bodyY + R * 0.15, R * 0.1);
    g.fillCircle(cx, bodyY + R * 0.05, R * 0.08);
  }
  if (build.stripes) {
    g.lineStyle(Math.max(1.5, R * 0.08), dark, 0.35);
    g.lineBetween(cx - headR * 0.5, headY - headR * 0.2, cx - headR * 0.15, headY + headR * 0.35);
    g.lineBetween(cx + headR * 0.15, headY - headR * 0.25, cx + headR * 0.45, headY + headR * 0.3);
  }
  if (build.hasMane) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sphere(g, cx + Math.cos(a) * headR * 1.05, headY + Math.sin(a) * headR * 0.95, headR * 0.28, accent);
    }
  }
  if (build.hasShell) {
    g.fillStyle(accent, 1);
    g.fillEllipse(cx, bodyY - R * 0.05, R * 1.15, R * 0.85);
    g.fillStyle(shade(accent, 0.25), 0.6);
    g.fillEllipse(cx - R * 0.2, bodyY - R * 0.25, R * 0.45, R * 0.3);
    g.lineStyle(Math.max(1.5, R * 0.06), dark, 0.4);
    g.strokeEllipse(cx, bodyY - R * 0.05, R * 1.15, R * 0.85);
  }
}

/**
 * Main entry — keep the cute BDSP chibi vibe, but silhouette by archetype + parts.
 */
export function drawCreatureModular(g: Phaser.GameObjects.Graphics, species: Species, size: number) {
  const type = species.types[0] as ElementType;
  const paint = TYPE_PAINT[type];
  const seed = hashString(species.id);
  const hueJitter = (((seed >> 5) & 0xff) / 255 - 0.5) * 0.12;
  const body = shade(paint.body, hueJitter);
  const accent = paint.accent;
  const belly = paint.belly;
  const dark = shade(body, -0.28);

  const arch = pickArchetype(species.name, seed);
  const build = buildFromArchetype(arch, seed);
  const stageScale = 1 + species.stage * 0.1;

  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const R = size * 0.19 * stageScale;

  ovalShadow(g, cx, size * 0.9, R * (build.legs === 'spider' || build.legs === 'crab' ? 2.8 : 2.3), R * 0.55, 0.3);

  // Type accent props (subtle, behind body)
  if (type === 'fire' && build.tail !== 'flame') {
    g.fillStyle(accent, 0.85);
    g.fillTriangle(cx, cy - R * 1.55, cx - R * 0.35, cy - R * 0.8, cx + R * 0.35, cy - R * 0.8);
  }
  if (type === 'darkness' && !build.hasCloak) {
    g.fillStyle(dark, 0.7);
    g.fillTriangle(cx - R * 0.45, cy - R * 0.9, cx - R * 0.2, cy - R * 1.4, cx - R * 0.05, cy - R * 0.9);
    g.fillTriangle(cx + R * 0.45, cy - R * 0.9, cx + R * 0.2, cy - R * 1.4, cx + R * 0.05, cy - R * 0.9);
  }

  if (build.hasWings) {
    drawWings(g, cx, cy, R, accent, arch === 'moth');
  }

  // --- Body by archetype ---
  const bodyY = cy + R * 0.4;
  const headR = R * (arch === 'snake' || arch === 'fish' ? 0.75 : 0.95);
  const headY = arch === 'snake' || arch === 'fish' ? cy - R * 0.15 : cy - R * 0.35;

  if (arch === 'snake') {
    // Coiled body segments
    g.fillStyle(body, 1);
    g.fillEllipse(cx + R * 0.35, bodyY + R * 0.35, R * 1.5, R * 0.55);
    g.fillEllipse(cx - R * 0.15, bodyY + R * 0.05, R * 1.2, R * 0.5);
    sphere(g, cx - R * 0.35, headY + R * 0.15, R * 0.55, body);
    g.fillStyle(belly, 1).fillEllipse(cx - R * 0.1, bodyY + R * 0.2, R * 0.7, R * 0.28);
  } else if (arch === 'ghost' || arch === 'jelly') {
    sphere(g, cx, headY + R * 0.25, headR * 1.05, body);
    g.fillStyle(body, 0.85);
    for (let i = 0; i < 5; i++) {
      g.fillEllipse(cx - R * 0.7 + i * R * 0.35, bodyY + R * 0.55, R * 0.32, R * 0.55);
    }
    if (arch === 'jelly') {
      g.fillStyle(accent, 0.45);
      g.fillEllipse(cx, headY + R * 0.1, headR * 1.3, headR * 0.7);
    }
  } else if (arch === 'fish') {
    g.fillStyle(body, 1).fillEllipse(cx, cy + R * 0.1, R * 1.4, R * 0.9);
    g.fillStyle(belly, 1).fillEllipse(cx, cy + R * 0.25, R * 0.9, R * 0.5);
    sphere(g, cx - R * 0.55, headY + R * 0.2, headR * 0.75, body);
  } else if (arch === 'spider') {
    sphere(g, cx, bodyY + R * 0.15, R * 0.75, body); // abdomen
    sphere(g, cx, headY + R * 0.25, R * 0.55, body); // cephalothorax
  } else if (arch === 'crab') {
    g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 1.3, R * 0.85);
    g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.15, R * 0.8, R * 0.45);
    sphere(g, cx, headY + R * 0.35, headR * 0.7, body);
  } else if (arch === 'frog') {
    sphere(g, cx, bodyY, R * 0.95, body);
    g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.25, R * 0.9, R * 0.65);
    // Eye bumps
    sphere(g, cx - headR * 0.55, headY - headR * 0.15, headR * 0.42, body);
    sphere(g, cx + headR * 0.55, headY - headR * 0.15, headR * 0.42, body);
  } else {
    // Default chibi body + oversized head
    sphere(g, cx, bodyY, R * (arch === 'bear' ? 0.9 : 0.7), body);
    g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.18, R * 0.9, R * 0.55);
    if (arch !== 'turtle' || !build.hasShell) {
      // head drawn below after shell/patterns order tweaks
    }
  }

  drawLegs(g, build.legs, cx, bodyY, R, dark, accent);
  drawTail(g, build.tail, cx, bodyY, R, body, accent);

  // Head (most archetypes)
  if (arch !== 'snake' && arch !== 'fish' && arch !== 'ghost' && arch !== 'jelly' && arch !== 'spider' && arch !== 'frog') {
    sphere(g, cx, headY, headR, body);
  } else if (arch === 'frog') {
    // face sits between eye bumps
  } else if (arch === 'snake' || arch === 'fish') {
    // head already part of body draw; reinforce
    sphere(g, arch === 'fish' ? cx - R * 0.55 : cx - R * 0.35, headY + R * 0.1, headR * 0.85, body);
  } else if (arch === 'ghost' || arch === 'jelly') {
    // head is the body orb
  }

  drawEars(g, build.ear, cx, headY, headR, body, accent, dark);
  drawPatterns(g, build, cx, headY, bodyY, headR, R, accent, dark);

  // Beak for birds
  if (arch === 'bird') {
    g.fillStyle(accent, 1);
    g.fillTriangle(cx, headY + headR * 0.15, cx + headR * 0.55, headY, cx, headY - headR * 0.05);
    g.fillTriangle(cx, headY - headR * 1.15, cx - headR * 0.2, headY - headR * 0.7, cx + headR * 0.2, headY - headR * 0.7);
  }

  // Boar tusks
  if (arch === 'boar') {
    g.fillStyle(0xfff8e1, 1);
    g.fillTriangle(cx - headR * 0.35, headY + headR * 0.35, cx - headR * 0.55, headY + headR * 0.7, cx - headR * 0.15, headY + headR * 0.5);
    g.fillTriangle(cx + headR * 0.35, headY + headR * 0.35, cx + headR * 0.55, headY + headR * 0.7, cx + headR * 0.15, headY + headR * 0.5);
  }

  // Face
  const eyeY = arch === 'frog' ? headY - headR * 0.15 : headY - headR * 0.02;
  const eyeR = headR * (arch === 'spider' ? 0.14 : 0.22);
  const gap = headR * build.eyeGap;
  const spooky = arch === 'ghost' || (type === 'darkness' && (arch === 'imp' || arch === 'jelly'));

  if (arch === 'spider') {
    // Multiple eyes
    drawCuteEyes(g, cx - gap, eyeY, cx + gap, eyeY, eyeR);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - gap * 1.6, eyeY + eyeR * 0.8, eyeR * 0.7);
    g.fillCircle(cx + gap * 1.6, eyeY + eyeR * 0.8, eyeR * 0.7);
    g.fillStyle(0x263238, 1);
    g.fillCircle(cx - gap * 1.6, eyeY + eyeR * 0.8, eyeR * 0.35);
    g.fillCircle(cx + gap * 1.6, eyeY + eyeR * 0.8, eyeR * 0.35);
  } else if (arch === 'frog') {
    drawCuteEyes(g, cx - headR * 0.55, eyeY, cx + headR * 0.55, eyeY, eyeR * 1.1);
  } else {
    const hx = arch === 'fish' ? cx - R * 0.55 : arch === 'snake' ? cx - R * 0.35 : cx;
    drawCuteEyes(g, hx - gap, eyeY, hx + gap, eyeY, eyeR, spooky);
  }

  // Blush + smile (skip for very spooky/spiders a bit)
  if (arch !== 'spider') {
    const hx = arch === 'fish' ? cx - R * 0.55 : arch === 'snake' ? cx - R * 0.35 : cx;
    g.fillStyle(0xff8a80, arch === 'ghost' ? 0.25 : 0.45);
    g.fillCircle(hx - headR * 0.65, headY + headR * 0.28, headR * 0.15);
    g.fillCircle(hx + headR * 0.65, headY + headR * 0.28, headR * 0.15);
    g.lineStyle(Math.max(1.5, headR * 0.08), dark, 0.65);
    g.beginPath();
    g.arc(hx, headY + headR * 0.32, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();
  }

  // Stage flourish: bigger creatures get a tiny crown spark for finals
  if (species.stage >= 2) {
    g.fillStyle(0xfff59d, 0.9);
    g.fillCircle(cx, headY - headR * 1.15, Math.max(2, R * 0.12));
  }
}
