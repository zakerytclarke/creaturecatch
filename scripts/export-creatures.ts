/**
 * Export the Creature Catch roster into the review JSON format.
 * Run: npx tsx scripts/export-creatures.ts
 */
import { writeFileSync } from 'fs';
import { SPECIES_LIST, getSpecies } from '../src/data/creatures';
import { ElementType, TYPE_META } from '../src/data/types';

/** Keep in sync with src/gfx/textures.ts TYPE_PAINT (avoid importing Phaser here). */
const TYPE_PAINT: Record<ElementType, { body: number }> = {
  fire: { body: 0xff7043 },
  earth: { body: 0xbcaaa4 },
  air: { body: 0x64b5f6 },
  water: { body: 0x29b6f6 },
  darkness: { body: 0x7e57c2 },
};

type ExportCreature = {
  id: number;
  name: string;
  type: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  evolvesAt: number | null;
  evolvesToId: number | null;
  spriteColor: string;
  drawKey: string;
  description: string;
  visualPrompt: string;
};

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function typeLabel(t: ElementType): string {
  return TYPE_META[t].name;
}

/** Infer a cute animal archetype from the species name for flavor + art prompts. */
function archetype(name: string, type: ElementType): string {
  const n = name.toLowerCase();
  if (/newt|salam/.test(n)) return 'chubby salamander newt';
  if (/pup|hound|wolf|fang/.test(n)) return 'round puppy dog';
  if (/kit|cat|lynx|fox|vix/.test(n)) return 'plush kitten fox';
  if (/boar|tusk/.test(n)) return 'stubby wild-boar piglet';
  if (/fawn|stag|ram|goat|horn|colt|mare|neigh/.test(n)) return 'tiny deer-horse chibi';
  if (/cub|bruin|ursa/.test(n)) return 'round teddy bear cub';
  if (/moth|lune/.test(n)) return 'fluffy moth butterfly';
  if (/drake|wyrm|dragon/.test(n)) return 'chibi dragon wyrmling';
  if (/mole|dig/.test(n)) return 'round burrowing mole';
  if (/turtle|shell|toise/.test(n)) return 'chunky turtle tortoise';
  if (/worm|serp|kelp|eel/.test(n)) return 'soft noodle serpent';
  if (/beetle|tusk|spider|weaver/.test(n)) return 'cute chubby beetle bug';
  if (/root|timber|fern/.test(n)) return 'sprout forest critter';
  if (/dillo|quake/.test(n)) return 'round armadillo digger';
  if (/otter/.test(n)) return 'fluffy river otter';
  if (/frog|toad/.test(n)) return 'plump frog toad';
  if (/crab|claw/.test(n)) return 'round hermit crab';
  if (/fin|fish|ray/.test(n)) return 'chibi fish ray';
  if (/jelly/.test(n)) return 'soft jelly blob';
  if (/seal|walrus/.test(n)) return 'round seal walrus';
  if (/penguin|guin/.test(n)) return 'chubby penguin';
  if (/owl|sparrow|hawk|falcon|kite|avian|puff|nimb/.test(n)) return 'round chibi bird';
  if (/bat|wing/.test(n)) return 'cute round bat';
  if (/dragonfly|drake/.test(n)) return 'chibi dragonfly insect';
  if (/sprite|breez|gale|tempest|cumul|wisp|auror/.test(n)) return 'fluffy cloud spirit critter';
  if (/imp|fiend|ghast|wraith|murk|nether|void|obsidian|hex|raven|shade|gloom|umbr/.test(n))
    return 'cute shadowy spirit critter';
  const byType: Record<ElementType, string> = {
    fire: 'warm little fire critter',
    earth: 'earthy forest critter',
    air: 'fluffy wind critter',
    water: 'splashy water critter',
    darkness: 'moody shadow critter',
  };
  return byType[type];
}

function stageWord(stage: number): string {
  return stage === 0 ? 'tiny baby' : stage === 1 ? 'sleeker teen' : 'majestic adult';
}

function description(name: string, type: ElementType, stage: number): string {
  const arch = archetype(name, type);
  const templates: Record<ElementType, string[]> = {
    fire: [
      `A ${stageWord(stage)} ${arch} that sparkles with warmth. Very energetic and affectionate, though its heat can singe dry leaves when it gets excited.`,
      `This ${arch} stores cozy embers in its belly. Trainers love its loyalty — just keep it away from picnic blankets.`,
      `A playful ${arch} whose glow brightens dark trails. It purrs like a furnace when happy.`,
    ],
    earth: [
      `A sturdy ${arch} that smells like rain on soil. It digs tiny gardens wherever it naps.`,
      `This gentle ${arch} wears patches of moss and pebbles. Surprisingly cuddly for a rock-loving creature.`,
      `A dependable ${arch} that stomps softly. It collects shiny stones as treasures for its trainer.`,
    ],
    air: [
      `A breezy ${arch} lighter than it looks. It leaves little whirlwinds of petals when it dashes by.`,
      `This floaty ${arch} loves ridge-top winds. Its feathers/whiskers hum like a soft flute.`,
      `A cheerful ${arch} that rides warm updrafts. It often lands on hats without asking.`,
    ],
    water: [
      `A splashy ${arch} that leaves glittery droplets behind. Happiest near streams and shorelines.`,
      `This soggy-sweet ${arch} bubbles when praised. Keep a towel handy after hugs.`,
      `A curious ${arch} that collects smooth sea glass. Its eyes shine like tide pools.`,
    ],
    darkness: [
      `A moody-cute ${arch} that prefers twilight strolls. Surprisingly gentle once it trusts you.`,
      `This shadowy ${arch} softens harsh nights. It hides in pockets and giggles like distant thunder.`,
      `A mysterious ${arch} with star-speckled markings. Loyal, quiet, and a little dramatic.`,
    ],
  };
  const list = templates[type];
  const idx = Math.abs(name.length + stage * 3) % list.length;
  return list[idx];
}

function visualPrompt(name: string, type: ElementType, stage: number): string {
  const arch = archetype(name, type);
  const paint = TYPE_PAINT[type];
  const colorHint = typeLabel(type).toLowerCase();
  const size = stage === 0 ? 'tiny baby' : stage === 1 ? 'medium teen' : 'larger adult';
  const extras: Record<ElementType, string> = {
    fire: 'tiny tail flame, warm orange glow, ember freckles',
    earth: 'moss patches, pebble armor nubs, leafy accents',
    air: 'soft wispy feathers or cloud tufts, breezy ribbons',
    water: 'dewy highlights, bubble accents, glossy wet look',
    darkness: 'soft purple shadows, star freckles, gentle glow eyes',
  };
  return [
    `${size} ${arch}`,
    `massive circular shiny black eyes`,
    `pink blush cheeks`,
    `stubby limbs`,
    extras[type],
    `${colorHint} color palette around ${hexColor(paint.body)}`,
    `Pokémon Brilliant Diamond chibi 3D style`,
    `Animal Crossing softness`,
    `clean game asset`,
    `soft oval ground shadow`,
    `studio lighting`,
    `no text`,
  ].join(', ');
}

function main() {
  const byId = new Map(SPECIES_LIST.map((s) => [s.id, s]));

  const exported: ExportCreature[] = SPECIES_LIST.map((sp) => {
    const type = sp.types[0];
    let evolvesAt: number | null = null;
    let evolvesToId: number | null = null;
    if (sp.evolvesTo) {
      evolvesAt = sp.evolvesTo.atLevel;
      const next = byId.get(sp.evolvesTo.speciesId);
      evolvesToId = next ? next.dexNumber : null;
    }

    return {
      id: sp.dexNumber,
      name: sp.name,
      type: typeLabel(type),
      baseHp: sp.baseStats.hp,
      baseAtk: sp.baseStats.attack,
      baseDef: sp.baseStats.defense,
      baseSpd: sp.baseStats.speed,
      evolvesAt,
      evolvesToId,
      spriteColor: hexColor(TYPE_PAINT[type].body),
      drawKey: sp.id,
      description: description(sp.name, type, sp.stage),
      visualPrompt: visualPrompt(sp.name, type, sp.stage),
    };
  });

  // Sanity: every evolvesToId points at a real id
  for (const c of exported) {
    if (c.evolvesToId != null) {
      getSpecies(SPECIES_LIST.find((s) => s.dexNumber === c.evolvesToId)!.id);
    }
  }

  const outPath = 'docs/creatures-export.json';
  writeFileSync(outPath, JSON.stringify(exported, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${exported.length} creatures to ${outPath}`);
  console.log('Sample:', JSON.stringify(exported[0], null, 2));
}

main();
