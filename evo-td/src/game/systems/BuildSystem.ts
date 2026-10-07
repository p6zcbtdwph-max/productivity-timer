/** Bauen von Türmen. Direkt baubar ist nur der Einzeller. */
import { BALANCE, towerCost } from '../../config/balance';
import { ROOT_TOWER } from '../../data/towers';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { allocId } from '../GameState';

export function currentTowerCost(ctx: GameContext): number {
  return towerCost(ctx.state.towersBuilt);
}

export function isSlotFree(ctx: GameContext, slot: number): boolean {
  return slot >= 0 && slot < ctx.map.buildSlots.length && !ctx.state.towers.some((t) => t.slot === slot);
}

export function canBuild(ctx: GameContext, slot: number): boolean {
  return !ctx.state.gameOver && isSlotFree(ctx, slot) && ctx.state.gold >= currentTowerCost(ctx);
}

export function buildTower(ctx: GameContext, slot: number): Tower | undefined {
  if (!canBuild(ctx, slot)) return undefined;
  const cell = ctx.map.buildSlots[slot];
  if (!cell) return undefined;
  ctx.state.gold -= currentTowerCost(ctx);
  ctx.state.towersBuilt++;
  const tower: Tower = {
    id: allocId(ctx.state),
    defId: ROOT_TOWER,
    slot,
    x: cell.x + 0.5,
    y: cell.y + 0.5,
    level: 1,
    xp: 0,
    cooldown: 0,
    evolutionTimer: BALANCE.evolution.checkInterval,
    evolutionLocked: false,
    kills: 0,
    damageDealt: 0,
  };
  ctx.state.towers.push(tower);
  ctx.bus.emit('towerBuilt', { tower });
  return tower;
}

/** Idle-Automatik: baut auf einen zufälligen freien Platz, sobald Gold reicht. */
export function updateAutoBuild(ctx: GameContext): void {
  if (!ctx.state.autoBuild || ctx.state.gameOver) return;
  if (ctx.state.gold < currentTowerCost(ctx)) return;
  const free: number[] = [];
  for (let slot = 0; slot < ctx.map.buildSlots.length; slot++) {
    if (isSlotFree(ctx, slot)) free.push(slot);
  }
  if (free.length === 0) return;
  buildTower(ctx, ctx.rng.pick(free));
}
