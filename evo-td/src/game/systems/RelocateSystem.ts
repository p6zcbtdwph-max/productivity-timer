/**
 * Verlegen von Türmen: alle N Wellen gibt es eine Verlegung, jede kostet Gold
 * (Anteil der aktuellen Turmkosten). Verlegungen sammeln sich an.
 */
import { BALANCE } from '../../config/balance';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { currentTowerCost, isSlotFree } from './BuildSystem';

export function relocateCharges(ctx: GameContext): number {
  const earned = Math.floor(ctx.state.wave.current / BALANCE.relocate.wavesPerCharge);
  return Math.max(0, earned - ctx.state.relocatesUsed);
}

export function relocateCost(ctx: GameContext): number {
  return Math.round(currentTowerCost(ctx) * BALANCE.relocate.costFactor);
}

export function canRelocate(ctx: GameContext, toSlot: number): boolean {
  return (
    !ctx.state.gameOver &&
    relocateCharges(ctx) > 0 &&
    ctx.state.gold >= relocateCost(ctx) &&
    isSlotFree(ctx, toSlot)
  );
}

export function relocateTower(ctx: GameContext, tower: Tower, toSlot: number): boolean {
  if (!canRelocate(ctx, toSlot)) return false;
  const cell = ctx.map.buildSlots[toSlot];
  if (!cell) return false;
  ctx.state.gold -= relocateCost(ctx);
  ctx.state.relocatesUsed++;
  const fromSlot = tower.slot;
  tower.slot = toSlot;
  tower.x = cell.x + 0.5;
  tower.y = cell.y + 0.5;
  tower.cooldown = 0;
  ctx.bus.emit('towerRelocated', { tower, fromSlot, toSlot });
  return true;
}
