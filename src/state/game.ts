import { CreatureInstance, createInstance, healFull, speciesOf } from '../entities/CreatureInstance';
import { getItem } from '../data/items';
import { SaveGame, SAVE_KEY, SAVE_VERSION, migrate } from '../save/schema';

const STARTING_BAG: { itemId: string; qty: number }[] = [
  { itemId: 'basicorb', qty: 8 },
  { itemId: 'potion', qty: 5 },
];

class GameState {
  save!: SaveGame;

  get party() {
    return this.save.party;
  }
  get box() {
    return this.save.box;
  }
  get bag() {
    return this.save.bag;
  }

  newGame(playerName: string, starterId: string): void {
    const starter = createInstance(starterId, 5);
    this.save = {
      version: SAVE_VERSION,
      player: { name: playerName, regionId: 'town', tileX: 8, tileY: 8, money: 500 },
      party: [starter],
      box: [],
      bag: STARTING_BAG.map((b) => ({ ...b })),
      dex: { seen: [starterId], caught: [starterId] },
      flags: {},
    };
    this.persist();
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) != null;
  }

  loadFromStorage(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const parsed = migrate(JSON.parse(raw));
      if (!parsed) return false;
      this.save = parsed;
      return true;
    } catch {
      return false;
    }
  }

  persist(): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
  }

  exportSave(): string {
    return JSON.stringify(this.save);
  }

  importSave(text: string): boolean {
    try {
      const parsed = migrate(JSON.parse(text));
      if (!parsed) return false;
      this.save = parsed;
      this.persist();
      return true;
    } catch {
      return false;
    }
  }

  // --- Party / box ---
  addCreature(inst: CreatureInstance): 'party' | 'box' {
    if (this.save.party.length < 6) {
      this.save.party.push(inst);
      return 'party';
    }
    this.save.box.push(inst);
    return 'box';
  }

  healParty(): void {
    this.save.party.forEach(healFull);
  }

  hasUsableCreature(): boolean {
    return this.save.party.some((c) => c.currentHp > 0);
  }

  firstUsableIndex(): number {
    return this.save.party.findIndex((c) => c.currentHp > 0);
  }

  // --- Bag ---
  itemQty(itemId: string): number {
    return this.save.bag.find((b) => b.itemId === itemId)?.qty ?? 0;
  }

  addItem(itemId: string, qty = 1): void {
    getItem(itemId); // validate
    const entry = this.save.bag.find((b) => b.itemId === itemId);
    if (entry) entry.qty += qty;
    else this.save.bag.push({ itemId, qty });
  }

  removeItem(itemId: string, qty = 1): boolean {
    const entry = this.save.bag.find((b) => b.itemId === itemId);
    if (!entry || entry.qty < qty) return false;
    entry.qty -= qty;
    if (entry.qty <= 0) this.save.bag = this.save.bag.filter((b) => b.itemId !== itemId);
    return true;
  }

  // --- Money ---
  get money() {
    return this.save.player.money;
  }
  addMoney(amount: number): void {
    this.save.player.money = Math.max(0, this.save.player.money + amount);
  }
  spendMoney(amount: number): boolean {
    if (this.save.player.money < amount) return false;
    this.save.player.money -= amount;
    return true;
  }

  // --- Dex ---
  markSeen(speciesId: string): void {
    if (!this.save.dex.seen.includes(speciesId)) this.save.dex.seen.push(speciesId);
  }
  markCaught(speciesId: string): void {
    this.markSeen(speciesId);
    if (!this.save.dex.caught.includes(speciesId)) this.save.dex.caught.push(speciesId);
  }
  isCaught(speciesId: string): boolean {
    return this.save.dex.caught.includes(speciesId);
  }
  isSeen(speciesId: string): boolean {
    return this.save.dex.seen.includes(speciesId);
  }

  // --- Flags ---
  getFlag(key: string): boolean {
    return !!this.save.flags[key];
  }
  setFlag(key: string, value = true): void {
    this.save.flags[key] = value;
  }

  // Register the whole evolution line + species as seen when caught (for dex flavour).
  speciesName(id: string): string {
    return speciesOf({ speciesId: id } as CreatureInstance).name;
  }
}

export const Game = new GameState();
