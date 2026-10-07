/**
 * Globale Modifikatoren aus Upgrades und ausgerüsteten Items. Wirken auf
 * alle Türme gleichzeitig; Gold kann nie in einen einzelnen Turm fließen.
 */
import { itemPower } from '../../data/items';
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

export function globalModifiers(state: Pick<GameState, 'upgrades' | 'items' | 'equippedItemIds'>): GlobalModifiers {
  const result: GlobalModifiers = { ...NO_MODIFIERS };
  for (const kind of UPGRADE_IDS) {
    result[kind] += UPGRADE_DEFS[kind].perLevel * (state.upgrades[kind] ?? 0);
  }
  for (const id of state.equippedItemIds) {
    const item = state.items.find((i) => i.id === id);
    if (item) result[item.category] += itemPower(item);
  }
  return result;
}
