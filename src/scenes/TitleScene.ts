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
    this.cameras.main.setBackgroundColor('#64b5f6');
    this.add.image(GAME_WIDTH / 2, 90, 'battle_sky');
    this.add.image(GAME_WIDTH / 2, 250, 'battle_ground');

    const brand = label(this, GAME_WIDTH / 2, 36, 'Creature Catch', {
      size: 30,
      bold: true,
      color: '#ffffff',
    });
    brand.setOrigin(0.5);
    brand.setShadow(0, 3, '#1565c0', 0.35, true, true);

    const s = label(this, GAME_WIDTH / 2, 68, 'Explore · Catch · Grow', {
      size: 13,
      color: '#4e3b2a',
    });
    s.setOrigin(0.5);

    // Floating starter showcase on soft rings
    STARTER_IDS.forEach((id, i) => {
      const x = 90 + i * 130;
      this.add.image(x, 150, 'battle_ring').setScale(0.7).setAlpha(0.85);
      const spr = this.add.image(x, 128, `creature_${id}`).setScale(0.85);
      this.tweens.add({
        targets: spr,
        y: 120,
        duration: 900 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    new Button(this, GAME_WIDTH / 2 - 90, 196, 'New Adventure', {
      w: 180,
      h: 34,
      fill: 0x6ec6a0,
      hoverFill: 0x88d8b4,
      onClick: () => this.showStarterSelect(),
    });

    const hasSave = Game.hasSave();
    new Button(this, GAME_WIDTH / 2 - 90, 238, 'Continue', {
      w: 180,
      h: 34,
      enabled: hasSave,
      fill: 0xf4a261,
      hoverFill: 0xf6b57a,
      onClick: () => {
        if (Game.loadFromStorage()) this.scene.start('World');
      },
    });

    new Button(this, GAME_WIDTH / 2 - 90, 280, 'Review Creatures', {
      w: 180,
      h: 30,
      fill: 0x64b5f6,
      hoverFill: 0x90caf9,
      onClick: () => {
        const base = import.meta.env.BASE_URL || '/';
        window.location.href = `${base}review.html`;
      },
    });
  }

  private showStarterSelect() {
    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x5d4e37, 0.45).setOrigin(0);
    overlay.add(bg);
    overlay.add(panel(this, 20, 36, GAME_WIDTH - 40, GAME_HEIGHT - 70, { radius: 18 }));
    const title = label(this, GAME_WIDTH / 2, 52, 'Choose your first friend', {
      size: 15,
      bold: true,
      color: '#4e3b2a',
    });
    title.setOrigin(0.5);
    overlay.add(title);

    STARTER_IDS.forEach((id, i) => {
      const sp = getSpecies(id);
      const cx = 96 + i * 128;
      overlay.add(this.add.image(cx, 128, 'battle_ring').setScale(0.65));
      const spr = this.add.image(cx, 108, `creature_${id}`).setScale(0.8);
      const nm = label(this, cx, 168, sp.name, { size: 12, bold: true, color: '#4e3b2a' });
      nm.setOrigin(0.5);
      const ty = label(this, cx, 186, TYPE_META[sp.types[0]].name, {
        size: 10,
        color: TYPE_META[sp.types[0]].cssColor,
      });
      ty.setOrigin(0.5);
      overlay.add([spr, nm, ty]);
      const btn = new Button(this, cx - 50, 208, 'Pick', {
        w: 100,
        h: 30,
        fill: 0x6ec6a0,
        hoverFill: 0x88d8b4,
        onClick: () => {
          Game.newGame('You', id);
          this.scene.start('World');
        },
      });
      overlay.add(btn);
    });
  }
}
