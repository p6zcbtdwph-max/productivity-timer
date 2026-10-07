/** Tickt Statuseffekte (Gift-Schaden, Ablaufen von Slow). */
import type { Enemy, StatusEffect } from '../entities/Enemy';
import type { StatusEffectDef } from '../../data/towers';
import type { GameContext } from '../GameContext';
import { applyDamage } from './DamageSystem';

export function applyStatus(enemy: Enemy, def: StatusEffectDef): void {
  // Gleicher Effekt-Typ: der stärkere gewinnt, Dauer wird aufgefrischt.
  const existing = enemy.statuses.find((s) => s.kind === def.kind);
  if (def.kind === 'slow') {
    if (existing && existing.kind === 'slow') {
      existing.factor = Math.min(existing.factor, def.factor);
      existing.remaining = Math.max(existing.remaining, def.duration);
    } else {
      enemy.statuses.push({ kind: 'slow', factor: def.factor, remaining: def.duration });
    }
  } else {
    if (existing && existing.kind === 'poison') {
      existing.dps = Math.max(existing.dps, def.dps);
      existing.remaining = Math.max(existing.remaining, def.duration);
    } else {
      enemy.statuses.push({ kind: 'poison', dps: def.dps, remaining: def.duration });
    }
  }
}

export function updateStatuses(ctx: GameContext, dt: number): void {
  for (let i = ctx.state.enemies.length - 1; i >= 0; i--) {
    const enemy = ctx.state.enemies[i] as Enemy;
    for (let s = enemy.statuses.length - 1; s >= 0; s--) {
      const status = enemy.statuses[s] as StatusEffect;
      status.remaining -= dt;
      if (status.kind === 'poison') {
        // Gift-Kills werden keinem Turm gutgeschrieben (sourceTowerId = 0).
        applyDamage(ctx, enemy, status.dps * dt, 0);
      }
      if (status.remaining <= 0) enemy.statuses.splice(s, 1);
    }
  }
}
