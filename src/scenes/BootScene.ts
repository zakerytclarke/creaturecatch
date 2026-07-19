import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scale.on('orientationchange', () => this.scale.refresh());
    this.scene.start('Preload');
  }
}
