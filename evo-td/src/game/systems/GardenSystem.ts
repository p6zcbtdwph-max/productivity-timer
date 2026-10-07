/**
 * Garten: Töpfe freischalten, Samen pflanzen, Wachstum in Echtzeit, Harz,
 * Samenfunde nach Wellen und die daraus abgeleiteten Boni.
 */
import { COMPENDIUM_EFFECT_IDS, COMPENDIUM_EFFECTS } from '../../data/compendium';
import {
  GARDEN,
  GARDEN_UPGRADE_DEFS,
  gardenUpgradeCost,
  type GardenUpgradeId,
  hoursForNextLevel,
  RARITIES,
  resinPerHour,
  TREE_DEFS,
  TREE_IDS,
  treeBonus,
  type TreeId,
} from '../../data/garden';
import type { Rng } from '../../core/Rng';
import type { GameContext } from '../GameContext';
import type { MetaState } from '../MetaState';
import type { CompendiumTotals } from './CompendiumSystem';

// --- Töpfe & Pflanzen -------------------------------------------------------

/** Harzpreis für den nächsten Topf (der erste ist geschenkt). */
export function potUnlockCost(meta: MetaState): number | undefined {
  const n = meta.garden.pots.length;
  if (n >= GARDEN.maxPots) return undefined;
  return Math.round(GARDEN.potBaseCost * GARDEN.potGrowth ** Math.max(0, n - 1));
}

export function unlockPot(meta: MetaState): boolean {
  const cost = potUnlockCost(meta);
  if (cost === undefined || meta.garden.resin < cost) return false;
  meta.garden.resin -= cost;
  meta.garden.pots.push({ tree: null, level: 0, growth: 0 });
  return true;
}

// --- Pflege (Harz) ------------------------------------------------------------

export function gardenUpgradeLevel(meta: MetaState, id: GardenUpgradeId): number {
  return meta.garden.upgrades?.[id] ?? 0;
}

export function gardenUpgradePrice(meta: MetaState, id: GardenUpgradeId): number | undefined {
  const def = GARDEN_UPGRADE_DEFS[id];
  const level = gardenUpgradeLevel(meta, id);
  if (level >= def.maxLevel) return undefined;
  return gardenUpgradeCost(def, level);
}

export function buyGardenUpgrade(meta: MetaState, id: GardenUpgradeId): boolean {
  const price = gardenUpgradePrice(meta, id);
  if (price === undefined || meta.garden.resin < price) return false;
  meta.garden.resin -= price;
  meta.garden.upgrades[id] = gardenUpgradeLevel(meta, id) + 1;
  return true;
}

/** Wirkung aller Pflege-Stufen (Faktoren bzw. Zusatzstunden). */
export interface GardenUpgradeValues {
  growthMult: number;
  bonusMult: number;
  resinMult: number;
  seedChanceMult: number;
  rarityLuck: number;
  chamberSpeedMult: number;
  territoryDnaMult: number;
  offlineHours: number;
}

export function gardenUpgradeValues(meta: MetaState): GardenUpgradeValues {
  const v = (id: GardenUpgradeId): number => GARDEN_UPGRADE_DEFS[id].perLevel * gardenUpgradeLevel(meta, id);
  return {
    growthMult: 1 + v('duenger'),
    bonusMult: 1 + v('kompost'),
    resinMult: 1 + v('harzkanal'),
    seedChanceMult: 1 + v('vogelfutter'),
    rarityLuck: v('veredelung'),
    chamberSpeedMult: 1 + v('nistmaterial'),
    territoryDnaMult: 1 + v('wildwechsel'),
    offlineHours: v('laubdecke'),
  };
}

export function plantSeed(meta: MetaState, potIndex: number, tree: TreeId): boolean {
  const pot = meta.garden.pots[potIndex];
  const seeds = meta.garden.seeds[tree] ?? 0;
  if (!pot || pot.tree || seeds <= 0) return false;
  meta.garden.seeds[tree] = seeds - 1;
  pot.tree = tree;
  pot.level = 1;
  pot.growth = 0;
  return true;
}

/** Baum ausgraben: der Topf wird frei, der Baum ist verloren. */
export function uproot(meta: MetaState, potIndex: number): boolean {
  const pot = meta.garden.pots[potIndex];
  if (!pot || !pot.tree) return false;
  pot.tree = null;
  pot.level = 0;
  pot.growth = 0;
  return true;
}

// --- Wachstum ---------------------------------------------------------------

export interface GardenReport {
  resin: number;
  levelUps: { potIndex: number; tree: TreeId; level: number }[];
}

/** Rechnet `seconds` Wachstum ab (Echtzeit, gedeckelt durch den Aufrufer). */
export function tickGarden(meta: MetaState, seconds: number): GardenReport {
  const report: GardenReport = { resin: 0, levelUps: [] };
  if (seconds <= 0) return report;
  const upgrades = gardenUpgradeValues(meta);
  const hours = (seconds / 3600) * upgrades.growthMult;
  const resinMult = upgrades.resinMult / upgrades.growthMult; // Harz läuft in Echtzeit, nicht mit Dünger
  let resin = meta.garden.resinFraction;
  meta.garden.pots.forEach((pot, potIndex) => {
    if (!pot.tree) return;
    let remaining = hours;
    // Harz und Wachstum stückweise, damit Level-ups mitten im Zeitraum zählen
    while (remaining > 0) {
      if (pot.level >= GARDEN.maxLevel) {
        resin += resinPerHour(pot.tree, pot.level) * remaining * resinMult;
        break;
      }
      const toNext = hoursForNextLevel(pot.level) - pot.growth;
      const step = Math.min(remaining, toNext);
      resin += resinPerHour(pot.tree, pot.level) * step * resinMult;
      pot.growth += step;
      remaining -= step;
      if (pot.growth >= hoursForNextLevel(pot.level) - 1e-9) {
        pot.growth = 0;
        pot.level++;
        report.levelUps.push({ potIndex, tree: pot.tree, level: pot.level });
      }
    }
  });
  const whole = Math.floor(resin);
  meta.garden.resinFraction = resin - whole;
  meta.garden.resin += whole;
  meta.garden.resinEarned += whole;
  report.resin = whole;
  return report;
}

// --- Boni -------------------------------------------------------------------

export function gardenTotals(meta: MetaState): CompendiumTotals {
  const totals = Object.fromEntries(COMPENDIUM_EFFECT_IDS.map((e) => [e, 0])) as CompendiumTotals;
  const mult = gardenUpgradeValues(meta).bonusMult;
  for (const pot of meta.garden.pots) {
    if (!pot.tree) continue;
    totals[TREE_DEFS[pot.tree].effect] += treeBonus(pot.tree, pot.level) * mult;
  }
  for (const e of COMPENDIUM_EFFECT_IDS) {
    const cap = COMPENDIUM_EFFECTS[e].cap;
    if (cap !== undefined) totals[e] = Math.min(cap, totals[e]);
  }
  return totals;
}

// --- Samenfund --------------------------------------------------------------

/** Würfelt eine Baumart; `luck` (Veredelung) macht alles außer "häufig" wahrscheinlicher. */
export function rollTree(rng: Rng, luck = 0): TreeId {
  const weight = (id: TreeId): number => {
    const rarity = TREE_DEFS[id].rarity;
    const base = RARITIES[rarity].weight / countOfRarity(rarity);
    return rarity === 'haeufig' ? base : base * (1 + luck);
  };
  const total = TREE_IDS.reduce((sum, id) => sum + weight(id), 0);
  let roll = rng.next() * total;
  for (const id of TREE_IDS) {
    roll -= weight(id);
    if (roll <= 0) return id;
  }
  return TREE_IDS[0] as TreeId;
}

function countOfRarity(rarity: string): number {
  return TREE_IDS.filter((id) => TREE_DEFS[id].rarity === rarity).length;
}

export function seedChance(wave: number, boss: boolean): number {
  if (wave < GARDEN.seedFromWave) return 0;
  return boss ? GARDEN.bossSeedChance : GARDEN.seedChance;
}

/** Nach einer geschafften Welle: vielleicht einen Samen finden. */
export function maybeDropSeed(ctx: GameContext, wave: number, boss: boolean): TreeId | undefined {
  const upgrades = gardenUpgradeValues(ctx.meta);
  if (!ctx.rng.chance(Math.min(1, seedChance(wave, boss) * upgrades.seedChanceMult))) return undefined;
  const tree = rollTree(ctx.rng, upgrades.rarityLuck);
  const garden = ctx.meta.garden;
  garden.seeds[tree] = (garden.seeds[tree] ?? 0) + 1;
  garden.seedsFound++;
  ctx.bus.emit('seedFound', { tree, wave });
  return tree;
}
