/**
 * Zielwahl und Abfeuern von Projektilen. Die Treffer selbst verarbeitet das
 * ProjectileSystem, damit Schaden immer über den DamageSystem-Pfad läuft.
 */
import { distSq } from '../../core/Vec2';
import { getTowerDef, type Targeting, type TowerDef } from '../../data/towers';
import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { allocId } from '../GameState';
import { levelMultiplier } from './LevelSystem';

export function effectiveDamage(tower: Tower, def: TowerDef = getTowerDef(tower.defId)): number {
  return def.stats.damage * levelMultiplier(tower.level);
}

export function effectiveCooldown(tower: Tower, def: TowerDef = getTowerDef(tower.defId)): number {
  return def.stats.cooldown / levelMultiplier(tower.level);
}

function enemiesInRange(tower: Tower, range: number, enemies: readonly Enemy[]): Enemy[] {
  const rangeSq = range * range;
  return enemies.filter((e) => e.hp > 0 && distSq(tower, e) <= rangeSq);
}

function sortByTargeting(tower: Tower, targeting: Targeting, candidates: Enemy[]): Enemy[] {
  switch (targeting) {
    case 'first':
      return candidates.sort((a, b) => b.distanceTravelled - a.distanceTravelled);
    case 'strongest':
      return candidates.sort((a, b) => b.hp - a.hp);
    case 'closest':
      return candidates.sort((a, b) => distSq(tower, a) - distSq(tower, b));
  }
}

export function updateCombat(ctx: GameContext, dt: number): void {
  const { state } = ctx;
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const def = getTowerDef(tower.defId);
    const candidates = sortByTargeting(tower, def.targeting, enemiesInRange(tower, def.stats.range, state.enemies));
    if (candidates.length === 0) {
      tower.cooldown = 0;
      continue;
    }

    const shots = def.attack.kind === 'multi' ? Math.min(def.attack.targets, candidates.length) : 1;
    for (let i = 0; i < shots; i++) {
      const target = candidates[i] as Enemy;
      let damage = effectiveDamage(tower, def);
      if (def.stats.critChance > 0 && ctx.rng.chance(def.stats.critChance)) {
        damage *= def.stats.critMultiplier;
      }
      state.projectiles.push({
        id: allocId(state),
        x: tower.x,
        y: tower.y,
        targetId: target.id,
        speed: def.stats.projectileSpeed,
        damage,
        sourceTowerId: tower.id,
        attack: def.attack,
        onHit: def.onHit,
        color: def.color,
      });
    }
    tower.cooldown += effectiveCooldown(tower, def);
  }
}
