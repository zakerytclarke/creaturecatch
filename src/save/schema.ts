import { CreatureInstance } from '../entities/CreatureInstance';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'creaturecatch.save.v1';

export interface SaveGame {
  version: number;
  player: {
    name: string;
    regionId: string;
    tileX: number;
    tileY: number;
    money: number;
  };
  party: CreatureInstance[];
  box: CreatureInstance[];
  bag: { itemId: string; qty: number }[];
  dex: { seen: string[]; caught: string[] };
  flags: Record<string, boolean>;
}

export function migrate(raw: any): SaveGame | null {
  if (!raw || typeof raw !== 'object') return null;
  // Only v1 exists today; future versions add migration steps here.
  if (raw.version === SAVE_VERSION) return raw as SaveGame;
  return null;
}
