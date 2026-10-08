/**
 * Automatische Evolution der Türme entlang des Stammbaums.
 *
 * Alle `checkInterval` Sekunden würfelt jeder Turm, der Nachfahren hat und
 * nicht gesperrt ist. Die Chance steigt mit dem Level und mit der Anzahl
 * gleichartiger Türme auf dem Feld (Populationsdruck). Der Nachfahre wird
 * zufällig aus den direkten Kindern im Stammbaum gewählt.
 */
import { BALANCE } from '../../config/balance';
import { childrenOf, type TowerId } from '../../data/towers';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { globalModifiers } from './ModifierSystem';
import { towerItemModifiers } from './ShopSystem';
import { isUnlocked, metaValues } from './MetaSystem';

export function evolutionChance(level: number, sameTypeCount: number, prestige = 0, globalBonus = 0): number {
  const e = BALANCE.evolution;
  const chance =
    e.baseChance +
    e.perLevel * (level - 1) +
    e.perSameType * Math.max(0, sameTypeCount - 1) +
    BALANCE.prestige.evolutionPerLevel * prestige +
    globalBonus;
  return Math.min(e.maxChance, chance);
}

/** Chance eines konkreten Turms im aktuellen Spielzustand. */
export function evolutionChanceFor(ctx: GameContext, tower: Tower): number {
  return evolutionChance(
    tower.level,
    countSameType(ctx.state.towers, tower.defId),
    tower.prestige,
    globalModifiers(ctx.state).evolution +
      metaValues(ctx.meta).evolutionBase +
      metaValues(ctx.meta).passiveSum.evolution +
      towerItemModifiers(tower.items).evolution,
  );
}

export function countSameType(towers: readonly Tower[], defId: TowerId): number {
  return towers.reduce((n, t) => n + (t.defId === defId ? 1 : 0), 0);
}

/** Nachfahren, die im Globalen Shop freigeschaltet sind. */
export function unlockedChildren(ctx: GameContext, id: TowerId): TowerId[] {
  return childrenOf(id).filter((child) => isUnlocked(ctx.meta, child));
}

export function canEvolve(ctx: GameContext, tower: Tower): boolean {
  return !tower.evolutionLocked && unlockedChildren(ctx, tower.defId).length > 0;
}

export function evolveTower(ctx: GameContext, tower: Tower, to: TowerId): void {
  const from = tower.defId;
  tower.defId = to;
  tower.cooldown = 0;
  tower.evolutionTimer = BALANCE.evolution.checkInterval;
  ctx.state.stats.evolutions++;
  if (!ctx.state.discovered.includes(to)) ctx.state.discovered.push(to);
  ctx.bus.emit('towerEvolved', { tower, from, to });
}

export function updateEvolution(ctx: GameContext, dt: number): void {
  const { state, rng } = ctx;
  for (const tower of state.towers) {
    if (!canEvolve(ctx, tower)) continue;
    tower.evolutionTimer -= dt;
    if (tower.evolutionTimer > 0) continue;
    tower.evolutionTimer += BALANCE.evolution.checkInterval;

    if (!rng.chance(evolutionChanceFor(ctx, tower))) continue;

    evolveTower(ctx, tower, rng.pick(unlockedChildren(ctx, tower.defId)));
  }
}
