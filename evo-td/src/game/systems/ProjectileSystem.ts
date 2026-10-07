/** Bewegt Projektile zum Ziel und wendet beim Treffer Schaden/Effekte an. */
import { distSq } from '../../core/Vec2';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import type { GameContext } from '../GameContext';
import { applyDamage } from './DamageSystem';
import { applyOnHit } from './StatusSystem';

const HIT_DISTANCE = 0.15;

function hit(ctx: GameContext, projectile: Projectile, target: Enemy): void {
  const r = projectile.splashRadius;
  const victims: Enemy[] = r > 0 ? ctx.state.enemies.filter((e) => distSq(e, target) <= r * r) : [target];
  for (const victim of victims) {
    applyOnHit(victim, projectile.onHit);
    const category = projectile.crit ? 'krit' : r > 0 ? 'flaeche' : 'direkt';
    applyDamage(ctx, victim, projectile.damage, projectile.sourceTowerId, { shieldBreaker: projectile.shieldBreaker, category });
  }
}

export function updateProjectiles(ctx: GameContext, dt: number): void {
  const { state } = ctx;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i] as Projectile;
    const target = state.enemies.find((e) => e.id === projectile.targetId);
    if (!target) {
      state.projectiles.splice(i, 1); // Ziel tot oder durch: Projektil verfällt.
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * dt;
    if (distance <= step + HIT_DISTANCE) {
      state.projectiles.splice(i, 1);
      hit(ctx, projectile, target);
    } else {
      projectile.x += (dx / distance) * step;
      projectile.y += (dy / distance) * step;
    }
  }
}
