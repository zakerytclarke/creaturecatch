import { Move } from '../data/moves';
import { CreatureInstance, getStat, speciesOf } from '../entities/CreatureInstance';
import { effectiveness } from './typeChart';
import { RNG, gameRng } from './rng';

export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  crit: boolean;
  stab: boolean;
}

export function computeDamage(
  attacker: CreatureInstance,
  defender: CreatureInstance,
  move: Move,
  rng: RNG = gameRng,
  attackStage = 0,
  defenseStage = 0,
): DamageResult {
  if (move.power <= 0) {
    return { damage: 0, effectiveness: 1, crit: false, stab: false };
  }

  const atk = getStat(attacker, 'attack') * stageMultiplier(attackStage);
  const def = Math.max(1, getStat(defender, 'defense') * stageMultiplier(defenseStage));

  const attackerTypes = speciesOf(attacker).types;
  const defenderTypes = speciesOf(defender).types;

  const stab = attackerTypes.includes(move.type);
  const eff = effectiveness(move.type, defenderTypes);
  const crit = rng.next() < 1 / 16;

  const base =
    Math.floor(
      Math.floor(((2 * attacker.level) / 5 + 2) * move.power * (atk / def)) / 50,
    ) + 2;

  let dmg = base;
  if (stab) dmg *= 1.5;
  dmg *= eff;
  if (crit) dmg *= 1.5;
  dmg *= rng.float(0.85, 1.0);

  return {
    damage: Math.max(eff === 0 ? 0 : 1, Math.floor(dmg)),
    effectiveness: eff,
    crit,
    stab,
  };
}

export function moveHits(move: Move, rng: RNG = gameRng): boolean {
  if (move.accuracy >= 100) return true;
  return rng.next() * 100 < move.accuracy;
}

// Positive if `a` should act before `b`.
export function faster(a: CreatureInstance, b: CreatureInstance, rng: RNG = gameRng): boolean {
  const sa = getStat(a, 'speed');
  const sb = getStat(b, 'speed');
  if (sa === sb) return rng.next() < 0.5;
  return sa > sb;
}
