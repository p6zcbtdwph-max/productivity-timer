/**
 * Globaler Shop: DNA-Abrechnung am Run-Ende, Freischaltungen von Arten,
 * permanente Upgrades und die daraus abgeleiteten Werte.
 */
import { BALANCE } from '../../config/balance';
import { dnaForWave, META_UPGRADE_DEFS, metaUpgradeCost, REPEAT_WAVE_FACTOR, type MetaUpgradeId } from '../../data/meta';
import { getTowerDef, parentOf, unlockCost, UNLOCK_FROM_TIER, type TowerId } from '../../data/towers';
import type { MetaState } from '../MetaState';

export function metaLevel(meta: MetaState, id: MetaUpgradeId): number {
  return meta.upgrades[id] ?? 0;
}

/** Von Meta-Upgrades abgeleitete Spielwerte. */
export interface MetaValues {
  startGold: number;
  startLives: number;
  towerCostGrowth: number;
  evolutionBase: number;
  /** Multiplikativer Topf "Meta" auf Schaden bzw. Feuerrate. */
  damageMult: number;
  fireRateMult: number;
  /** Additiv auf die Stärke sekundärer Boni (+0.05 je Stufe). */
  inheritance: number;
  itemLuckMult: number;
  itemSlots: number;
  wavesPerRelocate: number;
  dnaMult: number;
  autoFusion: boolean;
}

export function metaValues(meta: MetaState): MetaValues {
  const d = META_UPGRADE_DEFS;
  const lv = (id: MetaUpgradeId): number => metaLevel(meta, id);
  return {
    startGold: BALANCE.player.startGold + d.startGold.perLevel * lv('startGold'),
    startLives: BALANCE.player.startLives + d.startLives.perLevel * lv('startLives'),
    towerCostGrowth: BALANCE.economy.towerCostGrowth - d.towerCost.perLevel * lv('towerCost'),
    evolutionBase: d.evolutionBase.perLevel * lv('evolutionBase'),
    damageMult: 1 + d.damage.perLevel * lv('damage'),
    fireRateMult: 1 + d.fireRate.perLevel * lv('fireRate'),
    inheritance: d.inheritance.perLevel * lv('inheritance'),
    itemLuckMult: 1 + d.itemLuck.perLevel * lv('itemLuck'),
    itemSlots: BALANCE.shop.itemSlots + d.itemSlots.perLevel * lv('itemSlots'),
    wavesPerRelocate: Math.max(2, BALANCE.relocate.wavesPerCharge - d.relocate.perLevel * lv('relocate')),
    dnaMult: 1 + d.dnaGain.perLevel * lv('dnaGain'),
    autoFusion: lv('autoFusion') > 0,
  };
}

// --- DNA ------------------------------------------------------------------

export interface DnaReport {
  wave: number;
  bestWaveBefore: number;
  /** DNA aus Wellen jenseits der bisherigen Bestwelle (voll). */
  fromNewWaves: number;
  /** DNA aus bereits erreichten Wellen (stark reduziert). */
  fromRepeatedWaves: number;
  multiplier: number;
  total: number;
}

export function computeDna(meta: MetaState, wave: number): DnaReport {
  let fromNew = 0;
  let fromRepeated = 0;
  for (let w = 1; w <= wave; w++) {
    if (w > meta.bestWave) fromNew += dnaForWave(w);
    else fromRepeated += dnaForWave(w) * REPEAT_WAVE_FACTOR;
  }
  const multiplier = metaValues(meta).dnaMult;
  return {
    wave,
    bestWaveBefore: meta.bestWave,
    fromNewWaves: Math.round(fromNew * multiplier),
    fromRepeatedWaves: Math.round(fromRepeated * multiplier),
    multiplier,
    total: Math.round(fromNew * multiplier) + Math.round(fromRepeated * multiplier),
  };
}

/** Schließt einen Run ab: DNA gutschreiben, Bestwelle aktualisieren. */
export function settleRun(meta: MetaState, wave: number): DnaReport {
  const report = computeDna(meta, wave);
  meta.dna += report.total;
  meta.totalDnaEarned += report.total;
  meta.bestWave = Math.max(meta.bestWave, wave);
  meta.runs++;
  return report;
}

// --- Freischaltungen --------------------------------------------------------

export function isUnlocked(meta: MetaState, id: TowerId): boolean {
  return getTowerDef(id).tier < UNLOCK_FROM_TIER || meta.unlockedTowers.includes(id);
}

/** Freischaltbar, wenn noch gesperrt, der Elternknoten frei ist und DNA reicht. */
export function canUnlock(meta: MetaState, id: TowerId): boolean {
  if (isUnlocked(meta, id)) return false;
  const parent = parentOf(id);
  if (parent && !isUnlocked(meta, parent)) return false;
  return meta.dna >= unlockCost(id);
}

export function unlockTower(meta: MetaState, id: TowerId): boolean {
  if (!canUnlock(meta, id)) return false;
  meta.dna -= unlockCost(id);
  meta.unlockedTowers.push(id);
  return true;
}

// --- Upgrades ---------------------------------------------------------------

export function metaUpgradePrice(meta: MetaState, id: MetaUpgradeId): number | undefined {
  const def = META_UPGRADE_DEFS[id];
  const level = metaLevel(meta, id);
  if (level >= def.maxLevel) return undefined;
  return metaUpgradeCost(def, level);
}

export function buyMetaUpgrade(meta: MetaState, id: MetaUpgradeId): boolean {
  const price = metaUpgradePrice(meta, id);
  if (price === undefined || meta.dna < price) return false;
  meta.dna -= price;
  meta.upgrades[id] = metaLevel(meta, id) + 1;
  return true;
}
