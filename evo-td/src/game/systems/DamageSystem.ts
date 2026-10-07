/**
 * Einziger Ort, an dem Gegnern Schaden zugefügt wird. Verteilt XP an den
 * verursachenden Turm, zahlt Gold aus und entfernt tote Gegner.
 */
import { BALANCE } from '../../config/balance';
import { getTrait } from '../../data/traits';
import type { Enemy } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { grantXp } from './LevelSystem';
import { onEnemyRemoved } from './WaveSystem';

export function applyDamage(ctx: GameContext, enemy: Enemy, rawDamage: number, sourceTowerId: number): void {
  if (enemy.hp <= 0) return;
  let damage = rawDamage;
  for (const traitId of enemy.traits) {
    const modify = getTrait(traitId)?.modifyIncomingDamage;
    if (modify) damage = modify(enemy, damage);
  }
  const dealt = Math.min(enemy.hp, damage);
  enemy.hp -= dealt;

  const tower = sourceTowerId ? ctx.state.towers.find((t) => t.id === sourceTowerId) : undefined;
  if (tower) {
    tower.damageDealt += dealt;
    grantXp(ctx, tower, dealt * BALANCE.xp.perDamage);
  }

  if (enemy.hp <= 0) {
    const index = ctx.state.enemies.indexOf(enemy);
    if (index >= 0) ctx.state.enemies.splice(index, 1);
    ctx.state.gold += enemy.reward;
    ctx.state.stats.goldEarned += enemy.reward;
    ctx.state.stats.kills++;
    if (tower) {
      tower.kills++;
      grantXp(ctx, tower, BALANCE.xp.perKill);
    }
    ctx.bus.emit('enemyKilled', { enemy, byTowerId: sourceTowerId });
    onEnemyRemoved(ctx);
  }
}
