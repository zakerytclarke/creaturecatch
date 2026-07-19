import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { Game } from '../state/game';
import {
  CreatureInstance,
  displayName,
  getMoves,
  maxHp,
  movesUpToLevel,
  speciesOf,
} from '../entities/CreatureInstance';
import { getMove, Move } from '../data/moves';
import { getSpecies } from '../data/creatures';
import { TYPE_META } from '../data/types';
import { computeDamage, faster, moveHits } from '../systems/battle';
import { effectiveness, effectivenessLabel } from '../systems/typeChart';
import { attemptCatch } from '../systems/catch';
import { pendingEvolution, evolve } from '../systems/evolution';
import { xpForLevel, xpGain, MAX_LEVEL } from '../systems/leveling';
import { getItem } from '../data/items';
import { Button, label, panel, redrawHpBar } from '../ui/ui';
import { gameRng } from '../systems/rng';

export interface BattleData {
  mode: 'wild' | 'trainer';
  wild?: CreatureInstance;
  trainer?: { name: string; team: CreatureInstance[]; bossId?: string; reward?: number };
}

interface QueueItem {
  text: string;
  onShow?: () => void;
}

type Stages = { pAtk: number; pDef: number; eAtk: number; eDef: number };

export class BattleScene extends Phaser.Scene {
  private battleData!: BattleData;
  private enemyTeam!: CreatureInstance[];
  private enemyIndex = 0;
  private playerIndex = 0;
  private player!: CreatureInstance;
  private stages: Stages = { pAtk: 0, pDef: 0, eAtk: 0, eDef: 0 };

  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyName!: Phaser.GameObjects.Text;
  private enemyHp!: Phaser.GameObjects.Graphics;
  private playerName!: Phaser.GameObjects.Text;
  private playerHp!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private msgText!: Phaser.GameObjects.Text;

  private actionObjects: Phaser.GameObjects.GameObject[] = [];
  private queue: QueueItem[] = [];
  private queueDone: (() => void) | null = null;
  private state: 'intro' | 'menu' | 'message' | 'submenu' | 'over' = 'intro';

  // Layout
  private readonly EHP = { x: 22, y: 48, w: 180 };
  private readonly PHP = { x: 232, y: 176, w: 180 };

  constructor() {
    super('Battle');
  }

  private get enemy(): CreatureInstance {
    return this.enemyTeam[this.enemyIndex];
  }

  create(data: BattleData) {
    this.battleData = data;
    this.enemyTeam = data.mode === 'wild' ? [data.wild!] : data.trainer!.team;
    this.enemyIndex = 0;
    this.stages = { pAtk: 0, pDef: 0, eAtk: 0, eDef: 0 };
    this.playerIndex = Math.max(0, Game.firstUsableIndex());
    this.player = Game.party[this.playerIndex];

    this.drawScene();
    Game.markSeen(this.enemy.speciesId);

    const intro =
      data.mode === 'wild'
        ? `A wild ${displayName(this.enemy)} appeared!`
        : `${data.trainer!.name} wants to battle!`;
    this.sequence([{ text: intro }], () => this.toMenu());

    this.input.keyboard!.on('keydown-SPACE', () => this.advance());
    this.input.keyboard!.on('keydown-ENTER', () => this.advance());
    this.input.on('pointerdown', () => {
      if (this.state === 'message') this.advance();
    });
  }

  // ---------- Scene drawing ----------
  private drawScene() {
    this.cameras.main.setBackgroundColor('#33507a');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2c4468).setOrigin(0);
    this.add.rectangle(0, 130, GAME_WIDTH, 90, 0x6fa86a).setOrigin(0);

    // platforms
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(346, 150, 120, 26);
    g.fillEllipse(96, 214, 140, 30);

    this.enemySprite = this.add.image(346, 108, `creature_${this.enemy.speciesId}`).setScale(1.25);
    this.playerSprite = this.add.image(96, 176, `creature_${this.player.speciesId}`).setScale(1.6);

    // Enemy info panel
    panel(this, 14, 24, 214, 44, { fill: 0x1e2942, radius: 6 });
    this.enemyName = label(this, 22, 28, '', { size: 12, bold: true });
    this.enemyHp = this.add.graphics();

    // Player info panel
    panel(this, 224, 150, 214, 56, { fill: 0x1e2942, radius: 6 });
    this.playerName = label(this, 232, 154, '', { size: 12, bold: true });
    this.playerHpText = label(this, 232, 188, '', { size: 10, color: '#b9c4e0' });
    this.playerHp = this.add.graphics();

    // Action box
    panel(this, 8, 210, GAME_WIDTH - 16, 104, { fill: 0x11151f, radius: 8 });
    this.msgText = label(this, 20, 220, '', { size: 13, wordWrapWidth: GAME_WIDTH - 40 });

    this.refreshEnemy();
    this.refreshPlayer();
  }

  private refreshEnemy() {
    const sp = speciesOf(this.enemy);
    this.enemyName.setText(`${displayName(this.enemy)}  Lv${this.enemy.level}  [${TYPE_META[sp.types[0]].name}]`);
    redrawHpBar(this.enemyHp, this.EHP.x, this.EHP.y, this.EHP.w, this.enemy.currentHp / maxHp(this.enemy));
    this.enemySprite.setTexture(`creature_${this.enemy.speciesId}`);
    this.enemySprite.setAlpha(this.enemy.currentHp > 0 ? 1 : 0.3);
  }

  private refreshPlayer() {
    const sp = speciesOf(this.player);
    this.playerName.setText(`${displayName(this.player)}  Lv${this.player.level}  [${TYPE_META[sp.types[0]].name}]`);
    this.playerHpText.setText(`HP ${Math.max(0, this.player.currentHp)}/${maxHp(this.player)}`);
    redrawHpBar(this.playerHp, this.PHP.x, this.PHP.y, this.PHP.w, this.player.currentHp / maxHp(this.player));
    this.playerSprite.setTexture(`creature_${this.player.speciesId}`);
    this.playerSprite.setAlpha(this.player.currentHp > 0 ? 1 : 0.3);
  }

  // ---------- Message queue ----------
  private sequence(items: QueueItem[], done: () => void) {
    this.queue = [...items];
    this.queueDone = done;
    this.state = 'message';
    this.clearActions();
    this.showNext();
  }

  private showNext() {
    const item = this.queue.shift();
    if (!item) {
      const done = this.queueDone;
      this.queueDone = null;
      if (done) done();
      return;
    }
    this.msgText.setText(item.text);
    item.onShow?.();
  }

  private advance() {
    if (this.state !== 'message') return;
    this.showNext();
  }

  // ---------- Action menu ----------
  private clearActions() {
    this.actionObjects.forEach((o) => o.destroy());
    this.actionObjects = [];
  }

  private addAction(o: Phaser.GameObjects.GameObject) {
    this.actionObjects.push(o);
  }

  private grid(i: number): { x: number; y: number } {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return { x: 20 + col * 210, y: 250 + row * 32 };
  }

  private toMenu() {
    this.state = 'menu';
    this.clearActions();
    this.msgText.setText(`What will ${displayName(this.player)} do?`);
    const labels = ['Fight', 'Bag', 'Party', this.battleData.mode === 'wild' ? 'Run' : '—'];
    const actions = [
      () => this.showMoves(),
      () => this.showBag(),
      () => this.showParty(false),
      () => (this.battleData.mode === 'wild' ? this.tryRun() : null),
    ];
    labels.forEach((lbl, i) => {
      const { x, y } = this.grid(i);
      const enabled = !(lbl === '—');
      this.addAction(
        new Button(this, x, y, lbl, { w: 200, h: 28, size: 13, enabled, onClick: actions[i] }),
      );
    });
  }

  private showMoves() {
    this.state = 'submenu';
    this.clearActions();
    this.msgText.setText('Choose a move:');
    const moves = this.player.moves;
    moves.forEach((m, i) => {
      const mv = getMove(m.moveId);
      const { x, y } = this.grid(i);
      this.addAction(
        new Button(this, x, y, `${mv.name}  ${mv.power || '—'}pw  ${m.pp}/${mv.pp}`, {
          w: 200,
          h: 28,
          size: 11,
          fill: TYPE_META[mv.type].color,
          enabled: m.pp > 0,
          onClick: () => this.playerUseMove(i),
        }),
      );
    });
    this.addBack(() => this.toMenu());
  }

  private addBack(onClick: () => void) {
    this.addAction(
      new Button(this, GAME_WIDTH - 78, 218, 'Back', {
        w: 66,
        h: 22,
        size: 11,
        fill: 0x555b70,
        onClick,
      }),
    );
  }

  // ---------- Player actions ----------
  private playerUseMove(moveIndex: number) {
    const slot = this.player.moves[moveIndex];
    if (slot.pp <= 0) return;
    slot.pp -= 1;
    const move = getMove(slot.moveId);
    this.resolveTurn({ actor: 'player', move });
  }

  // Both sides act (unless one is disabled). Order by speed.
  private resolveTurn(playerAction: { actor: 'player'; move: Move }) {
    const items: QueueItem[] = [];
    const playerFirst = faster(this.player, this.enemy, gameRng);
    const enemyMove = this.chooseEnemyMove();

    const doPlayer = () => this.buildAttack('player', playerAction.move, items);
    const doEnemy = () => this.buildAttack('enemy', enemyMove, items);

    if (playerFirst) {
      doPlayer();
      if (this.enemy.currentHp > 0) doEnemy();
    } else {
      doEnemy();
      if (this.player.currentHp > 0) doPlayer();
    }

    this.sequence(items, () => this.afterTurn());
  }

  // Enemy takes a free turn (after catch/run/heal by player).
  private enemyFreeTurn() {
    const items: QueueItem[] = [];
    if (this.enemy.currentHp > 0) this.buildAttack('enemy', this.chooseEnemyMove(), items);
    this.sequence(items, () => this.afterTurn());
  }

  private buildAttack(side: 'player' | 'enemy', move: Move, items: QueueItem[]) {
    const attacker = side === 'player' ? this.player : this.enemy;
    const defender = side === 'player' ? this.enemy : this.player;
    if (attacker.currentHp <= 0) return;

    items.push({ text: `${displayName(attacker)} used ${move.name}!` });

    if (move.category === 'status') {
      this.applyStatus(side, move, items);
      return;
    }

    if (!moveHits(move, gameRng)) {
      items.push({ text: `${displayName(attacker)}'s attack missed!` });
      return;
    }

    const atkStage = side === 'player' ? this.stages.pAtk : this.stages.eAtk;
    const defStage = side === 'player' ? this.stages.eDef : this.stages.pDef;
    const res = computeDamage(attacker, defender, move, gameRng, atkStage, defStage);
    defender.currentHp = Math.max(0, defender.currentHp - res.damage);
    const ratio = defender.currentHp / maxHp(defender);
    items.push({
      text: `It dealt ${res.damage} damage${res.crit ? ' (Critical!)' : ''}.`,
      onShow: () => {
        if (side === 'player') redrawHpBar(this.enemyHp, this.EHP.x, this.EHP.y, this.EHP.w, ratio);
        else this.updatePlayerHpUi();
        this.flash(side === 'player' ? this.enemySprite : this.playerSprite);
      },
    });

    const effLabel = effectivenessLabel(effectiveness(move.type, speciesOf(defender).types));
    if (effLabel) items.push({ text: effLabel });

    if (defender.currentHp <= 0) {
      items.push({
        text: `${displayName(defender)} fainted!`,
        onShow: () => (side === 'player' ? this.refreshEnemy() : this.refreshPlayer()),
      });
    }
  }

  private applyStatus(side: 'player' | 'enemy', move: Move, items: QueueItem[]) {
    const who = side === 'player' ? this.player : this.enemy;
    if (move.effect === 'raiseAttack') {
      if (side === 'player') this.stages.pAtk = Math.min(6, this.stages.pAtk + 1);
      else this.stages.eAtk = Math.min(6, this.stages.eAtk + 1);
      items.push({ text: `${displayName(who)}'s Attack rose!` });
    } else if (move.effect === 'raiseDefense') {
      if (side === 'player') this.stages.pDef = Math.min(6, this.stages.pDef + 1);
      else this.stages.eDef = Math.min(6, this.stages.eDef + 1);
      items.push({ text: `${displayName(who)}'s Defense rose!` });
    } else if (move.effect === 'healSelf') {
      const heal = Math.floor(maxHp(who) * 0.4);
      who.currentHp = Math.min(maxHp(who), who.currentHp + heal);
      items.push({
        text: `${displayName(who)} recovered ${heal} HP!`,
        onShow: () => (side === 'player' ? this.updatePlayerHpUi() : this.refreshEnemy()),
      });
    }
  }

  private updatePlayerHpUi() {
    this.playerHpText.setText(`HP ${Math.max(0, this.player.currentHp)}/${maxHp(this.player)}`);
    redrawHpBar(this.playerHp, this.PHP.x, this.PHP.y, this.PHP.w, this.player.currentHp / maxHp(this.player));
  }

  private flash(sprite: Phaser.GameObjects.Image) {
    this.tweens.add({ targets: sprite, alpha: 0.3, duration: 60, yoyo: true, repeat: 1 });
  }

  private chooseEnemyMove(): Move {
    const moves = getMoves(this.enemy);
    const damaging = moves.filter((m) => m.power > 0);
    if (damaging.length === 0) return moves[0];
    let best = damaging[0];
    let bestScore = -1;
    for (const m of damaging) {
      const eff = effectiveness(m.type, speciesOf(this.player).types);
      const stab = speciesOf(this.enemy).types.includes(m.type) ? 1.5 : 1;
      const score = m.power * eff * stab;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    // Occasionally act sub-optimally to feel less robotic.
    if (gameRng.chance(0.2)) return gameRng.pick(damaging);
    return best;
  }

  // ---------- Turn aftermath ----------
  private afterTurn() {
    if (this.enemy.currentHp <= 0) {
      this.onEnemyFainted();
    } else if (this.player.currentHp <= 0) {
      this.onPlayerFainted();
    } else {
      this.toMenu();
    }
  }

  private onEnemyFainted() {
    const items: QueueItem[] = [];
    const defeated = speciesOf(this.enemy);
    const gained = xpGain(defeated, this.enemy.level);
    this.player.xp += gained;
    items.push({ text: `${displayName(this.player)} gained ${gained} XP!` });
    this.applyLevelUps(items);

    const moreEnemies =
      this.battleData.mode === 'trainer' && this.enemyIndex < this.enemyTeam.length - 1;
    this.sequence(items, () => {
      if (moreEnemies) {
        this.enemyIndex += 1;
        this.stages.eAtk = 0;
        this.stages.eDef = 0;
        this.sequence(
          [{ text: `${this.battleData.trainer!.name} sent out ${displayName(this.enemy)}!`, onShow: () => this.refreshEnemy() }],
          () => this.toMenu(),
        );
      } else {
        this.winBattle();
      }
    });
  }

  private applyLevelUps(items: QueueItem[]) {
    while (
      this.player.level < MAX_LEVEL &&
      this.player.xp >= xpForLevel(this.player.level + 1, speciesOf(this.player).growthRate)
    ) {
      const before = maxHp(this.player);
      this.player.level += 1;
      const after = maxHp(this.player);
      this.player.currentHp += after - before;
      items.push({
        text: `${displayName(this.player)} grew to Lv ${this.player.level}!`,
        onShow: () => this.refreshPlayer(),
      });
      // Learn any new moves for this level.
      const should = movesUpToLevel(getSpecies(this.player.speciesId), this.player.level);
      const known = new Set(this.player.moves.map((m) => m.moveId));
      for (const mv of should) {
        if (!known.has(mv)) {
          if (this.player.moves.length >= 4) this.player.moves.shift();
          this.player.moves.push({ moveId: mv, pp: getMove(mv).pp });
          items.push({ text: `${displayName(this.player)} learned ${getMove(mv).name}!` });
        }
      }
      // Evolution (may chain across multiple thresholds).
      let evoTarget = pendingEvolution(this.player);
      while (evoTarget) {
        const oldName = displayName(this.player);
        evolve(this.player, evoTarget);
        Game.markCaught(this.player.speciesId);
        items.push({
          text: `${oldName} evolved into ${getSpecies(evoTarget).name}!`,
          onShow: () => this.refreshPlayer(),
        });
        evoTarget = pendingEvolution(this.player);
      }
    }
  }

  private onPlayerFainted() {
    const items: QueueItem[] = [{ text: `${displayName(this.player)} fainted!`, onShow: () => this.refreshPlayer() }];
    if (Game.hasUsableCreature()) {
      this.sequence(items, () => this.showParty(true));
    } else {
      items.push({ text: 'You have no creatures left to fight!' });
      this.sequence(items, () => this.endBattle());
    }
  }

  private winBattle() {
    const items: QueueItem[] = [];
    if (this.battleData.mode === 'trainer') {
      const tr = this.battleData.trainer!;
      items.push({ text: `You defeated ${tr.name}!` });
      if (tr.reward) {
        Game.addMoney(tr.reward);
        items.push({ text: `You earned ¢${tr.reward}!` });
      }
      if (tr.bossId) Game.setFlag(`boss_${tr.bossId}`);
    }
    this.sequence(items, () => this.endBattle());
  }

  // ---------- Bag ----------
  private showBag() {
    this.state = 'submenu';
    this.clearActions();
    this.msgText.setText('Use which item?');
    const owned = Game.bag.filter((b) => b.qty > 0);
    if (owned.length === 0) this.msgText.setText('Your bag is empty!');
    owned.slice(0, 4).forEach((b, i) => {
      const item = getItem(b.itemId);
      const { x, y } = this.grid(i);
      const usable = !(item.category === 'catch' && this.battleData.mode === 'trainer');
      this.addAction(
        new Button(this, x, y, `${item.name} x${b.qty}`, {
          w: 200,
          h: 28,
          size: 12,
          enabled: usable,
          onClick: () => this.useItem(item.id),
        }),
      );
    });
    this.addBack(() => this.toMenu());
  }

  private useItem(itemId: string) {
    const item = getItem(itemId);
    if (item.category === 'catch') {
      this.throwOrb(itemId);
    } else {
      // Heal/revive target selection
      this.showItemTargets(itemId);
    }
  }

  private showItemTargets(itemId: string) {
    const item = getItem(itemId);
    this.state = 'submenu';
    this.clearActions();
    this.msgText.setText(`Use ${item.name} on which creature?`);
    Game.party.forEach((c, i) => {
      const { x, y } = this.grid(i % 4);
      const fainted = c.currentHp <= 0;
      const canUse =
        item.category === 'revive' ? fainted : !fainted && c.currentHp < maxHp(c);
      this.addAction(
        new Button(this, x, y, `${displayName(c)} ${Math.max(0, c.currentHp)}/${maxHp(c)}`, {
          w: 200,
          h: 28,
          size: 11,
          enabled: canUse,
          onClick: () => this.applyItem(itemId, i),
        }),
      );
    });
    this.addBack(() => this.showBag());
  }

  private applyItem(itemId: string, partyIndex: number) {
    const item = getItem(itemId);
    const target = Game.party[partyIndex];
    let msg = '';
    if (item.category === 'heal') {
      const amount = Math.min(item.healAmount ?? 0, maxHp(target) - target.currentHp);
      target.currentHp += amount;
      msg = `${displayName(target)} recovered ${amount} HP!`;
    } else if (item.category === 'revive') {
      target.currentHp = Math.floor(maxHp(target) * (item.reviveFraction ?? 0.5));
      msg = `${displayName(target)} was revived!`;
    }
    Game.removeItem(itemId, 1);
    if (partyIndex === this.playerIndex) this.refreshPlayer();
    this.sequence([{ text: msg }], () => this.enemyFreeTurn());
  }

  private throwOrb(itemId: string) {
    const item = getItem(itemId);
    Game.removeItem(itemId, 1);
    const result = attemptCatch(this.enemy, item.ballBonus ?? 1, gameRng);
    const items: QueueItem[] = [{ text: `You threw a ${item.name}!` }];
    if (result.caught) {
      Game.markCaught(this.enemy.speciesId);
      const where = Game.addCreature({ ...this.enemy });
      items.push({ text: `Gotcha! ${displayName(this.enemy)} was caught!` });
      items.push({
        text: where === 'party' ? 'It joined your party.' : 'It was sent to your box.',
      });
      this.sequence(items, () => this.endBattle());
    } else {
      const shakeMsg =
        result.shakes === 0
          ? 'Oh no! It broke free immediately!'
          : `Aww! It broke free after ${result.shakes} shake${result.shakes > 1 ? 's' : ''}!`;
      items.push({ text: shakeMsg });
      this.sequence(items, () => this.enemyFreeTurn());
    }
  }

  // ---------- Party / switching ----------
  private showParty(forced: boolean) {
    this.state = 'submenu';
    this.clearActions();
    this.msgText.setText(forced ? 'Choose your next creature:' : 'Switch to which creature?');
    Game.party.forEach((c, i) => {
      const { x, y } = this.grid(i % 4);
      const isActive = i === this.playerIndex;
      const usable = c.currentHp > 0 && !isActive;
      this.addAction(
        new Button(this, x, y, `${displayName(c)} Lv${c.level} ${Math.max(0, c.currentHp)}/${maxHp(c)}`, {
          w: 200,
          h: 28,
          size: 10,
          enabled: usable,
          onClick: () => this.switchTo(i, forced),
        }),
      );
    });
    if (!forced) this.addBack(() => this.toMenu());
  }

  private switchTo(index: number, forced: boolean) {
    this.playerIndex = index;
    this.player = Game.party[index];
    this.stages.pAtk = 0;
    this.stages.pDef = 0;
    this.refreshPlayer();
    const items: QueueItem[] = [{ text: `Go, ${displayName(this.player)}!` }];
    if (forced) {
      this.sequence(items, () => this.toMenu());
    } else {
      // Voluntary switch costs a turn.
      this.sequence(items, () => this.enemyFreeTurn());
    }
  }

  // ---------- Run ----------
  private tryRun() {
    if (this.battleData.mode !== 'wild') return;
    const escaped = gameRng.chance(0.7);
    if (escaped) {
      this.sequence([{ text: 'Got away safely!' }], () => this.endBattle());
    } else {
      this.sequence([{ text: "Couldn't get away!" }], () => this.enemyFreeTurn());
    }
  }

  // ---------- End ----------
  private endBattle() {
    this.state = 'over';
    Game.persist();
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('World');
    });
  }
}
