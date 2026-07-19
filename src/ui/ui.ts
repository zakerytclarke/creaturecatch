import Phaser from 'phaser';

export const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", sans-serif';

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; stroke?: number; alpha?: number; radius?: number } = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const fill = opts.fill ?? 0xfff8ef;
  const stroke = opts.stroke ?? 0xd7c4a8;
  const radius = opts.radius ?? 14;
  // Soft drop shadow (AC card feel)
  g.fillStyle(0x5d4e37, 0.18);
  g.fillRoundedRect(x + 2, y + 3, w, h, radius);
  g.fillStyle(fill, opts.alpha ?? 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(3, stroke, 0.95);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1.5, 0xffffff, 0.65);
  g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, radius - 2);
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
    color: opts.color ?? '#4e3b2a',
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
    // Containers default to origin 0.5 which desyncs hitboxes from drawn UI.
    // Phaser typings omit setOrigin on Container in this version; runtime has it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).setOrigin(0, 0);
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
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, opts.w, opts.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerover', () => this.draw(true));
    this.on('pointerout', () => this.draw(false));
    this.on('pointerup', () => {
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
    const base = this.enabled ? this.opts.fill ?? 0x6ec6a0 : 0xb0a89c;
    const fill = hover && this.enabled ? this.opts.hoverFill ?? 0x88d8b4 : base;
    this.bg.clear();
    this.bg.fillStyle(0x5d4e37, 0.2).fillRoundedRect(2, 3, this.opts.w, this.opts.h, 12);
    this.bg.fillStyle(fill, 1).fillRoundedRect(0, 0, this.opts.w, this.opts.h, 12);
    this.bg.lineStyle(3, 0xffffff, this.enabled ? 0.7 : 0.25).strokeRoundedRect(0, 0, this.opts.w, this.opts.h, 12);
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
  g.fillStyle(0xd7c4a8, 1).fillRoundedRect(x, y, w, 8, 4);
  g.fillStyle(0xffffff, 1).fillRoundedRect(x + 1, y + 1, w - 2, 6, 3);
  g.fillStyle(color, 1).fillRoundedRect(x + 1, y + 1, Math.max(0, (w - 2) * r), 6, 3);
}
