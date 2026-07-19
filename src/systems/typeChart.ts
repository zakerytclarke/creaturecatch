import { EFFECTIVENESS, ElementType } from '../data/types';

// Multiplier of an attacking type against one or two defending types (multiplies across).
export function effectiveness(attacking: ElementType, defending: ElementType[]): number {
  return defending.reduce((mult, def) => mult * EFFECTIVENESS[attacking][def], 1);
}

export function effectivenessLabel(mult: number): string {
  if (mult === 0) return 'It has no effect...';
  if (mult >= 2) return "It's super effective!";
  if (mult < 1) return "It's not very effective...";
  return '';
}
