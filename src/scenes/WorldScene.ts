import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { Game } from '../state/game';
import { getRegion } from '../data/regions';
import { generateMap, MapData, T, WALKABLE } from '../world/mapgen';
import { TILE } from '../gfx/textures';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { Button, label } from '../ui/ui';
import { createInstance } from '../entities/CreatureInstance';
import { rollEncounter, pickSpawn } from '../systems/encounters';
import { BattleData } from './BattleScene';

const STEP_MS = 150;

const FACING: Record<string, { dx: number; dy: number; tex: string }> = {
  down: { dx: 0, dy: 1, tex: 'player_down' },
  up: { dx: 0, dy: -1, tex: 'player_up' },
  left: { dx: -1, dy: 0, tex: 'player_left' },
  right: { dx: 1, dy: 0, tex: 'player_right' },
};

export class WorldScene extends Phaser.Scene {
  private map!: MapData;
  private player!: Phaser.GameObjects.Image;
  private tileX = 0;
  private tileY = 0;
  private facing: keyof typeof FACING = 'down';
  private moving = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private joystick!: VirtualJoystick;
  private regionLabel!: Phaser.GameObjects.Text;
  private moneyLabel!: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Container;
  private bossSprite?: Phaser.GameObjects.Container;
  private interactCooldown = 0;

  constructor() {
    super('World');
  }

  create() {
    const regionId = Game.save.player.regionId;
    const region = getRegion(regionId);
    this.map = generateMap(regionId);
    const skyByBiome: Record<string, string> = {
      town: '#87ceeb',
      forest: '#7ec8e8',
      beach: '#6ec6f0',
      desert: '#f0d9a0',
      highlands: '#8ec8f0',
      cave: '#2a2438',
    };
    this.cameras.main.setBackgroundColor(skyByBiome[regionId] ?? '#87ceeb');

    this.renderMap();

    this.tileX = Game.save.player.tileX;
    this.tileY = Game.save.player.tileY;
    if (!this.isInside(this.tileX, this.tileY)) {
      this.tileX = this.map.spawnX;
      this.tileY = this.map.spawnY;
    }

    this.player = this.add
      .image(this.px(this.tileX), this.py(this.tileY), 'player_down')
      .setDepth(50);

    const w = this.map.width * TILE;
    const h = this.map.height * TILE;
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.setupBoss(region);
    this.setupInput();
    this.setupHud(region);

    // Debug hooks for automated smoke testing.
    (window as unknown as { __ccDebug?: unknown }).__ccDebug = {
      battle: (id: string, lvl: number) => this.startWildBattle(id, lvl),
      trainer: () => this.startTrainerBattle(),
    };

    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    });
  }

  private px(tx: number) {
    return tx * TILE + TILE / 2;
  }
  private py(ty: number) {
    return ty * TILE + TILE / 2;
  }
  private isInside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height;
  }

  private tileTexture(code: number, biome: string): string {
    switch (code) {
      case T.GROUND:
        return `ground_${biome}`;
      case T.TALL:
        return `tall_${biome}`;
      case T.BLOCK:
        return `block_${biome}`;
      case T.WATER:
        return 'sp_water';
      case T.WARP:
        return 'sp_warp';
      case T.HEAL:
        return 'sp_heal';
      case T.SHOP:
        return 'sp_shop';
      case T.FLOWER:
        return 'sp_flower';
      case T.PATH:
        return 'sp_path';
      default:
        return `ground_${biome}`;
    }
  }

  private renderMap() {
    const biome = getRegion(this.map.regionId).biome;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const code = this.map.tiles[y][x];
        // Draw ground under non-ground special tiles for seamless look.
        this.add.image(this.px(x), this.py(y), this.tileTexture(code, biome)).setDepth(0);
      }
    }
    // Warp labels (town)
    this.map.warps.forEach((wp) => {
      if (wp.label && this.map.regionId === 'town') {
        const t = label(this, this.px(wp.x), this.py(wp.y) - 16, wp.label, {
          size: 8,
          color: '#fff8ef',
          align: 'center',
        });
        t.setOrigin(0.5).setDepth(20);
        t.setShadow(0, 1, '#5d4e37', 0.5, true, true);
      }
    });
  }

  private setupBoss(region: ReturnType<typeof getRegion>) {
    if (!this.map.boss || !region.boss) return;
    if (Game.getFlag(`boss_${region.boss.id}`)) return;
    const { x, y } = this.map.boss;
    const aceId = region.boss.team[region.boss.team.length - 1].speciesId;
    const c = this.add.container(this.px(x), this.py(y)).setDepth(40);
    const spr = this.add.image(0, 0, `creature_${aceId}`).setScale(0.55);
    const mark = label(this, 0, -22, '!', { size: 16, bold: true, color: '#ffd54f' });
    mark.setOrigin(0.5);
    c.add([spr, mark]);
    this.tweens.add({ targets: mark, y: -26, duration: 600, yoyo: true, repeat: -1 });
    this.bossSprite = c;
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ENTER,ESC,M',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => this.interact());
    kb.on('keydown-ENTER', () => this.interact());
    kb.on('keydown-M', () => this.openMenu());
    kb.on('keydown-ESC', () => this.openMenu());

    this.joystick = new VirtualJoystick(this, 52, GAME_HEIGHT - 52);
  }

  private setupHud(region: ReturnType<typeof getRegion>) {
    this.regionLabel = label(this, 8, 6, region.name, { size: 12, bold: true, color: '#fff8ef' });
    this.regionLabel.setScrollFactor(0).setDepth(1000);
    this.regionLabel.setShadow(0, 2, '#5d4e37', 0.45, true, true);
    this.moneyLabel = label(this, 8, 22, `¢ ${Game.money}`, { size: 10, color: '#fff3c4' });
    this.moneyLabel.setScrollFactor(0).setDepth(1000);
    this.moneyLabel.setShadow(0, 2, '#5d4e37', 0.45, true, true);

    const menuBtn = new Button(this, GAME_WIDTH - 74, 6, 'Menu', {
      w: 66,
      h: 24,
      size: 11,
      fill: 0xf4a261,
      hoverFill: 0xf6b57a,
      onClick: () => this.openMenu(),
    });
    menuBtn.setScrollFactor(0).setDepth(1000);

    const actBtn = new Button(this, GAME_WIDTH - 74, GAME_HEIGHT - 54, 'A', {
      w: 48,
      h: 48,
      size: 18,
      fill: 0x6ec6a0,
      hoverFill: 0x88d8b4,
      onClick: () => this.interact(),
    });
    actBtn.setScrollFactor(0).setDepth(1000);
  }

  update(_time: number, delta: number) {
    if (this.interactCooldown > 0) this.interactCooldown -= delta;
    if (this.moving) return;

    let dir: keyof typeof FACING | null = null;
    const k = this.keys;
    const j = this.joystick.direction();
    if (k.LEFT.isDown || k.A.isDown || j.x < 0) dir = 'left';
    else if (k.RIGHT.isDown || k.D.isDown || j.x > 0) dir = 'right';
    else if (k.UP.isDown || k.W.isDown || j.y < 0) dir = 'up';
    else if (k.DOWN.isDown || k.S.isDown || j.y > 0) dir = 'down';

    if (dir) this.tryStep(dir);
  }

  private tryStep(dir: keyof typeof FACING) {
    this.facing = dir;
    const f = FACING[dir];
    this.player.setTexture(f.tex);
    const nx = this.tileX + f.dx;
    const ny = this.tileY + f.dy;
    if (!this.canWalk(nx, ny)) return;

    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: this.px(nx),
      y: this.py(ny),
      duration: STEP_MS,
      onComplete: () => {
        this.tileX = nx;
        this.tileY = ny;
        this.moving = false;
        this.onEnterTile();
      },
    });
  }

  private canWalk(x: number, y: number): boolean {
    if (!this.isInside(x, y)) return false;
    if (!WALKABLE.has(this.map.tiles[y][x])) return false;
    if (this.bossSprite && this.map.boss && this.map.boss.x === x && this.map.boss.y === y) {
      return false;
    }
    return true;
  }

  private onEnterTile() {
    Game.save.player.tileX = this.tileX;
    Game.save.player.tileY = this.tileY;
    const code = this.map.tiles[this.tileY][this.tileX];
    if (code === T.WARP) {
      const wp = this.map.warps.find((w) => w.x === this.tileX && w.y === this.tileY);
      if (wp) this.warpTo(wp.target);
    } else if (code === T.TALL) {
      const region = getRegion(this.map.regionId);
      if (rollEncounter(region.encounterRate)) {
        const spawn = pickSpawn(region);
        if (spawn) this.startWildBattle(spawn.speciesId, spawn.level);
      }
    }
  }

  private warpTo(target: string) {
    const dest = generateMap(target);
    Game.save.player.regionId = target;
    Game.save.player.tileX = dest.spawnX;
    Game.save.player.tileY = dest.spawnY;
    Game.persist();
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }

  private startWildBattle(speciesId: string, level: number) {
    const wild = createInstance(speciesId, level);
    const data: BattleData = { mode: 'wild', wild };
    Game.persist();
    this.launchBattle(data);
  }

  private startTrainerBattle() {
    const region = getRegion(this.map.regionId);
    if (!region.boss) return;
    const team = region.boss.team.map((m) => createInstance(m.speciesId, m.level));
    const data: BattleData = {
      mode: 'trainer',
      trainer: {
        name: region.boss.name,
        team,
        bossId: region.boss.id,
        reward: region.boss.reward,
      },
    };
    Game.persist();
    this.launchBattle(data);
  }

  private launchBattle(data: BattleData) {
    this.scene.launch('Battle', data);
    this.scene.pause();
  }

  private interact() {
    if (this.moving || this.interactCooldown > 0) return;
    this.interactCooldown = 250;
    const f = FACING[this.facing];
    const fx = this.tileX + f.dx;
    const fy = this.tileY + f.dy;
    if (!this.isInside(fx, fy)) return;

    // Boss?
    if (this.bossSprite && this.map.boss && this.map.boss.x === fx && this.map.boss.y === fy) {
      this.startTrainerBattle();
      return;
    }
    const code = this.map.tiles[fy][fx];
    if (code === T.HEAL) {
      Game.healParty();
      Game.persist();
      this.showToast('Your creatures are fully healed!');
    } else if (code === T.SHOP) {
      this.scene.launch('Menu', { tab: 'shop' });
      this.scene.pause();
    }
  }

  private openMenu() {
    if (this.moving) return;
    this.scene.launch('Menu', { tab: 'party' });
    this.scene.pause();
  }

  private onResume() {
    this.moneyLabel.setText(`¢ ${Game.money}`);
    // Boss defeated during battle -> remove marker.
    const region = getRegion(this.map.regionId);
    if (this.bossSprite && region.boss && Game.getFlag(`boss_${region.boss.id}`)) {
      this.bossSprite.destroy();
      this.bossSprite = undefined;
    }
    // Blackout handling.
    if (!Game.hasUsableCreature()) {
      Game.healParty();
      Game.save.player.regionId = 'town';
      const townSpawn = generateMap('town');
      Game.save.player.tileX = townSpawn.spawnX;
      Game.save.player.tileY = townSpawn.spawnY;
      Game.persist();
      this.showToast('You blacked out! Rushed back to town.');
      this.time.delayedCall(600, () => this.scene.restart());
    } else {
      Game.persist();
    }
  }

  private showToast(text: string) {
    this.toast?.destroy();
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 24).setScrollFactor(0).setDepth(2000);
    const t = label(this, 0, 0, text, { size: 11, align: 'center' });
    t.setOrigin(0.5);
    const bg = this.add.graphics();
    const pad = 10;
    const w = t.width + pad * 2;
    bg.fillStyle(0x11151f, 0.9).fillRoundedRect(-w / 2, -12, w, 24, 6);
    c.add([bg, t]);
    this.toast = c;
    this.time.delayedCall(1800, () => c.destroy());
  }
}
