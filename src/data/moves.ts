import { ElementType, ELEMENT_TYPES, TYPE_META } from './types';

export interface Move {
  id: string;
  name: string;
  type: ElementType;
  power: number; // 0 = status
  accuracy: number; // 0..100
  pp: number;
  category: 'physical' | 'status';
  // status effect applied to the user (buff) — kept minimal for MVP
  effect?: 'raiseAttack' | 'raiseDefense' | 'healSelf';
  description: string;
}

// Per-type damaging move names by tier. Flavorful but generated to guarantee full coverage.
const MOVE_NAMES: Record<ElementType, [string, string, string]> = {
  fire: ['Ember', 'Flame Burst', 'Inferno Fang'],
  earth: ['Pebble Toss', 'Rock Slam', 'Quake Crush'],
  air: ['Gust', 'Air Cutter', 'Cyclone Dive'],
  water: ['Splash Jet', 'Aqua Pulse', 'Tidal Crash'],
  darkness: ['Shadow Nip', 'Gloom Rush', 'Void Fang'],
};

const STATUS_MOVE: Record<ElementType, { name: string; effect: Move['effect']; desc: string }> = {
  fire: { name: 'Battle Cry', effect: 'raiseAttack', desc: 'Sharply raises Attack.' },
  earth: { name: 'Harden', effect: 'raiseDefense', desc: 'Sharply raises Defense.' },
  air: { name: 'Tailwind', effect: 'raiseAttack', desc: 'Raises Attack with a rushing wind.' },
  water: { name: 'Recover', effect: 'healSelf', desc: 'Restores some HP.' },
  darkness: { name: 'Menace', effect: 'raiseAttack', desc: 'Raises Attack with a dark aura.' },
};

export const MOVES: Record<string, Move> = {};

function register(m: Move) {
  MOVES[m.id] = m;
}

for (const type of ELEMENT_TYPES) {
  const [n1, n2, n3] = MOVE_NAMES[type];
  register({
    id: `${type}_1`,
    name: n1,
    type,
    power: 45,
    accuracy: 100,
    pp: 30,
    category: 'physical',
    description: `A weak ${TYPE_META[type].name}-type attack.`,
  });
  register({
    id: `${type}_2`,
    name: n2,
    type,
    power: 70,
    accuracy: 95,
    pp: 20,
    category: 'physical',
    description: `A solid ${TYPE_META[type].name}-type attack.`,
  });
  register({
    id: `${type}_3`,
    name: n3,
    type,
    power: 100,
    accuracy: 85,
    pp: 10,
    category: 'physical',
    description: `A powerful ${TYPE_META[type].name}-type attack.`,
  });
  const st = STATUS_MOVE[type];
  register({
    id: `${type}_status`,
    name: st.name,
    type,
    power: 0,
    accuracy: 100,
    pp: 15,
    category: 'status',
    effect: st.effect,
    description: st.desc,
  });
}

export function getMove(id: string): Move {
  const m = MOVES[id];
  if (!m) throw new Error(`Unknown move: ${id}`);
  return m;
}
