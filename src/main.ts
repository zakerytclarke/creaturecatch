import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';
import { MenuScene } from './scenes/MenuScene';

export const GAME_WIDTH = 448;
export const GAME_HEIGHT = 320;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#87ceeb',
  pixelArt: false,
  roundPixels: false,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, BattleScene, MenuScene],
};

const game = new Phaser.Game(config);
// Expose for automated smoke tests / debugging.
(window as unknown as { __cc_game: Phaser.Game }).__cc_game = game;
