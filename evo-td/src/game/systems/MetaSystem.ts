/**
 * Globaler Shop: DNA-Abrechnung am Run-Ende, Freischaltung von Arten,
 * Artefakte in fester Reihenfolge, Auto-Kauf, Karten-Erfolge und die daraus
 * abgeleiteten Werte.
 */
import { BALANCE } from '../../config/balance';
import { MAPS, type MapAchievementDef, type MapDef } from '../../data/map';
import {
  ARTIFACT_ORDER,
  dnaForWave,
  META_UPGRADE_DEFS,
  metaUpgradeCost,
  REPEAT_WAVE_FACTOR,
  type MetaUpgradeId,
} from '../../data/meta';
import { getTowerDef, parentOf, unlockXp, UNLOCK_FROM_TIER, type TowerId } from '../../data/towers';
import { overallBestWave, type MetaState } from '../MetaState';
import { compendiumTotals, speciesXp, type CompendiumTotals } from './CompendiumSystem';
import { gardenTotals } from './GardenSystem';
import { nestUpgradeValues } from './NestSystem';
import { ITEMS } from '../../data/items';

export function metaLevel(meta: MetaState, id: MetaUpgradeId): number {
  return meta.upgrades[id] ?? 0;
}

export function bestWaveOn(meta: MetaState, mapId: string): number {
  return meta.bestWaveByMap[mapId] ?? 0;
}

// --- Karten-Erfolge ---------------------------------------------------------

export interface AchievementStatus {
  mapId: string;
  mapName: string;
  kind: MapAchievementDef['kind'];
  bestWave: number;
  milestones: number;
  nextAt: number;
  /** Aktueller Bonus (z.B. 0.3 = +30 % Schaden). */
  bonus: number;
}

export function achievementStatus(meta: MetaState): AchievementStatus[] {
  return MAPS.map((map) => {
    const best = bestWaveOn(meta, map.id);
    const milestones = Math.floor(best / map.achievement.every);
    return {
      mapId: map.id,
      mapName: map.name,
      kind: map.achievement.kind,
      bestWave: best,
      milestones,
      nextAt: (milestones + 1) * map.achievement.every,
      bonus: milestones * map.achievement.perMilestone,
    };
  });
}

// --- Abgeleitete Werte --------------------------------------------------------

export interface MetaValues {
  startGold: number;
  startLives: number;
  towerCostGrowth: number;
  evolutionBase: number;
  /** Multiplikativer Topf "Meta" (Artefakte) auf Schaden bzw. Feuerrate. */
  damageMult: number;
  fireRateMult: number;
  /** Multiplikativer Topf "Erfolge" (Karten-Erfolge) auf Schaden, Feuerrate und DNA. */
  achievementDamageMult: number;
  achievementFireRateMult: number;
  achievementDnaMult: number;
  /** Additiv auf die Stärke sekundärer Boni (+0.05 je Stufe). */
  inheritance: number;
  /** Items: Qualitäts-Glück, Ausrüstungsplätze, Fundchance, Stärke, Verschmelzen. */
  itemLuckMult: number;
  itemSlots: number;
  itemFindMult: number;
  itemPowerMult: number;
  itemMerge: boolean;
  wavesPerRelocate: number;
  dnaMult: number;
  autoFusion: boolean;
  autoUpgrades: boolean;
  autoArtifacts: boolean;
  /** Passiv-Modus */
  chamberSpeedMult: number;
  mapSlots: number;
  passiveEggMult: number;
  offlineCapSeconds: number;
  offlinePower: number;
  /** Kompendium-Boni aller je gezüchteten Arten. */
  compendium: CompendiumTotals;
  /** Boni der Bäume im Garten. */
  garden: CompendiumTotals;
  /** Kompendium + Garten für alle Effekte ohne eigenen Topf (Krit, Gold, XP, ...). */
  passiveSum: CompendiumTotals;
}

export function metaValues(meta: MetaState): MetaValues {
  const d = META_UPGRADE_DEFS;
  const lv = (id: MetaUpgradeId): number => metaLevel(meta, id);
  const nest = nestUpgradeValues(meta);
  const compendium = compendiumTotals(meta);
  const garden = gardenTotals(meta);
  const passiveSum = Object.fromEntries(
    (Object.keys(compendium) as (keyof CompendiumTotals)[]).map((k) => [k, compendium[k] + garden[k]]),
  ) as CompendiumTotals;
  const ach = { damage: 0, fireRate: 0, dna: 0 };
  for (const a of achievementStatus(meta)) ach[a.kind] += a.bonus;
  return {
    startGold: BALANCE.player.startGold + d.startGold.perLevel * lv('startGold'),
    startLives: BALANCE.player.startLives + d.startLives.perLevel * lv('startLives'),
    towerCostGrowth: BALANCE.economy.towerCostGrowth - d.towerCost.perLevel * lv('towerCost'),
    evolutionBase: d.evolutionBase.perLevel * lv('evolutionBase'),
    damageMult: 1 + d.damage.perLevel * lv('damage'),
    fireRateMult: 1 + d.fireRate.perLevel * lv('fireRate'),
    achievementDamageMult: 1 + ach.damage,
    achievementFireRateMult: 1 + ach.fireRate,
    achievementDnaMult: 1 + ach.dna,
    inheritance: d.inheritance.perLevel * lv('inheritance'),
    itemLuckMult: 1 + d.itemLuck.perLevel * lv('itemLuck'),
    itemSlots: ITEMS.baseSlots + d.itemSlots.perLevel * lv('itemSlots'),
    itemFindMult: 1 + d.itemFind.perLevel * lv('itemFind'),
    itemPowerMult: 1 + d.itemPower.perLevel * lv('itemPower'),
    itemMerge: lv('itemMerge') > 0,
    wavesPerRelocate: Math.max(2, BALANCE.relocate.wavesPerCharge - d.relocate.perLevel * lv('relocate')),
    dnaMult: 1 + d.dnaGain.perLevel * lv('dnaGain'),
    autoFusion: lv('autoFusion') > 0,
    autoUpgrades: lv('autoUpgrades') > 0,
    autoArtifacts: lv('autoArtifacts') > 0,
    chamberSpeedMult: (1 + d.hatchery.perLevel * lv('hatchery')) * nest.chamberSpeedMult,
    mapSlots: BALANCE.passive.mapSlots + d.territory.perLevel * lv('territory'),
    passiveEggMult: (1 + d.amber.perLevel * lv('amber')) * nest.territoryEggMult,
    offlineCapSeconds: (BALANCE.passive.offlineCapHours + d.hibernation.perLevel * lv('hibernation') + nest.offlineHours) * 3600,
    offlinePower: Math.min(1, BALANCE.passive.offlinePower + d.winterFur.perLevel * lv('winterFur')),
    compendium,
    garden,
    passiveSum,
  };
}

// --- DNA ------------------------------------------------------------------

export interface DnaReport {
  mapId: string;
  wave: number;
  bestWaveBefore: number;
  /** DNA aus Wellen jenseits der bisherigen Bestwelle dieser Karte (voll). */
  fromNewWaves: number;
  /** DNA aus bereits erreichten Wellen (stark reduziert). */
  fromRepeatedWaves: number;
  multiplier: number;
  total: number;
  /** Neue Karten-Erfolge durch diesen Run. */
  newMilestones: number;
  /** Artefakt-Stufen, die der Auto-Kauf erworben hat. */
  autoBought: MetaUpgradeId[];
}

export function computeDna(meta: MetaState, mapId: string, wave: number): DnaReport {
  const best = bestWaveOn(meta, mapId);
  let fromNew = 0;
  let fromRepeated = 0;
  for (let w = 1; w <= wave; w++) {
    if (w > best) fromNew += dnaForWave(w);
    else fromRepeated += dnaForWave(w) * REPEAT_WAVE_FACTOR;
  }
  const values = metaValues(meta);
  const multiplier = values.dnaMult * values.achievementDnaMult;
  const newRounded = Math.round(fromNew * multiplier);
  const repeatRounded = Math.round(fromRepeated * multiplier);
  const every = MAPS.find((m) => m.id === mapId)?.achievement.every ?? Infinity;
  return {
    mapId,
    wave,
    bestWaveBefore: best,
    fromNewWaves: newRounded,
    fromRepeatedWaves: repeatRounded,
    multiplier,
    total: newRounded + repeatRounded,
    newMilestones: Math.max(0, Math.floor(wave / every) - Math.floor(best / every)),
    autoBought: [],
  };
}

/** Schließt einen Run ab: DNA gutschreiben, Bestwelle, Auto-Kauf von Artefakt-Stufen. */
export function settleRun(meta: MetaState, mapId: string, wave: number): DnaReport {
  const report = computeDna(meta, mapId, wave);
  meta.dna += report.total;
  meta.totalDnaEarned += report.total;
  meta.bestWaveByMap[mapId] = Math.max(bestWaveOn(meta, mapId), wave);
  meta.runs++;
  report.autoBought = runAutoArtifacts(meta);
  return report;
}

// --- Karten ------------------------------------------------------------------

export function isMapUnlocked(meta: MetaState, map: MapDef): boolean {
  return !map.unlock || bestWaveOn(meta, map.unlock.mapId) >= map.unlock.wave;
}

// --- Arten freischalten -------------------------------------------------------

/**
 * Eine Art ist frei, wenn ihr Tier unter UNLOCK_FROM_TIER liegt oder ihre
 * Elternart genug Kompendium-XP gesammelt hat. `unlockedTowers` enthält
 * frühere DNA-Freischaltungen und Entwickler-Freischaltungen; sie bleiben gültig.
 */
export function isUnlocked(meta: MetaState, id: TowerId): boolean {
  if (getTowerDef(id).tier < UNLOCK_FROM_TIER || meta.unlockedTowers.includes(id)) return true;
  const parent = parentOf(id);
  return !!parent && speciesXp(meta, parent) >= unlockXp(id);
}

/** Fortschritt zur Freischaltung: gesammelte XP der Elternart und benötigte XP. */
export function unlockProgress(meta: MetaState, id: TowerId): { parent: TowerId | null; xp: number; need: number } {
  const parent = parentOf(id);
  return { parent, xp: parent ? speciesXp(meta, parent) : 0, need: unlockXp(id) };
}

// --- Artefakte ----------------------------------------------------------------

export type ArtifactState = 'owned' | 'next' | 'locked';

export function artifactState(meta: MetaState, id: MetaUpgradeId): ArtifactState {
  if (metaLevel(meta, id) > 0) return 'owned';
  const index = ARTIFACT_ORDER.findIndex((a) => a.id === id);
  const previous = ARTIFACT_ORDER[index - 1];
  if (!previous || metaLevel(meta, previous.id) > 0) return 'next';
  return 'locked';
}

/** Kann das (nächste) Artefakt jetzt freigeschaltet werden? */
export function canUnlockArtifact(meta: MetaState, id: MetaUpgradeId): boolean {
  const def = META_UPGRADE_DEFS[id];
  return artifactState(meta, id) === 'next' && overallBestWave(meta) >= def.unlockWave && meta.dna >= def.unlockCost;
}

export function unlockArtifact(meta: MetaState, id: MetaUpgradeId): boolean {
  if (!canUnlockArtifact(meta, id)) return false;
  meta.dna -= META_UPGRADE_DEFS[id].unlockCost;
  meta.upgrades[id] = 1;
  return true;
}

/** Preis von Stufe `level` auf `level + 1` (für Mehrfachkauf). */
export function metaUpgradeCostAt(id: MetaUpgradeId, level: number): number {
  return metaUpgradeCost(META_UPGRADE_DEFS[id], level);
}

/** Preis der nächsten Stufe eines besessenen Artefakts (undefined = max oder nicht besessen). */
export function metaUpgradePrice(meta: MetaState, id: MetaUpgradeId): number | undefined {
  const def = META_UPGRADE_DEFS[id];
  const level = metaLevel(meta, id);
  if (level === 0 || level >= def.maxLevel) return undefined;
  return metaUpgradeCost(def, level);
}

export function buyMetaUpgrade(meta: MetaState, id: MetaUpgradeId): boolean {
  const price = metaUpgradePrice(meta, id);
  if (price === undefined || meta.dna < price) return false;
  meta.dna -= price;
  meta.upgrades[id] = metaLevel(meta, id) + 1;
  return true;
}

/** Auto-Kauf (Artefakt "Gedächtnis"): billigste gewählte Stufe kaufen, bis DNA nicht mehr reicht. */
export function runAutoArtifacts(meta: MetaState): MetaUpgradeId[] {
  if (!metaValues(meta).autoArtifacts) return [];
  const bought: MetaUpgradeId[] = [];
  for (let guard = 0; guard < 1000; guard++) {
    let best: { id: MetaUpgradeId; price: number } | undefined;
    for (const def of ARTIFACT_ORDER) {
      if (!meta.autoArtifacts[def.id]) continue;
      const price = metaUpgradePrice(meta, def.id);
      if (price === undefined || price > meta.dna) continue;
      if (!best || price < best.price) best = { id: def.id, price };
    }
    if (!best) break;
    buyMetaUpgrade(meta, best.id);
    bought.push(best.id);
  }
  return bought;
}
