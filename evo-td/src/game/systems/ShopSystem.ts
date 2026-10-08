/**
 * Gold-Shop: globale Upgrades für alle Türme (Stufe für Stufe, unendlich).
 * Items gibt es nicht für Gold, sondern nur als seltene Funde (ItemSystem).
 */
import { UPGRADE_DEFS, upgradeCost, type ModifierKind } from '../../data/upgrades';
import type { GameContext } from '../GameContext';

export function upgradePrice(ctx: GameContext, kind: ModifierKind): number {
  return upgradeCost(UPGRADE_DEFS[kind], ctx.state.upgrades[kind]);
}

export function buyUpgrade(ctx: GameContext, kind: ModifierKind): boolean {
  const price = upgradePrice(ctx, kind);
  if (ctx.state.gameOver || ctx.state.gold < price) return false;
  ctx.state.gold -= price;
  ctx.state.upgrades[kind]++;
  ctx.bus.emit('upgradeBought', { kind, level: ctx.state.upgrades[kind] });
  return true;
}
