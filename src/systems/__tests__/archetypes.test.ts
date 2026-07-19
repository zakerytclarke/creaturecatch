import { describe, it, expect } from 'vitest';
import { SPECIES_LIST } from '../../data/creatures';
import { hashString } from '../rng';

// Mirror the archetype picker used by creatureParts (kept lightweight for tests).
function pickArchetype(name: string, seed: number): string {
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
  if (/moth|kindle|pyre|auroramoth/.test(n)) return 'moth';
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
  const fallback = ['blob', 'dog', 'cat', 'bird', 'frog', 'imp', 'bear'];
  return fallback[seed % fallback.length];
}

describe('creature archetypes', () => {
  it('covers many distinct body plans across the roster', () => {
    const set = new Set(
      SPECIES_LIST.map((s) => pickArchetype(s.name, hashString(s.id))),
    );
    expect(set.size).toBeGreaterThanOrEqual(18);
    for (const need of ['snake', 'ghost', 'spider', 'crab', 'cat', 'dog', 'bird', 'dragon', 'frog']) {
      expect(set.has(need)).toBe(true);
    }
  });
});
