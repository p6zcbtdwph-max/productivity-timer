/** Bauen von Türmen. Direkt baubar ist nur der Einzeller. */
import { BALANCE } from '../../config/balance';
import { metaValues } from './MetaSystem';
import { ROOT_TOWER } from '../../data/towers';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import type { ObstacleDef } from '../../data/map';
import { allocId } from '../GameState';

export function currentTowerCost(ctx: GameContext): number {
  return Math.round(BALANCE.economy.towerBaseCost * metaValues(ctx.meta).towerCostGrowth ** ctx.state.towersBuilt);
}

/** Hindernis auf diesem Platz, solange es nicht geräumt ist. */
export function obstacleAt(ctx: GameContext, slot: number): ObstacleDef | undefined {
  const obstacle = ctx.map.obstacles.find((o) => o.slot === slot);
  if (!obstacle || (ctx.state.clearedObstacles ?? []).includes(slot)) return undefined;
  return obstacle;
}

export function isSlotFree(ctx: GameContext, slot: number): boolean {
  return (
    slot >= 0 &&
    slot < ctx.map.buildSlots.length &&
    !obstacleAt(ctx, slot) &&
    !ctx.state.towers.some((t) => t.slot === slot)
  );
}

/** Räumen kostet das 1,5-fache des nächsten Turms (mindestens 50 Gold). */
export function obstacleClearCost(ctx: GameContext): number {
  return Math.max(50, Math.round(currentTowerCost(ctx) * 1.5));
}

export function clearObstacle(ctx: GameContext, slot: number): boolean {
  const obstacle = obstacleAt(ctx, slot);
  const cost = obstacleClearCost(ctx);
  if (!obstacle || ctx.state.gameOver || ctx.state.gold < cost) return false;
  ctx.state.gold -= cost;
  (ctx.state.clearedObstacles ??= []).push(slot);
  ctx.bus.emit('obstacleCleared', { slot, kind: obstacle.kind, cost });
  return true;
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
    prestige: 0,
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
