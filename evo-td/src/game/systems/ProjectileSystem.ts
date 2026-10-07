/** Bewegt Projektile zum Ziel und wendet beim Treffer Schaden/Effekte an. */
import { distSq } from '../../core/Vec2';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import type { GameContext } from '../GameContext';
import { applyDamage } from './DamageSystem';
import { applyStatus } from './StatusSystem';

const HIT_DISTANCE = 0.15;

function hit(ctx: GameContext, projectile: Projectile, target: Enemy): void {
  const attack = projectile.attack;
  const victims: Enemy[] =
    attack.kind === 'splash'
      ? ctx.state.enemies.filter((e) => distSq(e, target) <= attack.radius * attack.radius)
      : [target];

  for (const victim of victims) {
    for (const effect of projectile.onHit) applyStatus(victim, effect);
    applyDamage(ctx, victim, projectile.damage, projectile.sourceTowerId);
  }
}

export function updateProjectiles(ctx: GameContext, dt: number): void {
  const { state } = ctx;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i] as Projectile;
    const target = state.enemies.find((e) => e.id === projectile.targetId);
    if (!target) {
      // Ziel ist bereits tot oder durch: Projektil verfällt.
      state.projectiles.splice(i, 1);
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
