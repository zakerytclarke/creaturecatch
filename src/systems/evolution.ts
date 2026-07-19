import { getSpecies } from '../data/creatures';
import { getMove } from '../data/moves';
import {
  CreatureInstance,
  maxHp,
  movesUpToLevel,
  speciesOf,
} from '../entities/CreatureInstance';

export function pendingEvolution(inst: CreatureInstance): string | null {
  const species = speciesOf(inst);
  if (species.evolvesTo && inst.level >= species.evolvesTo.atLevel) {
    return species.evolvesTo.speciesId;
  }
  return null;
}

// Mutates the instance into its evolved species, preserving level/xp and healing the
// bonus HP gained. Returns any newly available moves.
export function evolve(inst: CreatureInstance, intoSpeciesId: string): string[] {
  const before = maxHp(inst);
  inst.speciesId = intoSpeciesId;
  const after = maxHp(inst);
  inst.currentHp = Math.min(after, inst.currentHp + (after - before));

  const evolvedSpecies = getSpecies(intoSpeciesId);
  const shouldKnow = movesUpToLevel(evolvedSpecies, inst.level);
  const known = new Set(inst.moves.map((m) => m.moveId));
  const learned: string[] = [];
  for (const moveId of shouldKnow) {
    if (!known.has(moveId)) {
      if (inst.moves.length >= 4) inst.moves.shift();
      inst.moves.push({ moveId, pp: getMove(moveId).pp });
      learned.push(moveId);
    }
  }
  return learned;
}
