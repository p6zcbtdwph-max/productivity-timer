/**
 * Zielwahl und Abfeuern von Projektilen. Die Treffer selbst verarbeitet das
 * ProjectileSystem, damit Schaden immer über den DamageSystem-Pfad läuft.
 */
import { distSq } from '../../core/Vec2';
import type { Targeting } from '../../data/towers';
import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { allocId } from '../GameState';
import { getTowerDef } from '../../data/towers';
import { statsFor } from './StatsSystem';

function enemiesInRange(tower: Tower, range: number, enemies: readonly Enemy[]): Enemy[] {
  const rangeSq = range * range;
  return enemies.filter((e) => e.hp > 0 && distSq(tower, e) <= rangeSq);
}

function sortByTargeting(tower: Tower, targeting: Targeting, candidates: Enemy[]): Enemy[] {
  switch (targeting) {
    case 'first':
      return candidates.sort((a, b) => b.distanceTravelled - a.distanceTravelled);
    case 'strongest':
      return candidates.sort((a, b) => b.hp + b.shield - (a.hp + a.shield));
    case 'closest':
      return candidates.sort((a, b) => distSq(tower, a) - distSq(tower, b));
  }
}

export function updateCombat(ctx: GameContext, dt: number): void {
  const { state } = ctx;
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const stats = statsFor(ctx, tower);
    const candidates = sortByTargeting(tower, stats.targeting, enemiesInRange(tower, stats.range, state.enemies));
    if (candidates.length === 0) {
      tower.cooldown = 0;
      continue;
    }

    const shots = Math.min(stats.targets, candidates.length);
    const color = getTowerDef(tower.defId).color;
    for (let i = 0; i < shots; i++) {
      const target = candidates[i] as Enemy;
      let damage = stats.damage;
      if (stats.critChance > 0 && ctx.rng.chance(stats.critChance)) damage *= stats.critMultiplier;
      state.projectiles.push({
        id: allocId(state),
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        speed: stats.projectileSpeed,
        damage,
        sourceTowerId: tower.id,
        splashRadius: stats.splashRadius,
        shieldBreaker: stats.shieldBreaker,
        onHit: stats.onHit,
        color,
      });
    }
    tower.cooldown += stats.cooldown;
  }
}
