/**
 * Bewegt Gegner entlang der Wegpunkte. Erreicht ein Gegner das Ende,
 * verliert der Spieler ein Leben.
 */
import { BALANCE } from '../../config/balance';
import type { Enemy } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { onEnemyRemoved } from './WaveSystem';

export function effectiveSpeed(enemy: Enemy): number {
  let slow = 0;
  for (const status of enemy.statuses) {
    if (status.kind === 'slow') slow = Math.max(slow, status.amount);
  }
  return enemy.speed * (1 - slow);
}

export function updateMovement(ctx: GameContext, dt: number): void {
  const { state, map } = ctx;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i] as Enemy;
    let remaining = effectiveSpeed(enemy) * dt;

    while (remaining > 0) {
      const target = map.waypoints[enemy.waypointIndex];
      if (!target) {
        state.enemies.splice(i, 1);
        state.lives -= enemy.defId === 'boss' ? BALANCE.player.bossLeakLives : 1;
        ctx.bus.emit('enemyLeaked', { enemy });
        onEnemyRemoved(ctx);
        if (state.lives <= 0 && !state.gameOver) {
          state.gameOver = true;
          ctx.bus.emit('gameOver', { wave: state.wave.current });
        }
        break;
      }
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const toTarget = Math.hypot(dx, dy);
      if (toTarget <= remaining) {
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.distanceTravelled += toTarget;
        remaining -= toTarget;
        enemy.waypointIndex++;
      } else {
        enemy.x += (dx / toTarget) * remaining;
        enemy.y += (dy / toTarget) * remaining;
        enemy.distanceTravelled += remaining;
        remaining = 0;
      }
    }
  }
}
