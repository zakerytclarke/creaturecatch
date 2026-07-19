import Phaser from 'phaser';
import { generateAllTextures } from '../gfx/textures';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { label } from '../ui/ui';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    const title = label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'Creature Catch', {
      size: 22,
      bold: true,
    });
    title.setOrigin(0.5);
    const sub = label(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 16, 'Generating world...', {
      size: 12,
      color: '#b9c4e0',
    });
    sub.setOrigin(0.5);

    // Generate all procedural textures, then move on next tick so the label paints.
    this.time.delayedCall(30, () => {
      generateAllTextures(this);
      this.scene.start('Title');
    });
  }
}
