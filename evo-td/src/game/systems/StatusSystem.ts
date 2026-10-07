/** Statuseffekte auf Gegnern: anlegen, ticken (Gift), ablaufen lassen. */
import type { Enemy, StatusEffect } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { applyDamage } from './DamageSystem';
import type { StatusOnHit } from './StatsSystem';

/** Gleicher Effekt-Typ: der stärkere Wert gewinnt, die Dauer wird aufgefrischt. */
export function applyOnHit(enemy: Enemy, onHit: StatusOnHit): void {
  if (onHit.slow) {
    const existing = enemy.statuses.find((s) => s.kind === 'slow');
    if (existing && existing.kind === 'slow') {
      existing.amount = Math.max(existing.amount, onHit.slow.amount);
      existing.remaining = Math.max(existing.remaining, onHit.slow.duration);
    } else {
      enemy.statuses.push({ kind: 'slow', amount: onHit.slow.amount, remaining: onHit.slow.duration });
    }
  }
  if (onHit.poison) {
    const existing = enemy.statuses.find((s) => s.kind === 'poison');
    if (existing && existing.kind === 'poison') {
      existing.dps = Math.max(existing.dps, onHit.poison.dps);
      existing.remaining = Math.max(existing.remaining, onHit.poison.duration);
    } else {
      enemy.statuses.push({ kind: 'poison', dps: onHit.poison.dps, remaining: onHit.poison.duration });
    }
  }
  if (onHit.antiHeal) {
    const existing = enemy.statuses.find((s) => s.kind === 'antiHeal');
    if (existing && existing.kind === 'antiHeal') {
      existing.percent = Math.max(existing.percent, onHit.antiHeal.percent);
      existing.remaining = Math.max(existing.remaining, onHit.antiHeal.duration);
    } else {
      enemy.statuses.push({ kind: 'antiHeal', percent: onHit.antiHeal.percent, remaining: onHit.antiHeal.duration });
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
        // Ein Element (Titan) kann beim Tod die Statusliste leeren.
        if (enemy.statuses[s] !== status) break;
      }
      if (status.remaining <= 0) enemy.statuses.splice(s, 1);
    }
  }
}
