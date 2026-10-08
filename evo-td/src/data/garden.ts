/**
 * Garten: Bäume aus der Pflanzen-Evolution wachsen in Töpfen. Samen findet
 * man zufällig nach geschafften Wellen. Bäume wachsen in Echtzeit sehr langsam,
 * geben dauerhaft einen kleinen Bonus und produzieren Harz (neue Währung).
 */
import type { CompendiumEffect } from './compendium';

export type TreeId = 'moos' | 'farn' | 'schachtelhalm' | 'ginkgo' | 'kiefer' | 'eiche' | 'magnolie' | 'mammutbaum';

export type TreeRarity = 'haeufig' | 'selten' | 'sehr_selten' | 'legendaer';

export interface RarityDef {
  id: TreeRarity;
  name: string;
  color: string;
  /** Anteil beim Samenwurf. */
  weight: number;
  /** Multiplikator auf Bonus und Harz. */
  power: number;
}

export const RARITIES: Readonly<Record<TreeRarity, RarityDef>> = {
  // Gacha-artig: seltene Samen sind extrem selten (Anteile pro gefundenem Samen).
  haeufig: { id: 'haeufig', name: 'häufig', color: '#9e9e9e', weight: 90, power: 1 },
  selten: { id: 'selten', name: 'selten', color: '#4fc3f7', weight: 8.5, power: 1.5 },
  sehr_selten: { id: 'sehr_selten', name: 'sehr selten', color: '#ba68c8', weight: 1.4, power: 2 },
  legendaer: { id: 'legendaer', name: 'legendär', color: '#ffb300', weight: 0.1, power: 3 },
};

export interface TreeDef {
  id: TreeId;
  name: string;
  lineage: string;
  rarity: TreeRarity;
  effect: CompendiumEffect;
  /** Bonus je Level (vor Seltenheits-Multiplikator). */
  perLevel: number;
  color: string;
  description: string;
}

export const TREE_DEFS: Readonly<Record<TreeId, TreeDef>> = {
  moos: { id: 'moos', name: 'Moos', lineage: 'Bryophyta', rarity: 'haeufig', effect: 'gold', perLevel: 0.01, color: '#7cb342', description: 'Erste Landpflanze. Sammelt, was liegen bleibt.' },
  farn: { id: 'farn', name: 'Farn', lineage: 'Pteridophyta', rarity: 'haeufig', effect: 'evolution', perLevel: 0.0005, color: '#558b2f', description: 'Uralte Sporen beschleunigen Mutationen.' },
  schachtelhalm: { id: 'schachtelhalm', name: 'Schachtelhalm', lineage: 'Equisetum', rarity: 'haeufig', effect: 'xp', perLevel: 0.01, color: '#9ccc65', description: 'Wuchs einst baumhoch. Lehrt Geduld.' },
  ginkgo: { id: 'ginkgo', name: 'Ginkgo', lineage: 'Ginkgophyta', rarity: 'selten', effect: 'range', perLevel: 0.004, color: '#fdd835', description: 'Lebendes Fossil. Seine Blätter schärfen den Blick.' },
  kiefer: { id: 'kiefer', name: 'Kiefer', lineage: 'Pinophyta', rarity: 'selten', effect: 'fireRate', perLevel: 0.008, color: '#2e7d32', description: 'Harzreich und zäh. Hält alle in Bewegung.' },
  eiche: { id: 'eiche', name: 'Eiche', lineage: 'Fagaceae', rarity: 'selten', effect: 'damage', perLevel: 0.01, color: '#8d6e63', description: 'Stark wie ihr Holz.' },
  magnolie: { id: 'magnolie', name: 'Magnolie', lineage: 'Magnoliales (erste Blütenpflanzen)', rarity: 'sehr_selten', effect: 'critChance', perLevel: 0.002, color: '#f48fb1', description: 'Blühte schon unter Dinosauriern. Ihr Duft findet Schwachstellen.' },
  mammutbaum: { id: 'mammutbaum', name: 'Mammutbaum', lineage: 'Sequoioideae', rarity: 'legendaer', effect: 'damage', perLevel: 0.012, color: '#bf360c', description: 'Der größte Baum der Welt. Wächst Jahrtausende.' },
};

export const TREE_IDS = Object.keys(TREE_DEFS) as TreeId[];

export const GARDEN = {
  /** Man beginnt mit einem Topf. Der zweite kostet so viel Harz, jeder weitere das `potGrowth`-fache. */
  potBaseCost: 20,
  potGrowth: 3,
  maxPots: 6,
  /** Stunden für Level n → n+1 = hoursPerLevel × n. */
  hoursPerLevel: 1,
  maxLevel: 100,
  /** Harz pro Stunde = resinPerLevel × Level × Seltenheit. */
  resinPerLevel: 0.2,
  /** Samenchance nach einer geschafften Welle (ab `seedFromWave`), bei Bosswellen höher. Sehr selten. */
  seedChance: 0.003,
  bossSeedChance: 0.03,
  /** Basis-Samen, den jeder Garten zu Beginn hat. */
  starterSeed: 'moos' as TreeId,
  seedFromWave: 5,
} as const;

/** Stunden, um von `level` auf `level + 1` zu wachsen. */
export function hoursForNextLevel(level: number): number {
  return GARDEN.hoursPerLevel * level;
}

/** Bonus eines Baums auf einem Level. */
export function treeBonus(id: TreeId, level: number): number {
  const def = TREE_DEFS[id];
  return def.perLevel * level * RARITIES[def.rarity].power;
}

export function resinPerHour(id: TreeId, level: number): number {
  return GARDEN.resinPerLevel * level * RARITIES[TREE_DEFS[id].rarity].power;
}

// --- Pflege: Verbesserungen für Harz -----------------------------------------

export type GardenUpgradeId =
  | 'duenger'
  | 'kompost'
  | 'harzkanal'
  | 'vogelfutter'
  | 'veredelung'
  | 'nistmaterial'
  | 'wildwechsel'
  | 'laubdecke';

export interface GardenUpgradeDef {
  id: GardenUpgradeId;
  name: string;
  /** "garten" oder "passiv" (nur für die Gruppierung in der Oberfläche). */
  group: 'garten' | 'passiv';
  description: string;
  perLevel: number;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const GARDEN_UPGRADES: readonly GardenUpgradeDef[] = [
  { id: 'duenger', name: 'Dünger', group: 'garten', description: 'Bäume wachsen +15 % schneller je Stufe.', perLevel: 0.15, maxLevel: 20, baseCost: 15, costGrowth: 1.6 },
  { id: 'kompost', name: 'Kompost', group: 'garten', description: 'Baum-Boni +10 % stärker je Stufe.', perLevel: 0.1, maxLevel: 30, baseCost: 20, costGrowth: 1.5 },
  { id: 'harzkanal', name: 'Harzkanäle', group: 'garten', description: '+15 % Harz je Stufe.', perLevel: 0.15, maxLevel: 20, baseCost: 15, costGrowth: 1.55 },
  { id: 'vogelfutter', name: 'Vogelfutter', group: 'garten', description: 'Vögel bringen Samen: +15 % Samenchance je Stufe.', perLevel: 0.15, maxLevel: 15, baseCost: 25, costGrowth: 1.7 },
  { id: 'veredelung', name: 'Veredelung', group: 'garten', description: 'Seltene, sehr seltene und legendäre Samen +15 % wahrscheinlicher je Stufe.', perLevel: 0.15, maxLevel: 15, baseCost: 40, costGrowth: 1.8 },
  { id: 'nistmaterial', name: 'Nistmaterial', group: 'passiv', description: 'Evolutionskammern +10 % schneller je Stufe.', perLevel: 0.1, maxLevel: 20, baseCost: 30, costGrowth: 1.6 },
  { id: 'wildwechsel', name: 'Wildwechsel', group: 'passiv', description: '+10 % DNA aus Revieren je Stufe.', perLevel: 0.1, maxLevel: 20, baseCost: 30, costGrowth: 1.6 },
  { id: 'laubdecke', name: 'Laubdecke', group: 'passiv', description: '+1 Stunde Offline-Obergrenze je Stufe.', perLevel: 1, maxLevel: 8, baseCost: 50, costGrowth: 2 },
];

export const GARDEN_UPGRADE_DEFS: Readonly<Record<GardenUpgradeId, GardenUpgradeDef>> = Object.fromEntries(
  GARDEN_UPGRADES.map((u) => [u.id, u]),
) as Record<GardenUpgradeId, GardenUpgradeDef>;

export function gardenUpgradeCost(def: GardenUpgradeDef, level: number): number {
  return Math.round(def.baseCost * def.costGrowth ** level);
}
