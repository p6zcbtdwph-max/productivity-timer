/**
 * Einziger Ort, an dem Gegnern Schaden zugefügt wird. Berücksichtigt Schilde
 * und Extra-Leben (Elemente), verteilt XP an den verursachenden Turm, zahlt
 * Gold aus und entfernt tote Gegner.
 */
import { BALANCE } from '../../config/balance';
import { getElementDef } from '../../data/elements';
import type { Enemy } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { grantXp } from './LevelSystem';
import { computeStats } from './StatsSystem';
import { onEnemyRemoved } from './WaveSystem';

export interface DamageOptions {
  /** Zusatzschaden gegen Schilde (1 = +100 %). */
  shieldBreaker?: number;
}

export function applyDamage(
  ctx: GameContext,
  enemy: Enemy,
  rawDamage: number,
  sourceTowerId: number,
  options: DamageOptions = {},
): void {
  if (enemy.hp <= 0) return;
  let remaining = rawDamage;

  // 1. Schild zuerst abbauen.
  if (enemy.shield > 0) {
    const vsShield = remaining * (1 + (options.shieldBreaker ?? 0));
    const absorbed = Math.min(enemy.shield, vsShield);
    enemy.shield -= absorbed;
    remaining = Math.max(0, remaining - absorbed / (1 + (options.shieldBreaker ?? 0)));
  }

  const dealt = Math.min(enemy.hp, remaining);
  enemy.hp -= dealt;

  const tower = sourceTowerId ? ctx.state.towers.find((t) => t.id === sourceTowerId) : undefined;
  const stats = tower ? computeStats(tower) : undefined;
  if (tower && stats) {
    tower.damageDealt += dealt;
    grantXp(ctx, tower, dealt * BALANCE.xp.perDamage * stats.xpMultiplier);
  }

  if (enemy.hp > 0) return;

  // 2. Elemente dürfen den Tod abwenden (Titan: zweites Leben).
  const element = enemy.element ? getElementDef(enemy.element) : undefined;
  if (element?.onLethalDamage?.(enemy)) {
    ctx.bus.emit('enemyRevived', { enemy });
    return;
  }

  // 3. Tod: entfernen, Belohnung, Statistik.
  const index = ctx.state.enemies.indexOf(enemy);
  if (index >= 0) ctx.state.enemies.splice(index, 1);
  const reward = Math.round(enemy.reward * (stats?.goldMultiplier ?? 1));
  ctx.state.gold += reward;
  ctx.state.stats.goldEarned += reward;
  ctx.state.stats.kills++;
  if (tower && stats) {
    tower.kills++;
    grantXp(ctx, tower, BALANCE.xp.perKill * stats.xpMultiplier);
  }
  ctx.bus.emit('enemyKilled', { enemy, byTowerId: sourceTowerId, reward });
  onEnemyRemoved(ctx);
}
