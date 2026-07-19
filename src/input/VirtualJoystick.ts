import Phaser from 'phaser';

// A lightweight on-screen joystick fixed to the camera. Works with touch and mouse.
// Exposes the current 4-way direction for grid movement.
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

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 34) {
    this.originX = x;
    this.originY = y;
    this.radius = radius;

    this.base = scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.base.fillStyle(0x000000, 0.28).fillCircle(x, y, radius);
    this.base.lineStyle(2, 0xffffff, 0.4).strokeCircle(x, y, radius);

    this.thumb = scene.add.graphics().setScrollFactor(0).setDepth(1001);
    this.drawThumb(x, y);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Only grab pointers that start on the left half of the screen.
      if (p.x < scene.scale.width * 0.55 && this.pointerId === -1) {
        this.active = true;
        this.pointerId = p.id;
        this.updateFromPointer(scene, p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.active && p.id === this.pointerId) this.updateFromPointer(scene, p);
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

  private updateFromPointer(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
    // Convert screen pointer to the fixed camera space.
    const cam = scene.cameras.main;
    const sx = (p.x - cam.x) / cam.zoom;
    const sy = (p.y - cam.y) / cam.zoom;
    let vx = sx - this.originX;
    let vy = sy - this.originY;
    const len = Math.hypot(vx, vy);
    if (len > this.radius) {
      vx = (vx / len) * this.radius;
      vy = (vy / len) * this.radius;
    }
    this.drawThumb(this.originX + vx, this.originY + vy);
    const dead = 8;
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
