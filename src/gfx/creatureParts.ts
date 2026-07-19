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
 * Archetype from species name → seeded body plan + mix of ears/tails/legs/snouts/extras
 * so cats ≠ dogs ≠ lions ≠ snakes ≠ ghosts ≠ crabs, etc.
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

type EarStyle = 'none' | 'pointy' | 'round' | 'floppy' | 'tuft' | 'horn' | 'antenna' | 'long' | 'swept';
type TailStyle =
  | 'none'
  | 'flame'
  | 'fluffy'
  | 'thin'
  | 'fin'
  | 'stinger'
  | 'curl'
  | 'ghost'
  | 'bushy'
  | 'plume'
  | 'rattle'
  | 'segment';
type LegStyle = 'none' | 'stub' | 'quad' | 'bird' | 'crab' | 'spider' | 'flipper' | 'digitigrade' | 'plantigrade';
type SnoutStyle = 'none' | 'cat' | 'dog' | 'fox' | 'boar' | 'beak' | 'flat' | 'long';
type BodyPlan =
  | 'chibi' // round body + big head
  | 'sleek' // cat-like elongated
  | 'stocky' // dog/bear compact
  | 'maneBeast' // lion broad + big head
  | 'coil' // snake
  | 'wraith' // ghost / jelly floating
  | 'arachnid' // spider dual-orb
  | 'crustacean' // crab wide
  | 'amphibian' // frog squat
  | 'aquatic' // fish horizontal
  | 'avian' // bird upright oval
  | 'shelled' // turtle / beetle dome
  | 'wingedFurry' // bat
  | 'drake' // dragon long neck
  | 'lanky'; // deer / horse taller

interface CreatureBuild {
  archetype: Archetype;
  plan: BodyPlan;
  ear: EarStyle;
  tail: TailStyle;
  legs: LegStyle;
  snout: SnoutStyle;
  hasMane: boolean;
  hasShell: boolean;
  hasWings: boolean;
  hasCloak: boolean;
  spots: boolean;
  stripes: boolean;
  eyeGap: number;
  /** Seeded 0.85..1.15 stretch on body width */
  bodyW: number;
  /** Seeded 0.85..1.15 stretch on body height */
  bodyH: number;
  /** Head size relative to default */
  headScale: number;
  /** Horizontal lean for coils / aquatic (−0.2..0.2) */
  lean: number;
  multiEyes: boolean;
  fang: boolean;
  whiskers: boolean;
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

function pickFrom<T>(seed: number, shift: number, options: T[]): T {
  return options[(seed >>> shift) % options.length];
}

export function pickArchetype(name: string, seed: number): Archetype {
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
  const stretch = (shift: number) => 0.88 + (((seed >>> shift) & 7) / 7) * 0.28;
  const lean = (((seed >>> 12) & 7) / 7 - 0.5) * 0.35;

  const base: CreatureBuild = {
    archetype: arch,
    plan: 'chibi',
    ear: 'none',
    tail: 'none',
    legs: 'stub',
    snout: 'none',
    hasMane: false,
    hasShell: false,
    hasWings: false,
    hasCloak: false,
    spots: bit(3),
    stripes: bit(5),
    eyeGap: 0.32 + ((seed >>> 8) & 7) * 0.015,
    bodyW: stretch(4),
    bodyH: stretch(7),
    headScale: 1,
    lean: 0,
    multiEyes: false,
    fang: false,
    whiskers: false,
  };

  switch (arch) {
    case 'snake':
      return {
        ...base,
        plan: 'coil',
        ear: 'none',
        tail: pickFrom(seed, 2, ['none', 'rattle', 'stinger', 'segment']),
        legs: 'none',
        snout: pickFrom(seed, 4, ['none', 'flat', 'long']),
        eyeGap: 0.38,
        bodyW: 1.05 + (((seed >>> 4) & 3) * 0.08),
        bodyH: 0.9,
        lean,
        stripes: bit(1) || bit(5),
        fang: bit(6),
      };
    case 'ghost':
      return {
        ...base,
        plan: 'wraith',
        ear: pickFrom(seed, 1, ['none', 'tuft', 'horn']),
        tail: 'ghost',
        legs: 'none',
        hasCloak: true,
        eyeGap: 0.4,
        bodyW: stretch(2),
        bodyH: 1.05 + (((seed >>> 6) & 3) * 0.08),
        fang: bit(3),
      };
    case 'spider':
      return {
        ...base,
        plan: 'arachnid',
        ear: 'none',
        tail: pickFrom(seed, 2, ['stinger', 'none', 'segment']),
        legs: 'spider',
        eyeGap: 0.26,
        multiEyes: true,
        bodyW: stretch(3),
        fang: true,
      };
    case 'crab':
      return {
        ...base,
        plan: 'crustacean',
        ear: 'none',
        tail: 'none',
        legs: 'crab',
        hasShell: true,
        eyeGap: 0.42,
        bodyW: 1.15 + (((seed >>> 4) & 3) * 0.06),
        bodyH: 0.85,
        snout: 'none',
      };
    case 'cat':
      return {
        ...base,
        plan: 'sleek',
        ear: pickFrom(seed, 2, ['pointy', 'tuft', 'swept']),
        tail: pickFrom(seed, 4, ['thin', 'fluffy', 'curl']),
        legs: 'digitigrade',
        snout: 'cat',
        eyeGap: 0.34,
        bodyW: 1.15 + (((seed >>> 5) & 3) * 0.05),
        bodyH: 0.82,
        headScale: 0.95,
        whiskers: true,
        stripes: bit(1) || bit(5),
      };
    case 'fox':
      return {
        ...base,
        plan: 'sleek',
        ear: 'pointy',
        tail: pickFrom(seed, 2, ['bushy', 'fluffy']),
        legs: 'digitigrade',
        snout: 'fox',
        eyeGap: 0.33,
        bodyW: 1.1,
        bodyH: 0.85,
        headScale: 0.92,
        whiskers: bit(3),
      };
    case 'dog':
      return {
        ...base,
        plan: 'stocky',
        ear: pickFrom(seed, 2, ['floppy', 'round', 'pointy']),
        tail: pickFrom(seed, 4, ['curl', 'fluffy', 'thin']),
        legs: 'plantigrade',
        snout: 'dog',
        bodyW: 0.95,
        bodyH: 1.05,
        headScale: 1.05,
      };
    case 'lion':
      return {
        ...base,
        plan: 'maneBeast',
        ear: 'round',
        tail: pickFrom(seed, 2, ['fluffy', 'thin']),
        legs: 'plantigrade',
        snout: 'cat',
        hasMane: true,
        eyeGap: 0.3,
        bodyW: 1.1,
        bodyH: 1.05,
        headScale: 1.12,
      };
    case 'bird':
      return {
        ...base,
        plan: 'avian',
        ear: 'none',
        tail: pickFrom(seed, 2, ['fin', 'plume']),
        legs: 'bird',
        snout: 'beak',
        hasWings: true,
        bodyW: 0.85,
        bodyH: 1.15,
        headScale: 0.9,
      };
    case 'bat':
      return {
        ...base,
        plan: 'wingedFurry',
        ear: pickFrom(seed, 2, ['pointy', 'long']),
        tail: 'none',
        legs: 'stub',
        snout: 'flat',
        hasWings: true,
        eyeGap: 0.36,
        fang: true,
        bodyW: 0.9,
        bodyH: 0.95,
      };
    case 'frog':
      return {
        ...base,
        plan: 'amphibian',
        ear: 'none',
        tail: 'none',
        legs: 'stub',
        snout: 'flat',
        eyeGap: 0.42,
        bodyW: 1.2,
        bodyH: 0.85,
        spots: bit(2) || bit(3),
      };
    case 'turtle':
      return {
        ...base,
        plan: 'shelled',
        ear: 'none',
        tail: 'thin',
        legs: 'stub',
        snout: 'flat',
        hasShell: true,
        bodyW: 1.15,
        bodyH: 0.9,
        headScale: 0.85,
      };
    case 'beetle':
      return {
        ...base,
        plan: 'shelled',
        ear: 'antenna',
        tail: 'none',
        legs: 'stub',
        hasShell: true,
        bodyW: 1.05,
        bodyH: 0.95,
        headScale: 0.8,
      };
    case 'moth':
      return {
        ...base,
        plan: 'chibi',
        ear: 'antenna',
        tail: 'none',
        legs: 'stub',
        hasWings: true,
        bodyW: 0.85,
        bodyH: 1.05,
        spots: true,
      };
    case 'fish':
      return {
        ...base,
        plan: 'aquatic',
        ear: 'none',
        tail: 'fin',
        legs: 'none',
        snout: pickFrom(seed, 3, ['none', 'flat', 'long']),
        lean,
        bodyW: 1.35,
        bodyH: 0.75,
        headScale: 0.85,
      };
    case 'jelly':
      return {
        ...base,
        plan: 'wraith',
        ear: 'none',
        tail: 'ghost',
        legs: 'none',
        hasCloak: true,
        eyeGap: 0.36,
        bodyW: stretch(2),
        bodyH: 1.1,
      };
    case 'otter':
      return {
        ...base,
        plan: 'sleek',
        ear: 'round',
        tail: pickFrom(seed, 2, ['fluffy', 'thin']),
        legs: 'stub',
        snout: 'flat',
        bodyW: 1.2,
        bodyH: 0.8,
        whiskers: true,
      };
    case 'seal':
      return {
        ...base,
        plan: 'stocky',
        ear: 'none',
        tail: 'fin',
        legs: 'flipper',
        snout: 'flat',
        eyeGap: 0.35,
        bodyW: 1.25,
        bodyH: 0.85,
      };
    case 'penguin':
      return {
        ...base,
        plan: 'avian',
        ear: 'none',
        tail: 'fin',
        legs: 'stub',
        snout: 'beak',
        bodyW: 0.8,
        bodyH: 1.2,
        headScale: 0.95,
      };
    case 'bear':
      return {
        ...base,
        plan: 'stocky',
        ear: 'round',
        tail: 'none',
        legs: 'plantigrade',
        snout: 'dog',
        eyeGap: 0.3,
        bodyW: 1.15,
        bodyH: 1.1,
        headScale: 1.1,
      };
    case 'deer':
      return {
        ...base,
        plan: 'lanky',
        ear: pickFrom(seed, 2, ['tuft', 'long']),
        tail: 'thin',
        legs: 'digitigrade',
        snout: 'long',
        eyeGap: 0.36,
        bodyW: 0.85,
        bodyH: 1.2,
        headScale: 0.88,
      };
    case 'ram':
      return {
        ...base,
        plan: 'stocky',
        ear: 'horn',
        tail: 'thin',
        legs: 'plantigrade',
        snout: 'flat',
        bodyW: 1.05,
        bodyH: 1.05,
        headScale: 1.05,
      };
    case 'horse':
      return {
        ...base,
        plan: 'lanky',
        ear: 'tuft',
        tail: pickFrom(seed, 2, ['fluffy', 'plume']),
        legs: 'digitigrade',
        snout: 'long',
        hasMane: bit(1),
        bodyW: 0.9,
        bodyH: 1.25,
        headScale: 0.9,
      };
    case 'boar':
      return {
        ...base,
        plan: 'stocky',
        ear: 'round',
        tail: 'thin',
        legs: 'plantigrade',
        snout: 'boar',
        eyeGap: 0.28,
        bodyW: 1.2,
        bodyH: 0.95,
        fang: true,
      };
    case 'mole':
      return {
        ...base,
        plan: 'stocky',
        ear: 'none',
        tail: 'thin',
        legs: 'stub',
        snout: 'long',
        eyeGap: 0.22,
        bodyW: 1.15,
        bodyH: 0.8,
        headScale: 0.9,
      };
    case 'armadillo':
      return {
        ...base,
        plan: 'shelled',
        ear: 'round',
        tail: 'segment',
        legs: 'stub',
        snout: 'long',
        hasShell: true,
        bodyW: 1.2,
        bodyH: 0.85,
      };
    case 'dragon':
      return {
        ...base,
        plan: 'drake',
        ear: pickFrom(seed, 2, ['horn', 'swept']),
        tail: pickFrom(seed, 4, ['flame', 'thin', 'segment']),
        legs: 'quad',
        snout: 'long',
        hasWings: true,
        fang: true,
        bodyW: 1.1,
        bodyH: 1.05,
        headScale: 0.95,
      };
    case 'newt':
      return {
        ...base,
        plan: 'sleek',
        ear: 'none',
        tail: pickFrom(seed, 2, ['flame', 'thin']),
        legs: 'stub',
        snout: 'flat',
        bodyW: 1.25,
        bodyH: 0.75,
      };
    case 'imp':
      return {
        ...base,
        plan: 'chibi',
        ear: pickFrom(seed, 1, ['pointy', 'horn', 'tuft']),
        tail: pickFrom(seed, 3, ['curl', 'stinger', 'thin']),
        legs: 'stub',
        snout: 'none',
        hasWings: bit(4),
        fang: bit(2),
        bodyW: stretch(5),
        bodyH: stretch(6),
      };
    default:
      return {
        ...base,
        ear: pickFrom(seed, 1, ['round', 'none', 'tuft']),
        tail: pickFrom(seed, 2, ['curl', 'none', 'thin']),
        legs: 'stub',
        bodyW: stretch(4),
        bodyH: stretch(7),
      };
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
  g.fillCircle(rx - eyeR * 0.28, ly - eyeR * 0.28, eyeR * 0.3);
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
    case 'swept':
      g.fillStyle(body, 1);
      g.fillTriangle(cx - headR * 0.9, headY - headR * 0.1, cx - headR * 0.85, headY - headR * 1.05, cx - headR * 0.25, headY - headR * 0.35);
      g.fillTriangle(cx + headR * 0.9, headY - headR * 0.1, cx + headR * 0.85, headY - headR * 1.05, cx + headR * 0.25, headY - headR * 0.35);
      break;
    case 'long':
      g.fillStyle(body, 1);
      g.fillEllipse(cx - headR * 0.7, headY - headR * 0.95, headR * 0.28, headR * 0.7);
      g.fillEllipse(cx + headR * 0.7, headY - headR * 0.95, headR * 0.28, headR * 0.7);
      g.fillStyle(accent, 0.55);
      g.fillEllipse(cx - headR * 0.7, headY - headR * 0.95, headR * 0.12, headR * 0.4);
      g.fillEllipse(cx + headR * 0.7, headY - headR * 0.95, headR * 0.12, headR * 0.4);
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
  dark: number,
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
    case 'bushy':
      sphere(g, cx + R * 0.95, bodyY, R * 0.38, body);
      sphere(g, cx + R * 1.25, bodyY - R * 0.2, R * 0.48, body);
      sphere(g, cx + R * 1.5, bodyY - R * 0.1, R * 0.32, accent);
      break;
    case 'plume':
      g.fillStyle(accent, 0.95);
      g.fillEllipse(cx + R * 0.95, bodyY - R * 0.35, R * 0.35, R * 0.7);
      g.fillEllipse(cx + R * 1.2, bodyY - R * 0.15, R * 0.28, R * 0.55);
      g.fillEllipse(cx + R * 1.05, bodyY + R * 0.1, R * 0.25, R * 0.45);
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
    case 'rattle':
      g.fillStyle(body, 1);
      g.fillEllipse(cx + R * 1.0, bodyY + R * 0.15, R * 0.7, R * 0.2);
      for (let i = 0; i < 3; i++) {
        sphere(g, cx + R * (1.25 + i * 0.22), bodyY + R * (0.05 - i * 0.08), R * 0.14, accent);
      }
      break;
    case 'segment':
      g.fillStyle(body, 1);
      for (let i = 0; i < 4; i++) {
        g.fillEllipse(cx + R * (0.85 + i * 0.28), bodyY + R * (0.1 - i * 0.05), R * 0.28, R * 0.2);
      }
      g.fillStyle(dark, 0.35);
      g.fillCircle(cx + R * 1.85, bodyY - R * 0.05, R * 0.12);
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
  bodyH: number,
) {
  const lift = (bodyH - 1) * R * 0.15;
  switch (style) {
    case 'stub':
      g.fillStyle(dark, 1);
      g.fillEllipse(cx - R * 0.4, bodyY + R * 0.7 + lift, R * 0.32, R * 0.2);
      g.fillEllipse(cx + R * 0.4, bodyY + R * 0.7 + lift, R * 0.32, R * 0.2);
      break;
    case 'quad':
      g.fillStyle(dark, 1);
      g.fillRoundedRect(cx - R * 0.75, bodyY + R * 0.25, R * 0.28, R * 0.7 + lift, R * 0.1);
      g.fillRoundedRect(cx + R * 0.45, bodyY + R * 0.25, R * 0.28, R * 0.7 + lift, R * 0.1);
      g.fillRoundedRect(cx - R * 0.35, bodyY + R * 0.35, R * 0.24, R * 0.55 + lift, R * 0.08);
      g.fillRoundedRect(cx + R * 0.1, bodyY + R * 0.35, R * 0.24, R * 0.55 + lift, R * 0.08);
      break;
    case 'digitigrade': {
      // Sleek cat/deer legs — thinner, longer
      g.fillStyle(dark, 1);
      const h = R * 0.85 + lift;
      g.fillRoundedRect(cx - R * 0.85, bodyY + R * 0.15, R * 0.18, h, R * 0.08);
      g.fillRoundedRect(cx + R * 0.65, bodyY + R * 0.15, R * 0.18, h, R * 0.08);
      g.fillRoundedRect(cx - R * 0.4, bodyY + R * 0.25, R * 0.16, h * 0.85, R * 0.07);
      g.fillRoundedRect(cx + R * 0.22, bodyY + R * 0.25, R * 0.16, h * 0.85, R * 0.07);
      break;
    }
    case 'plantigrade': {
      // Stocky dog/bear/lion paws
      g.fillStyle(dark, 1);
      const h = R * 0.6 + lift;
      g.fillRoundedRect(cx - R * 0.7, bodyY + R * 0.3, R * 0.32, h, R * 0.12);
      g.fillRoundedRect(cx + R * 0.38, bodyY + R * 0.3, R * 0.32, h, R * 0.12);
      g.fillRoundedRect(cx - R * 0.3, bodyY + R * 0.4, R * 0.28, h * 0.85, R * 0.1);
      g.fillRoundedRect(cx + R * 0.05, bodyY + R * 0.4, R * 0.28, h * 0.85, R * 0.1);
      g.fillStyle(accent, 0.55);
      g.fillEllipse(cx - R * 0.54, bodyY + R * 0.3 + h, R * 0.28, R * 0.12);
      g.fillEllipse(cx + R * 0.54, bodyY + R * 0.3 + h, R * 0.28, R * 0.12);
      break;
    }
    case 'bird':
      g.fillStyle(accent, 1);
      g.fillRoundedRect(cx - R * 0.35, bodyY + R * 0.55, R * 0.18, R * 0.35 + lift, 2);
      g.fillRoundedRect(cx + R * 0.18, bodyY + R * 0.55, R * 0.18, R * 0.35 + lift, 2);
      g.fillTriangle(cx - R * 0.25, bodyY + R * 0.9 + lift, cx - R * 0.55, bodyY + R * 1.05 + lift, cx - R * 0.15, bodyY + R * 1.0 + lift);
      g.fillTriangle(cx + R * 0.28, bodyY + R * 0.9 + lift, cx + R * 0.55, bodyY + R * 1.05 + lift, cx + R * 0.15, bodyY + R * 1.0 + lift);
      break;
    case 'flipper':
      g.fillStyle(dark, 1);
      g.fillEllipse(cx - R * 0.7, bodyY + R * 0.35, R * 0.55, R * 0.22);
      g.fillEllipse(cx + R * 0.7, bodyY + R * 0.35, R * 0.55, R * 0.22);
      break;
    case 'crab':
      g.fillStyle(dark, 1);
      for (const side of [-1, 1]) {
        g.fillEllipse(cx + side * R * 0.85, bodyY + R * 0.35, R * 0.55, R * 0.18);
        g.fillEllipse(cx + side * R * 1.05, bodyY + R * 0.55, R * 0.4, R * 0.14);
        g.fillEllipse(cx + side * R * 0.95, bodyY + R * 0.72, R * 0.28, R * 0.1);
      }
      g.fillStyle(accent, 1);
      g.fillEllipse(cx - R * 1.15, bodyY - R * 0.15, R * 0.35, R * 0.25);
      g.fillEllipse(cx + R * 1.15, bodyY - R * 0.15, R * 0.35, R * 0.25);
      g.fillTriangle(cx - R * 1.35, bodyY - R * 0.35, cx - R * 1.7, bodyY, cx - R * 1.2, bodyY + R * 0.1);
      g.fillTriangle(cx + R * 1.35, bodyY - R * 0.35, cx + R * 1.7, bodyY, cx + R * 1.2, bodyY + R * 0.1);
      break;
    case 'spider': {
      g.lineStyle(Math.max(2.5, R * 0.13), dark, 1);
      for (let i = 0; i < 4; i++) {
        const ang = -0.55 + i * 0.38;
        const len = R * (1.15 + (i % 2) * 0.25);
        const midY = bodyY + Math.sin(ang) * len * 0.45 + R * 0.15;
        const endY = bodyY + Math.sin(ang) * len + R * 0.55;
        const lx = cx - Math.cos(ang) * len - R * 0.15;
        const rx = cx + Math.cos(ang) * len + R * 0.15;
        g.lineBetween(cx - R * 0.35, bodyY, cx - Math.cos(ang) * len * 0.55 - R * 0.1, midY);
        g.lineBetween(cx - Math.cos(ang) * len * 0.55 - R * 0.1, midY, lx, endY);
        g.lineBetween(cx + R * 0.35, bodyY, cx + Math.cos(ang) * len * 0.55 + R * 0.1, midY);
        g.lineBetween(cx + Math.cos(ang) * len * 0.55 + R * 0.1, midY, rx, endY);
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
  bat: boolean,
) {
  if (moth) {
    g.fillStyle(accent, 0.55);
    g.fillEllipse(cx - R * 1.05, cy - R * 0.15, R * 0.95, R * 0.55);
    g.fillEllipse(cx + R * 1.05, cy - R * 0.15, R * 0.95, R * 0.55);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(cx - R * 1.05, cy - R * 0.25, R * 0.4, R * 0.22);
    g.fillEllipse(cx + R * 1.05, cy - R * 0.25, R * 0.4, R * 0.22);
  } else if (bat) {
    g.fillStyle(accent, 0.85);
    g.fillTriangle(cx - R * 0.3, cy, cx - R * 1.55, cy - R * 0.35, cx - R * 0.9, cy + R * 0.65);
    g.fillTriangle(cx + R * 0.3, cy, cx + R * 1.55, cy - R * 0.35, cx + R * 0.9, cy + R * 0.65);
    g.fillStyle(shade(accent, -0.2), 0.5);
    g.fillTriangle(cx - R * 0.4, cy + R * 0.05, cx - R * 1.1, cy + R * 0.05, cx - R * 0.75, cy + R * 0.45);
  } else {
    g.fillStyle(accent, 0.9);
    g.fillTriangle(cx - R * 0.35, cy, cx - R * 1.45, cy - R * 0.85, cx - R * 1.05, cy + R * 0.45);
    g.fillTriangle(cx + R * 0.35, cy, cx + R * 1.45, cy - R * 0.85, cx + R * 1.05, cy + R * 0.45);
    g.fillStyle(0xffffff, 0.28);
    g.fillTriangle(cx - R * 0.45, cy - R * 0.05, cx - R * 1.15, cy - R * 0.5, cx - R * 0.85, cy + R * 0.15);
  }
}

function drawSnout(
  g: Phaser.GameObjects.Graphics,
  style: SnoutStyle,
  hx: number,
  headY: number,
  headR: number,
  body: number,
  accent: number,
  dark: number,
) {
  switch (style) {
    case 'cat':
      g.fillStyle(shade(body, 0.15), 1);
      g.fillEllipse(hx, headY + headR * 0.35, headR * 0.45, headR * 0.28);
      g.fillStyle(dark, 1);
      g.fillCircle(hx, headY + headR * 0.28, headR * 0.08);
      break;
    case 'dog':
      g.fillStyle(shade(body, 0.1), 1);
      g.fillEllipse(hx, headY + headR * 0.4, headR * 0.55, headR * 0.38);
      g.fillStyle(dark, 1);
      g.fillEllipse(hx, headY + headR * 0.28, headR * 0.18, headR * 0.12);
      break;
    case 'fox':
      g.fillStyle(shade(body, 0.12), 1);
      g.fillTriangle(hx - headR * 0.28, headY + headR * 0.2, hx + headR * 0.28, headY + headR * 0.2, hx, headY + headR * 0.65);
      g.fillStyle(dark, 1);
      g.fillCircle(hx, headY + headR * 0.42, headR * 0.07);
      break;
    case 'boar':
      g.fillStyle(shade(body, -0.05), 1);
      g.fillEllipse(hx, headY + headR * 0.45, headR * 0.5, headR * 0.35);
      g.fillStyle(accent, 1);
      g.fillEllipse(hx, headY + headR * 0.5, headR * 0.28, headR * 0.2);
      g.fillStyle(dark, 1);
      g.fillCircle(hx - headR * 0.1, headY + headR * 0.48, headR * 0.06);
      g.fillCircle(hx + headR * 0.1, headY + headR * 0.48, headR * 0.06);
      break;
    case 'beak':
      g.fillStyle(accent, 1);
      g.fillTriangle(hx, headY + headR * 0.05, hx + headR * 0.6, headY + headR * 0.15, hx, headY + headR * 0.35);
      break;
    case 'flat':
      g.fillStyle(shade(body, 0.2), 1);
      g.fillEllipse(hx, headY + headR * 0.38, headR * 0.4, headR * 0.22);
      g.fillStyle(dark, 1);
      g.fillCircle(hx, headY + headR * 0.32, headR * 0.07);
      break;
    case 'long':
      g.fillStyle(shade(body, 0.08), 1);
      g.fillEllipse(hx + headR * 0.15, headY + headR * 0.35, headR * 0.7, headR * 0.32);
      g.fillStyle(dark, 1);
      g.fillEllipse(hx + headR * 0.4, headY + headR * 0.32, headR * 0.16, headR * 0.1);
      break;
    default:
      break;
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
    g.fillCircle(cx + R * 0.15, bodyY - R * 0.2, R * 0.07);
  }
  if (build.stripes) {
    g.lineStyle(Math.max(1.5, R * 0.08), dark, 0.4);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * headR * 0.28;
      g.lineBetween(cx + ox - headR * 0.15, headY - headR * 0.25, cx + ox + headR * 0.1, headY + headR * 0.4);
    }
  }
  if (build.hasMane) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = headR * (0.95 + (i % 3) * 0.08);
      sphere(g, cx + Math.cos(a) * rr, headY + Math.sin(a) * headR * 0.9, headR * 0.3, accent);
    }
  }
  if (build.hasShell) {
    g.fillStyle(accent, 1);
    g.fillEllipse(cx, bodyY - R * 0.05, R * 1.15 * build.bodyW, R * 0.85 * build.bodyH);
    g.fillStyle(shade(accent, 0.25), 0.6);
    g.fillEllipse(cx - R * 0.2, bodyY - R * 0.25, R * 0.45, R * 0.3);
    g.lineStyle(Math.max(1.5, R * 0.06), dark, 0.4);
    g.strokeEllipse(cx, bodyY - R * 0.05, R * 1.15 * build.bodyW, R * 0.85 * build.bodyH);
    // Shell segments for beetles / armadillos
    if (build.archetype === 'beetle' || build.archetype === 'armadillo') {
      g.lineStyle(Math.max(1, R * 0.05), dark, 0.35);
      g.lineBetween(cx, bodyY - R * 0.45, cx, bodyY + R * 0.35);
      g.lineBetween(cx - R * 0.4, bodyY - R * 0.2, cx + R * 0.4, bodyY - R * 0.2);
    }
  }
}

function drawBodyPlan(
  g: Phaser.GameObjects.Graphics,
  build: CreatureBuild,
  cx: number,
  cy: number,
  R: number,
  body: number,
  belly: number,
  accent: number,
): { bodyY: number; headY: number; headR: number; hx: number } {
  const bw = build.bodyW;
  const bh = build.bodyH;
  const leanX = build.lean * R;
  let bodyY = cy + R * 0.4;
  let headY = cy - R * 0.35;
  let headR = R * 0.95 * build.headScale;
  let hx = cx;

  switch (build.plan) {
    case 'coil': {
      bodyY = cy + R * 0.35;
      headY = cy - R * 0.2;
      headR = R * 0.72 * build.headScale;
      hx = cx - R * 0.4 + leanX;
      g.fillStyle(body, 1);
      g.fillEllipse(cx + R * 0.4 + leanX * 0.5, bodyY + R * 0.4, R * 1.55 * bw, R * 0.5 * bh);
      g.fillEllipse(cx + leanX * 0.3, bodyY + R * 0.05, R * 1.25 * bw, R * 0.48 * bh);
      g.fillEllipse(cx - R * 0.25 + leanX, bodyY - R * 0.25, R * 0.9, R * 0.42);
      sphere(g, hx, headY + R * 0.1, R * 0.55, body);
      g.fillStyle(belly, 1).fillEllipse(cx + R * 0.05, bodyY + R * 0.15, R * 0.75 * bw, R * 0.28);
      break;
    }
    case 'wraith': {
      bodyY = cy + R * 0.45;
      headY = cy - R * 0.15;
      headR = R * 1.05 * build.headScale;
      sphere(g, cx, headY + R * 0.2, headR * bw, body);
      g.fillStyle(body, 0.85);
      const tips = 4 + ((build.archetype === 'jelly' ? 1 : 0) + (build.bodyW > 1.05 ? 1 : 0));
      for (let i = 0; i < tips; i++) {
        const tw = R * (0.28 + (i % 2) * 0.06);
        g.fillEllipse(cx - R * 0.7 * bw + i * ((R * 1.4 * bw) / (tips - 1)), bodyY + R * 0.5 * bh, tw, R * 0.5 * bh);
      }
      if (build.archetype === 'jelly') {
        g.fillStyle(accent, 0.45);
        g.fillEllipse(cx, headY + R * 0.05, headR * 1.25, headR * 0.65);
      }
      break;
    }
    case 'arachnid': {
      bodyY = cy + R * 0.35;
      headY = cy - R * 0.15;
      headR = R * 0.55 * build.headScale;
      sphere(g, cx + leanX * 0.3, bodyY + R * 0.2, R * 0.8 * bw, body); // abdomen
      sphere(g, cx - leanX * 0.2, headY + R * 0.3, R * 0.55 * bw, body); // cephalothorax
      g.fillStyle(belly, 0.7).fillEllipse(cx, bodyY + R * 0.35, R * 0.45, R * 0.3);
      break;
    }
    case 'crustacean': {
      bodyY = cy + R * 0.35;
      headY = cy - R * 0.05;
      headR = R * 0.65 * build.headScale;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 1.35 * bw, R * 0.8 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.18, R * 0.85 * bw, R * 0.42);
      sphere(g, cx, headY + R * 0.25, headR, body);
      break;
    }
    case 'amphibian': {
      bodyY = cy + R * 0.35;
      headY = cy - R * 0.25;
      headR = R * 0.95 * build.headScale;
      sphere(g, cx, bodyY, R * 0.95 * bw, body);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.25, R * 0.95 * bw, R * 0.6 * bh);
      sphere(g, cx - headR * 0.55, headY - headR * 0.1, headR * 0.42, body);
      sphere(g, cx + headR * 0.55, headY - headR * 0.1, headR * 0.42, body);
      break;
    }
    case 'aquatic': {
      bodyY = cy + R * 0.15;
      headY = cy - R * 0.05;
      headR = R * 0.7 * build.headScale;
      hx = cx - R * 0.55 + leanX;
      g.fillStyle(body, 1).fillEllipse(cx + leanX * 0.3, cy + R * 0.1, R * 1.45 * bw, R * 0.85 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx + leanX * 0.3, cy + R * 0.28, R * 0.95 * bw, R * 0.48);
      sphere(g, hx, headY + R * 0.15, headR, body);
      break;
    }
    case 'avian': {
      bodyY = cy + R * 0.45;
      headY = cy - R * 0.45;
      headR = R * 0.85 * build.headScale;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 0.85 * bw, R * 1.05 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.15, R * 0.55 * bw, R * 0.7);
      sphere(g, cx, headY, headR, body);
      break;
    }
    case 'shelled': {
      bodyY = cy + R * 0.4;
      headY = cy - R * 0.25;
      headR = R * 0.75 * build.headScale;
      sphere(g, cx, bodyY, R * 0.75 * bw, body);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.2, R * 0.7, R * 0.4);
      // Head peeks out slightly forward
      hx = cx - R * 0.15;
      sphere(g, hx, headY, headR, body);
      break;
    }
    case 'sleek': {
      // Cats / foxes / otters / newts — elongated horizontal body
      bodyY = cy + R * 0.45;
      headY = cy - R * 0.2;
      headR = R * 0.88 * build.headScale;
      hx = cx - R * 0.15;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 1.15 * bw, R * 0.65 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.12, R * 0.85 * bw, R * 0.4);
      sphere(g, hx, headY, headR, body);
      break;
    }
    case 'stocky': {
      bodyY = cy + R * 0.4;
      headY = cy - R * 0.3;
      headR = R * 1.0 * build.headScale;
      sphere(g, cx, bodyY, R * 0.85 * bw, body);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.2, R * 0.85 * bw, R * 0.55 * bh);
      sphere(g, cx, headY, headR, body);
      break;
    }
    case 'maneBeast': {
      bodyY = cy + R * 0.45;
      headY = cy - R * 0.25;
      headR = R * 1.08 * build.headScale;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 1.05 * bw, R * 0.8 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.18, R * 0.75, R * 0.5);
      sphere(g, cx, headY, headR, body);
      break;
    }
    case 'lanky': {
      bodyY = cy + R * 0.5;
      headY = cy - R * 0.5;
      headR = R * 0.82 * build.headScale;
      hx = cx - R * 0.1;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY - R * 0.1, R * 0.75 * bw, R * 0.95 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY, R * 0.5, R * 0.55);
      sphere(g, hx, headY, headR, body);
      break;
    }
    case 'drake': {
      bodyY = cy + R * 0.4;
      headY = cy - R * 0.45;
      headR = R * 0.85 * build.headScale;
      hx = cx - R * 0.2;
      g.fillStyle(body, 1).fillEllipse(cx, bodyY, R * 1.05 * bw, R * 0.7 * bh);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.15, R * 0.7, R * 0.4);
      // Neck
      g.fillStyle(body, 1).fillEllipse(cx - R * 0.15, cy - R * 0.05, R * 0.4, R * 0.55);
      sphere(g, hx, headY, headR, body);
      break;
    }
    case 'wingedFurry': {
      bodyY = cy + R * 0.35;
      headY = cy - R * 0.25;
      headR = R * 0.9 * build.headScale;
      sphere(g, cx, bodyY, R * 0.65 * bw, body);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.15, R * 0.55, R * 0.4);
      sphere(g, cx, headY, headR, body);
      break;
    }
    default: {
      bodyY = cy + R * 0.4;
      headY = cy - R * 0.35;
      headR = R * 0.95 * build.headScale;
      sphere(g, cx, bodyY, R * 0.7 * bw, body);
      g.fillStyle(belly, 1).fillEllipse(cx, bodyY + R * 0.18, R * 0.9 * bw, R * 0.55 * bh);
      sphere(g, cx, headY, headR, body);
      break;
    }
  }

  return { bodyY, headY, headR, hx };
}

/**
 * Main entry — cute BDSP chibi vibe with distinct modular silhouettes.
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

  const shadowW =
    build.legs === 'spider' || build.legs === 'crab' ? 2.9 : build.plan === 'sleek' || build.plan === 'coil' ? 2.6 : 2.3;
  ovalShadow(g, cx, size * 0.9, R * shadowW * build.bodyW, R * 0.55, 0.3);

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
    drawWings(g, cx, cy, R, accent, arch === 'moth', arch === 'bat');
  }

  const { bodyY, headY, headR, hx } = drawBodyPlan(g, build, cx, cy, R, body, belly, accent);

  drawLegs(g, build.legs, cx, bodyY, R, dark, accent, build.bodyH);
  drawTail(g, build.tail, cx, bodyY, R, body, accent, dark);

  // Mane behind face for lions (drawn before ears/face)
  if (build.hasMane) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = headR * (1.0 + (i % 3) * 0.1);
      sphere(g, hx + Math.cos(a) * rr, headY + Math.sin(a) * headR * 0.92, headR * 0.32, accent);
    }
  }

  // Re-draw head on top of mane for mane beasts
  if (build.plan === 'maneBeast') {
    sphere(g, hx, headY, headR, body);
  }

  drawEars(g, build.ear, hx, headY, headR, body, accent, dark);

  // Patterns (shell / spots) — skip mane here since we drew it above
  const patternBuild = { ...build, hasMane: false };
  drawPatterns(g, patternBuild, cx, headY, bodyY, headR, R, accent, dark);

  drawSnout(g, build.snout, hx, headY, headR, body, accent, dark);

  // Bird crest
  if (arch === 'bird') {
    g.fillStyle(accent, 1);
    g.fillTriangle(hx, headY - headR * 1.15, hx - headR * 0.22, headY - headR * 0.7, hx + headR * 0.22, headY - headR * 0.7);
  }

  // Boar tusks / fangs
  if (arch === 'boar' || build.fang) {
    g.fillStyle(0xfff8e1, 1);
    if (arch === 'boar') {
      g.fillTriangle(hx - headR * 0.35, headY + headR * 0.35, hx - headR * 0.55, headY + headR * 0.7, hx - headR * 0.15, headY + headR * 0.5);
      g.fillTriangle(hx + headR * 0.35, headY + headR * 0.35, hx + headR * 0.55, headY + headR * 0.7, hx + headR * 0.15, headY + headR * 0.5);
    } else if (build.fang && (arch === 'snake' || arch === 'spider' || arch === 'bat' || arch === 'dragon' || arch === 'imp')) {
      g.fillTriangle(hx - headR * 0.18, headY + headR * 0.45, hx - headR * 0.28, headY + headR * 0.7, hx - headR * 0.08, headY + headR * 0.55);
      g.fillTriangle(hx + headR * 0.18, headY + headR * 0.45, hx + headR * 0.28, headY + headR * 0.7, hx + headR * 0.08, headY + headR * 0.55);
    }
  }

  // Whiskers
  if (build.whiskers) {
    g.lineStyle(Math.max(1, headR * 0.05), dark, 0.55);
    for (const side of [-1, 1]) {
      g.lineBetween(hx + side * headR * 0.35, headY + headR * 0.35, hx + side * headR * 0.95, headY + headR * 0.25);
      g.lineBetween(hx + side * headR * 0.35, headY + headR * 0.42, hx + side * headR * 0.9, headY + headR * 0.48);
    }
  }

  // Face
  const eyeY = arch === 'frog' ? headY - headR * 0.1 : headY - headR * 0.02;
  const eyeR = headR * (build.multiEyes ? 0.14 : arch === 'mole' ? 0.12 : 0.22);
  const gap = headR * build.eyeGap;
  const spooky = arch === 'ghost' || (type === 'darkness' && (arch === 'imp' || arch === 'jelly'));

  if (build.multiEyes) {
    drawCuteEyes(g, hx - gap, eyeY, hx + gap, eyeY, eyeR);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(hx - gap * 1.65, eyeY + eyeR * 0.85, eyeR * 0.7);
    g.fillCircle(hx + gap * 1.65, eyeY + eyeR * 0.85, eyeR * 0.7);
    g.fillCircle(hx - gap * 0.35, eyeY - eyeR * 1.1, eyeR * 0.55);
    g.fillCircle(hx + gap * 0.35, eyeY - eyeR * 1.1, eyeR * 0.55);
    g.fillStyle(0x263238, 1);
    g.fillCircle(hx - gap * 1.65, eyeY + eyeR * 0.85, eyeR * 0.35);
    g.fillCircle(hx + gap * 1.65, eyeY + eyeR * 0.85, eyeR * 0.35);
    g.fillCircle(hx - gap * 0.35, eyeY - eyeR * 1.1, eyeR * 0.28);
    g.fillCircle(hx + gap * 0.35, eyeY - eyeR * 1.1, eyeR * 0.28);
  } else if (arch === 'frog') {
    drawCuteEyes(g, hx - headR * 0.55, eyeY, hx + headR * 0.55, eyeY, eyeR * 1.1);
  } else {
    drawCuteEyes(g, hx - gap, eyeY, hx + gap, eyeY, eyeR, spooky);
  }

  if (!build.multiEyes) {
    g.fillStyle(0xff8a80, arch === 'ghost' ? 0.25 : 0.45);
    g.fillCircle(hx - headR * 0.65, headY + headR * 0.28, headR * 0.15);
    g.fillCircle(hx + headR * 0.65, headY + headR * 0.28, headR * 0.15);
    if (build.snout === 'none' || build.snout === 'beak') {
      g.lineStyle(Math.max(1.5, headR * 0.08), dark, 0.65);
      g.beginPath();
      g.arc(hx, headY + headR * 0.32, headR * 0.22, 0.15 * Math.PI, 0.85 * Math.PI, false);
      g.strokePath();
    } else if (build.snout !== 'boar') {
      g.lineStyle(Math.max(1.2, headR * 0.06), dark, 0.55);
      g.beginPath();
      g.arc(hx, headY + headR * 0.55, headR * 0.16, 0.2 * Math.PI, 0.8 * Math.PI, false);
      g.strokePath();
    }
  }

  if (species.stage >= 2) {
    g.fillStyle(0xfff59d, 0.9);
    g.fillCircle(hx, headY - headR * 1.15, Math.max(2, R * 0.12));
  }
}
