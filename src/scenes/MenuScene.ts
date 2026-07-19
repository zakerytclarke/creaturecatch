import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { Game } from '../state/game';
import {
  CreatureInstance,
  displayName,
  getMoves,
  getStat,
  maxHp,
  speciesOf,
} from '../entities/CreatureInstance';
import { SPECIES_LIST } from '../data/creatures';
import { TYPE_META } from '../data/types';
import { getItem, SHOP_ITEMS } from '../data/items';
import { Button, label, panel } from '../ui/ui';

type Tab = 'party' | 'box' | 'bag' | 'codex' | 'shop' | 'system';

const CONTENT_Y = 46;

export class MenuScene extends Phaser.Scene {
  private tab: Tab = 'party';
  private moneyText!: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Container;

  constructor() {
    super('Menu');
  }

  create(data: { tab?: Tab }) {
    this.tab = data?.tab ?? 'party';
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5d4e37, 0.35).setOrigin(0);
    panel(this, 6, 6, GAME_WIDTH - 12, GAME_HEIGHT - 12, {
      fill: 0xfff8ef,
      stroke: 0xd7c4a8,
      radius: 16,
    });

    const tabs: { id: Tab; label: string }[] = [
      { id: 'party', label: 'Party' },
      { id: 'box', label: 'Box' },
      { id: 'bag', label: 'Bag' },
      { id: 'codex', label: 'Codex' },
      { id: 'shop', label: 'Shop' },
      { id: 'system', label: 'Save' },
    ];
    tabs.forEach((t, i) => {
      new Button(this, 12 + i * 68, 12, t.label, {
        w: 64,
        h: 24,
        size: 11,
        fill: t.id === this.tab ? 0x6ec6a0 : 0xe7d7c1,
        hoverFill: 0x88d8b4,
        textColor: t.id === this.tab ? '#ffffff' : '#4e3b2a',
        onClick: () => this.scene.restart({ tab: t.id }),
      });
    });

    new Button(this, GAME_WIDTH - 60, GAME_HEIGHT - 30, 'Close', {
      w: 48,
      h: 22,
      size: 11,
      fill: 0xe57373,
      hoverFill: 0xef9a9a,
      onClick: () => this.close(),
    });

    this.moneyText = label(this, GAME_WIDTH - 132, 16, `¢ ${Game.money}`, {
      size: 12,
      color: '#c47a2c',
      bold: true,
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    switch (this.tab) {
      case 'party':
        this.renderCreatureList(Game.party, 'party');
        break;
      case 'box':
        this.renderCreatureList(Game.box, 'box');
        break;
      case 'bag':
        this.renderBag();
        break;
      case 'codex':
        this.renderCodex();
        break;
      case 'shop':
        this.renderShop();
        break;
      case 'system':
        this.renderSystem();
        break;
    }
  }

  private close() {
    Game.persist();
    this.scene.stop();
    this.scene.resume('World');
  }

  // ---------- Party / Box ----------
  private renderCreatureList(list: CreatureInstance[], kind: 'party' | 'box') {
    if (list.length === 0) {
      label(this, 20, CONTENT_Y + 10, kind === 'box' ? 'Your box is empty.' : 'No creatures.', {
        size: 13,
        color: '#b9c4e0',
      });
      return;
    }
    list.forEach((c, i) => {
      const y = CONTENT_Y + 6 + i * 42;
      if (y > GAME_HEIGHT - 40) return;
      const sp = speciesOf(c);
      panel(this, 12, y, GAME_WIDTH - 24, 38, {
        fill: 0xfffaf3,
        stroke: TYPE_META[sp.types[0]].color,
        radius: 12,
      });
      this.add.image(34, y + 19, `creature_${c.speciesId}`).setScale(0.38);
      label(this, 60, y + 5, `${displayName(c)}  Lv${c.level}`, { size: 12, bold: true, color: '#4e3b2a' });
      label(this, 60, y + 21, `${TYPE_META[sp.types[0]].name}  •  HP ${Math.max(0, c.currentHp)}/${maxHp(c)}`, {
        size: 10,
        color: '#8d6e63',
      });
      new Button(this, GAME_WIDTH - 150, y + 7, 'Info', {
        w: 56,
        h: 24,
        size: 10,
        fill: 0xe7d7c1,
        textColor: '#4e3b2a',
        onClick: () => this.showDetail(c),
      });
      if (kind === 'box') {
        new Button(this, GAME_WIDTH - 88, y + 7, 'Take', {
          w: 62,
          h: 24,
          size: 10,
          fill: 0x6ec6a0,
          enabled: Game.party.length < 6,
          onClick: () => {
            Game.box.splice(Game.box.indexOf(c), 1);
            Game.party.push(c);
            this.scene.restart({ tab: 'box' });
          },
        });
      } else {
        new Button(this, GAME_WIDTH - 88, y + 7, 'Store', {
          w: 62,
          h: 24,
          size: 10,
          fill: 0xf4a261,
          enabled: Game.party.length > 1,
          onClick: () => {
            Game.party.splice(Game.party.indexOf(c), 1);
            Game.box.push(c);
            this.scene.restart({ tab: 'party' });
          },
        });
      }
    });
  }

  private showDetail(c: CreatureInstance) {
    const overlay = this.add.container(0, 0).setDepth(200);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5d4e37, 0.45).setOrigin(0).setInteractive());
    overlay.add(panel(this, 40, 30, GAME_WIDTH - 80, GAME_HEIGHT - 60, { radius: 16 }));
    const sp = speciesOf(c);
    overlay.add(this.add.image(90, 90, `creature_${c.speciesId}`).setScale(0.95));
    overlay.add(label(this, 150, 46, `${displayName(c)}`, { size: 16, bold: true, color: '#4e3b2a' }));
    overlay.add(label(this, 150, 66, `Lv ${c.level}  •  ${TYPE_META[sp.types[0]].name}  •  #${sp.dexNumber}`, {
      size: 11,
      color: TYPE_META[sp.types[0]].cssColor,
    }));
    overlay.add(
      label(
        this,
        150,
        88,
        `HP ${Math.max(0, c.currentHp)}/${maxHp(c)}\nAtk ${getStat(c, 'attack')}   Def ${getStat(c, 'defense')}   Spd ${getStat(c, 'speed')}`,
        { size: 11, color: '#6d4c41' },
      ),
    );
    overlay.add(label(this, 56, 140, 'Moves:', { size: 12, bold: true, color: '#4e3b2a' }));
    getMoves(c).forEach((m, i) => {
      overlay.add(
        label(this, 56, 160 + i * 18, `• ${m.name}  (${TYPE_META[m.type].name}, ${m.power || '—'}pw)`, {
          size: 11,
          color: '#6d4c41',
        }),
      );
    });
    const back = new Button(this, GAME_WIDTH / 2 - 40, GAME_HEIGHT - 56, 'Back', {
      w: 80,
      h: 26,
      fill: 0xe7d7c1,
      textColor: '#4e3b2a',
      onClick: () => overlay.destroy(),
    });
    overlay.add(back);
  }

  // ---------- Bag ----------
  private renderBag() {
    const owned = Game.bag.filter((b) => b.qty > 0);
    if (owned.length === 0) {
      label(this, 20, CONTENT_Y + 10, 'Your bag is empty.', { size: 13, color: '#b9c4e0' });
      return;
    }
    owned.forEach((b, i) => {
      const y = CONTENT_Y + 6 + i * 34;
      if (y > GAME_HEIGHT - 30) return;
      const item = getItem(b.itemId);
      panel(this, 12, y, GAME_WIDTH - 24, 30, { fill: 0xfffaf3, stroke: 0xe7d7c1, radius: 10 });
      label(this, 20, y + 4, `${item.name}  x${b.qty}`, { size: 12, bold: true, color: '#4e3b2a' });
      label(this, 20, y + 18, item.description, { size: 9, color: '#8d6e63' });
    });
  }

  // ---------- Codex ----------
  private renderCodex() {
    const caught = Game.save.dex.caught.length;
    const total = SPECIES_LIST.length;
    label(this, 14, CONTENT_Y, `Caught ${caught} / ${total}`, { size: 12, bold: true });
    label(this, 150, CONTENT_Y, 'green=caught  grey=seen  dark=unknown', {
      size: 9,
      color: '#9fb0d0',
    });

    const cols = 15;
    const cell = 27;
    const startX = 14;
    const startY = CONTENT_Y + 22;
    SPECIES_LIST.forEach((sp, i) => {
      const cx = startX + (i % cols) * cell;
      const cy = startY + Math.floor(i / cols) * cell;
      const seen = Game.isSeen(sp.id);
      const isCaught = Game.isCaught(sp.id);
      const color = isCaught ? TYPE_META[sp.types[0]].color : seen ? 0x5b647e : 0x2a3049;
      const r = this.add
        .rectangle(cx, cy, cell - 3, cell - 3, color)
        .setOrigin(0)
        .setStrokeStyle(1, 0x11151f);
      label(this, cx + 2, cy + 1, `${sp.dexNumber}`, { size: 7, color: '#0c0f18' });
      if (seen) {
        r.setInteractive();
        r.on('pointerdown', () => this.showDexEntry(sp.id, isCaught));
      }
    });
  }

  private showDexEntry(speciesId: string, isCaught: boolean) {
    const sp = SPECIES_LIST.find((s) => s.id === speciesId)!;
    const overlay = this.add.container(0, 0).setDepth(200);
    overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070d, 0.9).setOrigin(0).setInteractive());
    overlay.add(panel(this, 90, 60, GAME_WIDTH - 180, GAME_HEIGHT - 130, { radius: 10 }));
    const img = this.add.image(GAME_WIDTH / 2, 120, `creature_${sp.id}`).setScale(1.6);
    if (!isCaught) img.setTintFill(0x1a1a1a);
    overlay.add(img);
    overlay.add(label(this, GAME_WIDTH / 2, 168, isCaught ? sp.name : '???', { size: 15, bold: true }).setOrigin(0.5));
    overlay.add(
      label(this, GAME_WIDTH / 2, 190, `#${sp.dexNumber}  ${TYPE_META[sp.types[0]].name}`, {
        size: 11,
        color: TYPE_META[sp.types[0]].cssColor,
      }).setOrigin(0.5),
    );
    overlay.add(
      new Button(this, GAME_WIDTH / 2 - 40, GAME_HEIGHT - 92, 'Back', {
        w: 80,
        h: 26,
        onClick: () => overlay.destroy(),
      }),
    );
  }

  // ---------- Shop ----------
  private renderShop() {
    label(this, 14, CONTENT_Y, 'Willowvale Shop', { size: 13, bold: true });
    SHOP_ITEMS.forEach((id, i) => {
      const y = CONTENT_Y + 24 + i * 34;
      if (y > GAME_HEIGHT - 30) return;
      const item = getItem(id);
      panel(this, 12, y, GAME_WIDTH - 24, 30, { fill: 0xfffaf3, stroke: 0xe7d7c1, radius: 10 });
      label(this, 20, y + 4, `${item.name}`, { size: 12, bold: true, color: '#4e3b2a' });
      label(this, 20, y + 18, `¢${item.price}  •  ${item.description}`, { size: 9, color: '#8d6e63' });
      new Button(this, GAME_WIDTH - 92, y + 4, 'Buy', {
        w: 70,
        h: 22,
        size: 11,
        fill: 0x6ec6a0,
        hoverFill: 0x88d8b4,
        onClick: () => {
          if (Game.spendMoney(item.price)) {
            Game.addItem(item.id, 1);
            this.moneyText.setText(`¢ ${Game.money}`);
            this.showToast(`Bought ${item.name}!`);
          } else {
            this.showToast('Not enough money!');
          }
        },
      });
    });
  }

  // ---------- System ----------
  private renderSystem() {
    label(this, 14, CONTENT_Y, 'System', { size: 13, bold: true });
    new Button(this, 20, CONTENT_Y + 24, 'Save Game', {
      w: 180,
      h: 30,
      fill: 0x6ec6a0,
      hoverFill: 0x88d8b4,
      onClick: () => {
        Game.persist();
        this.showToast('Game saved!');
      },
    });
    new Button(this, 20, CONTENT_Y + 62, 'Export Save (copy)', {
      w: 180,
      h: 30,
      fill: 0x90caf9,
      hoverFill: 0xa8d8fb,
      onClick: async () => {
        const text = Game.exportSave();
        try {
          await navigator.clipboard.writeText(text);
          this.showToast('Save copied to clipboard!');
        } catch {
          window.prompt('Copy your save:', text);
        }
      },
    });
    new Button(this, 20, CONTENT_Y + 100, 'Import Save (paste)', {
      w: 180,
      h: 30,
      fill: 0xf4a261,
      onClick: () => {
        const text = window.prompt('Paste a save string:');
        if (text && Game.importSave(text)) {
          this.showToast('Save imported! Reloading...');
          this.time.delayedCall(700, () => {
            this.scene.stop('World');
            this.scene.stop();
            this.scene.start('World');
          });
        } else if (text) {
          this.showToast('Invalid save data.');
        }
      },
    });
    new Button(this, 20, CONTENT_Y + 140, 'Quit to Title', {
      w: 180,
      h: 30,
      fill: 0xe57373,
      hoverFill: 0xef9a9a,
      onClick: () => {
        Game.persist();
        this.scene.stop('World');
        this.scene.stop();
        this.scene.start('Title');
      },
    });
  }

  private showToast(text: string) {
    this.toast?.destroy();
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 60).setDepth(400);
    const t = label(this, 0, 0, text, { size: 12, align: 'center' }).setOrigin(0.5);
    const bg = this.add.graphics();
    const w = t.width + 24;
    bg.fillStyle(0x000000, 0.85).fillRoundedRect(-w / 2, -13, w, 26, 6);
    c.add([bg, t]);
    this.toast = c;
    this.time.delayedCall(1500, () => c.destroy());
  }
}
