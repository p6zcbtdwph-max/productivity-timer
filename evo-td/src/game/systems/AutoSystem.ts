/**
 * Auto-Kauf von Run-Upgrades (freigeschaltet durch das Artefakt "Instinkt",
 * an/aus im Shop). Läuft einmal pro Welle (beim Start der nächsten Welle) und
 * nur, wenn gerade kein neuer Turm gekauft werden kann.
 *
 * Halbwegs smart: Er schaut, wie weit die Roboter seit dem letzten Kauf
 * gekommen sind.
 *  - Gefahr (ein Roboter kam über die Hälfte des Weges oder brach durch):
 *    Schaden und Feuerrate zuerst, Reichweite und sekundäre Effekte danach.
 *  - Ruhig: zuerst Gold (Passiv), die anderen gewichtet dahinter.
 * Gekauft wird jeweils das Upgrade mit dem besten Verhältnis Gewicht/Preis,
 * solange Gold reicht.
 */
import { UPGRADE_IDS, type ModifierKind } from '../../data/upgrades';
import type { GameContext } from '../GameContext';
import { currentTowerCost, isSlotFree } from './BuildSystem';
import { metaValues } from './MetaSystem';
import { buyUpgrade, upgradePrice } from './ShopSystem';

export type AutoMode = 'gefahr' | 'ruhig';

/** Ab diesem Anteil des Weges gilt eine Welle als gefährlich. */
export const DANGER_THRESHOLD = 0.5;

export const AUTO_WEIGHTS: Readonly<Record<AutoMode, Record<ModifierKind, number>>> = {
  gefahr: { damage: 3, fireRate: 3, range: 1.5, secondary: 1, passive: 0.6, evolution: 0.5 },
  ruhig: { passive: 3, damage: 1.5, fireRate: 1.5, range: 1, secondary: 1, evolution: 0.8 },
};

export function canBuildNewTower(ctx: GameContext): boolean {
  if (ctx.state.gold < currentTowerCost(ctx)) return false;
  for (let slot = 0; slot < ctx.map.buildSlots.length; slot++) if (isSlotFree(ctx, slot)) return true;
  return false;
}

export function autoMode(ctx: GameContext): AutoMode {
  const wave = ctx.state.wave;
  return (wave.leaks ?? 0) > 0 || (wave.danger ?? 0) >= DANGER_THRESHOLD ? 'gefahr' : 'ruhig';
}

/** Einmal pro Welle aufgerufen. Gibt die gekauften Upgrades zurück. */
export function runAutoUpgrades(ctx: GameContext): ModifierKind[] {
  const { state, meta } = ctx;
  const bought: ModifierKind[] = [];
  const mode = autoMode(ctx);
  // Gefahr-Messung für die nächste Welle zurücksetzen.
  state.wave.danger = 0;
  state.wave.leaks = 0;
  if (state.gameOver || !metaValues(meta).autoUpgrades || !meta.autoUpgradeEnabled) return bought;
  if (canBuildNewTower(ctx)) return bought;

  const weights = AUTO_WEIGHTS[mode];
  for (let guard = 0; guard < 50; guard++) {
    let best: { kind: ModifierKind; score: number } | undefined;
    for (const kind of UPGRADE_IDS) {
      const price = upgradePrice(ctx, kind);
      if (price > state.gold) continue;
      const score = weights[kind] / price;
      if (!best || score > best.score) best = { kind, score };
    }
    if (!best) break;
    buyUpgrade(ctx, best.kind);
    bought.push(best.kind);
  }
  if (bought.length > 0) ctx.bus.emit('autoUpgraded', { kinds: bought, mode });
  return bought;
}
