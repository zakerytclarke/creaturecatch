import Phaser from 'phaser';

export const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; stroke?: number; alpha?: number; radius?: number } = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const fill = opts.fill ?? 0x2b3350;
  const stroke = opts.stroke ?? 0xffffff;
  const radius = opts.radius ?? 8;
  g.fillStyle(fill, opts.alpha ?? 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, stroke, 0.9);
  g.strokeRoundedRect(x, y, w, h, radius);
  return g;
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { size?: number; color?: string; align?: string; wordWrapWidth?: number; bold?: boolean } = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 12}px`,
    color: opts.color ?? '#ffffff',
    align: opts.align ?? 'left',
    fontStyle: opts.bold ? 'bold' : 'normal',
    wordWrap: opts.wordWrapWidth ? { width: opts.wordWrapWidth } : undefined,
  });
}

export interface ButtonOpts {
  w: number;
  h: number;
  fill?: number;
  hoverFill?: number;
  textColor?: string;
  size?: number;
  onClick: () => void;
  enabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private txt: Phaser.GameObjects.Text;
  private opts: ButtonOpts;
  private enabled: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOpts) {
    super(scene, x, y);
    this.opts = opts;
    this.enabled = opts.enabled ?? true;
    this.bg = scene.add.graphics();
    this.txt = scene.add.text(0, 0, text, {
      fontFamily: FONT,
      fontSize: `${opts.size ?? 13}px`,
      color: opts.textColor ?? '#ffffff',
      fontStyle: 'bold',
    });
    this.txt.setOrigin(0.5);
    this.txt.setPosition(opts.w / 2, opts.h / 2);
    this.add([this.bg, this.txt]);
    this.draw(false);
    this.setSize(opts.w, opts.h);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, opts.w, opts.h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerover', () => this.draw(true));
    this.on('pointerout', () => this.draw(false));
    this.on('pointerdown', () => {
      if (this.enabled) {
        this.draw(true);
        this.opts.onClick();
      }
    });
    scene.add.existing(this);
  }

  setEnabled(v: boolean): this {
    this.enabled = v;
    this.draw(false);
    return this;
  }

  setLabel(text: string): this {
    this.txt.setText(text);
    return this;
  }

  private draw(hover: boolean) {
    const base = this.enabled ? this.opts.fill ?? 0x3d64b0 : 0x3a3f52;
    const fill = hover && this.enabled ? this.opts.hoverFill ?? 0x5081d6 : base;
    this.bg.clear();
    this.bg.fillStyle(fill, 1).fillRoundedRect(0, 0, this.opts.w, this.opts.h, 6);
    this.bg.lineStyle(2, 0xffffff, this.enabled ? 0.85 : 0.3).strokeRoundedRect(0, 0, this.opts.w, this.opts.h, 6);
    this.txt.setAlpha(this.enabled ? 1 : 0.5);
  }
}

export function hpBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  ratio: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  redrawHpBar(g, x, y, w, ratio);
  return g;
}

export function redrawHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  ratio: number,
) {
  const r = Phaser.Math.Clamp(ratio, 0, 1);
  const color = r > 0.5 ? 0x66bb6a : r > 0.2 ? 0xffca28 : 0xef5350;
  g.clear();
  g.fillStyle(0x11151f, 1).fillRoundedRect(x, y, w, 7, 3);
  g.fillStyle(color, 1).fillRoundedRect(x + 1, y + 1, Math.max(0, (w - 2) * r), 5, 2);
}
