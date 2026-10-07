/**
 * Auto-Kauf von Run-Upgrades (freigeschaltet durch das Artefakt "Instinkt").
 * Kauft einmal pro Sekunde das billigste ausgewählte Upgrade. Ist Auto-Bau
 * aktiv und noch ein Platz frei, bleibt Gold für den nächsten Turm reserviert.
 */
import { UPGRADE_IDS } from '../../data/upgrades';
import type { GameContext } from '../GameContext';
import { currentTowerCost, isSlotFree } from './BuildSystem';
import { metaValues } from './MetaSystem';
import { buyUpgrade, upgradePrice } from './ShopSystem';

const INTERVAL = 1;

export function autoUpgradeReserve(ctx: GameContext): number {
  if (!ctx.state.autoBuild) return 0;
  for (let slot = 0; slot < ctx.map.buildSlots.length; slot++) {
    if (isSlotFree(ctx, slot)) return currentTowerCost(ctx);
  }
  return 0;
}

export function updateAutoUpgrades(ctx: GameContext, dt: number): void {
  const { state, meta } = ctx;
  if (state.gameOver || !metaValues(meta).autoUpgrades) return;
  state.autoUpgradeTimer -= dt;
  if (state.autoUpgradeTimer > 0) return;
  state.autoUpgradeTimer = INTERVAL;

  const reserve = autoUpgradeReserve(ctx);
  for (let guard = 0; guard < 20; guard++) {
    let best: { kind: (typeof UPGRADE_IDS)[number]; price: number } | undefined;
    for (const kind of UPGRADE_IDS) {
      if (!meta.autoUpgrades[kind]) continue;
      const price = upgradePrice(ctx, kind);
      if (state.gold - price < reserve) continue;
      if (!best || price < best.price) best = { kind, price };
    }
    if (!best) return;
    buyUpgrade(ctx, best.kind);
  }
}
