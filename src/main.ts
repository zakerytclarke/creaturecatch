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
  backgroundColor: '#1c2333',
  pixelArt: true,
  roundPixels: true,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: false },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, BattleScene, MenuScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
