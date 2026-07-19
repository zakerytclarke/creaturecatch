import Phaser from 'phaser';

/**
 * On-screen joystick fixed to the camera.
 * Uses Scale-Manager game coordinates (pointer.x/y) — do NOT re-project via camera.
 */
export class VirtualJoystick {
  private base: Phaser.GameObjects.Graphics;
  private thumb: Phaser.GameObjects.Graphics;
  private originX: number;
  private originY: number;
  private radius: number;
  private active = false;
  private pointerId = -1;
  private dx = 0;
  private dy = 0;
  private gameWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 34) {
    this.originX = x;
    this.originY = y;
    this.radius = radius;
    this.gameWidth = scene.scale.gameSize.width;

    this.base = scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.base.fillStyle(0x000000, 0.28).fillCircle(x, y, radius);
    this.base.lineStyle(2, 0xffffff, 0.4).strokeCircle(x, y, radius);

    this.thumb = scene.add.graphics().setScrollFactor(0).setDepth(1001);
    this.drawThumb(x, y);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Left third only — avoid stealing Menu / A / battle UI clicks.
      if (p.x < this.gameWidth * 0.38 && this.pointerId === -1) {
        this.active = true;
        this.pointerId = p.id;
        this.updateFromPointer(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.active && p.id === this.pointerId) this.updateFromPointer(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) {
        this.active = false;
        this.pointerId = -1;
        this.dx = 0;
        this.dy = 0;
        this.drawThumb(this.originX, this.originY);
      }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  private updateFromPointer(p: Phaser.Input.Pointer) {
    // pointer.x/y are already in game-resolution space under Scale.FIT.
    let vx = p.x - this.originX;
    let vy = p.y - this.originY;
    const len = Math.hypot(vx, vy);
    if (len > this.radius) {
      vx = (vx / len) * this.radius;
      vy = (vy / len) * this.radius;
    }
    this.drawThumb(this.originX + vx, this.originY + vy);
    const dead = 10;
    if (Math.hypot(vx, vy) < dead) {
      this.dx = 0;
      this.dy = 0;
    } else if (Math.abs(vx) > Math.abs(vy)) {
      this.dx = Math.sign(vx);
      this.dy = 0;
    } else {
      this.dx = 0;
      this.dy = Math.sign(vy);
    }
  }

  private drawThumb(x: number, y: number) {
    this.thumb.clear();
    this.thumb.fillStyle(0xffffff, 0.55).fillCircle(x, y, this.radius * 0.45);
  }

  direction(): { x: number; y: number } {
    return { x: this.dx, y: this.dy };
  }

  setVisible(v: boolean) {
    this.base.setVisible(v);
    this.thumb.setVisible(v);
  }
}
