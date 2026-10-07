/**
 * Roboter-Anpassung (Modus der Roboterfabrik, "Wettrüsten").
 *
 * Jeder Schaden wird einer Art zugeordnet: direkt, Fläche, Gift oder Krit.
 * Alle `every` Wellen werden die Roboter gegen die Art resistenter, die seit
 * der letzten Anpassung den meisten Schaden gemacht hat. Wer einseitig baut,
 * wird ausgebremst; gemischte Linien halten länger.
 */
import { createAdaptation, DAMAGE_CATEGORIES, type AdaptationState, type DamageCategory } from '../GameState';
import type { GameContext } from '../GameContext';

export const CATEGORY_NAMES: Readonly<Record<DamageCategory, string>> = {
  direkt: 'Direkt',
  flaeche: 'Fläche',
  gift: 'Gift',
  krit: 'Krit',
};

function adaptation(ctx: GameContext): AdaptationState {
  return (ctx.state.adaptation ??= createAdaptation());
}

/** Zählt den Schaden und gibt den Schaden nach Resistenz zurück. */
export function applyResistance(ctx: GameContext, damage: number, category: DamageCategory): number {
  if (!ctx.map.adaptive) return damage;
  const a = adaptation(ctx);
  a.tally[category] += damage;
  return damage * (1 - a.resist[category]);
}

/**
 * Wird bei jedem Wellenstart gerufen. Fällig ist eine Anpassung je volle
 * `every` Wellen; auch wenn Wellen übersprungen werden, geht keine verloren
 * (pro Wellenstart höchstens eine, damit sie einzeln angekündigt werden).
 */
export function adaptRobots(ctx: GameContext): void {
  const mode = ctx.map.adaptive;
  if (!mode) return;
  const a = adaptation(ctx);
  const due = Math.floor(ctx.state.wave.current / mode.every);
  if ((a.stage ?? 0) >= due) return;
  a.stage = (a.stage ?? 0) + 1;
  let best: DamageCategory | undefined;
  for (const c of DAMAGE_CATEGORIES) {
    if (a.tally[c] > 0 && (!best || a.tally[c] > a.tally[best])) best = c;
  }
  for (const c of DAMAGE_CATEGORIES) a.tally[c] = 0;
  if (!best) return;
  a.resist[best] = Math.min(mode.max, a.resist[best] + mode.step);
  ctx.bus.emit('robotsAdapted', { category: best, resist: a.resist[best] });
}
