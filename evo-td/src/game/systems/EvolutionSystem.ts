/**
 * Automatische Evolution der Türme entlang des Stammbaums.
 *
 * Alle `checkInterval` Sekunden würfelt jeder Turm, der Nachfahren hat und
 * nicht gesperrt ist. Die Chance steigt mit dem Level und mit der Anzahl
 * gleichartiger Türme auf dem Feld (Populationsdruck). Der Nachfahre wird
 * zufällig aus den direkten Kindern im Stammbaum gewählt.
 */
import { BALANCE } from '../../config/balance';
import { getTowerDef, type TowerId } from '../../data/towers';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';

export function evolutionChance(level: number, sameTypeCount: number): number {
  const e = BALANCE.evolution;
  const chance = e.baseChance + e.perLevel * (level - 1) + e.perSameType * Math.max(0, sameTypeCount - 1);
  return Math.min(e.maxChance, chance);
}

export function countSameType(towers: readonly Tower[], defId: TowerId): number {
  return towers.reduce((n, t) => n + (t.defId === defId ? 1 : 0), 0);
}

export function canEvolve(tower: Tower): boolean {
  return !tower.evolutionLocked && getTowerDef(tower.defId).evolvesTo.length > 0;
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
    if (!canEvolve(tower)) continue;
    tower.evolutionTimer -= dt;
    if (tower.evolutionTimer > 0) continue;
    tower.evolutionTimer += BALANCE.evolution.checkInterval;

    const chance = evolutionChance(tower.level, countSameType(state.towers, tower.defId));
    if (!rng.chance(chance)) continue;

    const options = getTowerDef(tower.defId).evolvesTo;
    evolveTower(ctx, tower, rng.pick(options));
  }
}
