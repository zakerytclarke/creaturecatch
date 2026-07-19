import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { Button, label, panel } from '../ui/ui';
import { Game } from '../state/game';
import { STARTER_IDS, getSpecies } from '../data/creatures';
import { TYPE_META } from '../data/types';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#20304a');
    const t = label(this, GAME_WIDTH / 2, 44, 'Creature Catch', { size: 28, bold: true });
    t.setOrigin(0.5);
    const s = label(this, GAME_WIDTH / 2, 78, 'A world of creatures awaits', {
      size: 12,
      color: '#b9c4e0',
    });
    s.setOrigin(0.5);

    // Floating decorative creatures
    STARTER_IDS.forEach((id, i) => {
      const spr = this.add.image(90 + i * 130, 130, `creature_${id}`);
      this.tweens.add({
        targets: spr,
        y: 122,
        duration: 900 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    new Button(this, GAME_WIDTH / 2 - 90, 200, 'New Game', {
      w: 180,
      h: 34,
      onClick: () => this.showStarterSelect(),
    });

    const hasSave = Game.hasSave();
    new Button(this, GAME_WIDTH / 2 - 90, 244, 'Continue', {
      w: 180,
      h: 34,
      enabled: hasSave,
      fill: 0x3a8f5a,
      hoverFill: 0x4bb072,
      onClick: () => {
        if (Game.loadFromStorage()) this.scene.start('World');
      },
    });
  }

  private showStarterSelect() {
    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0f1a, 0.85).setOrigin(0);
    overlay.add(bg);
    overlay.add(panel(this, 20, 40, GAME_WIDTH - 40, GAME_HEIGHT - 80));
    const title = label(this, GAME_WIDTH / 2, 58, 'Choose your first creature', {
      size: 15,
      bold: true,
    });
    title.setOrigin(0.5);
    overlay.add(title);

    STARTER_IDS.forEach((id, i) => {
      const sp = getSpecies(id);
      const cx = 96 + i * 128;
      const spr = this.add.image(cx, 130, `creature_${id}`);
      const nm = label(this, cx, 172, sp.name, { size: 12, bold: true });
      nm.setOrigin(0.5);
      const ty = label(this, cx, 190, TYPE_META[sp.types[0]].name, {
        size: 10,
        color: TYPE_META[sp.types[0]].cssColor,
      });
      ty.setOrigin(0.5);
      overlay.add([spr, nm, ty]);
      const btn = new Button(this, cx - 50, 214, 'Pick', {
        w: 100,
        h: 30,
        onClick: () => {
          Game.newGame('You', id);
          this.scene.start('World');
        },
      });
      overlay.add(btn);
    });
  }
}
