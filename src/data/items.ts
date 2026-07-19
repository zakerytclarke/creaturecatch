export type ItemCategory = 'heal' | 'revive' | 'catch';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  description: string;
  healAmount?: number; // for heal
  reviveFraction?: number; // for revive
  ballBonus?: number; // for catch
}

export const ITEMS: Record<string, Item> = {
  potion: {
    id: 'potion',
    name: 'Potion',
    category: 'heal',
    price: 50,
    healAmount: 25,
    description: 'Restores 25 HP to one creature.',
  },
  superpotion: {
    id: 'superpotion',
    name: 'Super Potion',
    category: 'heal',
    price: 200,
    healAmount: 65,
    description: 'Restores 65 HP to one creature.',
  },
  hyperpotion: {
    id: 'hyperpotion',
    name: 'Hyper Potion',
    category: 'heal',
    price: 600,
    healAmount: 160,
    description: 'Restores 160 HP to one creature.',
  },
  revive: {
    id: 'revive',
    name: 'Revive',
    category: 'revive',
    price: 400,
    reviveFraction: 0.5,
    description: 'Revives a fainted creature to half HP.',
  },
  basicorb: {
    id: 'basicorb',
    name: 'Catch Orb',
    category: 'catch',
    price: 30,
    ballBonus: 1,
    description: 'A basic orb for catching creatures.',
  },
  greatorb: {
    id: 'greatorb',
    name: 'Great Orb',
    category: 'catch',
    price: 200,
    ballBonus: 1.5,
    description: 'A better orb with a higher catch rate.',
  },
  ultraorb: {
    id: 'ultraorb',
    name: 'Ultra Orb',
    category: 'catch',
    price: 500,
    ballBonus: 2.5,
    description: 'A superb orb with a very high catch rate.',
  },
};

export function getItem(id: string): Item {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item: ${id}`);
  return it;
}

// Items offered in the town shop.
export const SHOP_ITEMS = ['basicorb', 'greatorb', 'ultraorb', 'potion', 'superpotion', 'hyperpotion', 'revive'];
