/**
 * Globale Modifikatoren aus den Run-Upgrades. Wirken auf alle Türme
 * gleichzeitig. Items wirken dagegen nur auf ihren eigenen Turm.
 */
import { UPGRADE_DEFS, UPGRADE_IDS, type ModifierKind } from '../../data/upgrades';
import type { GameState } from '../GameState';

export type GlobalModifiers = Record<ModifierKind, number>;

export const NO_MODIFIERS: GlobalModifiers = {
  damage: 0,
  fireRate: 0,
  range: 0,
  evolution: 0,
  secondary: 0,
  passive: 0,
};

export function globalModifiers(state: Pick<GameState, 'upgrades'>): GlobalModifiers {
  const result: GlobalModifiers = { ...NO_MODIFIERS };
  for (const kind of UPGRADE_IDS) {
    result[kind] += UPGRADE_DEFS[kind].perLevel * (state.upgrades[kind] ?? 0);
  }
  return result;
}
