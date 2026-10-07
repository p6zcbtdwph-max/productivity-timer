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
  haeufig: { id: 'haeufig', name: 'häufig', color: '#9e9e9e', weight: 70, power: 1 },
  selten: { id: 'selten', name: 'selten', color: '#4fc3f7', weight: 22, power: 1.5 },
  sehr_selten: { id: 'sehr_selten', name: 'sehr selten', color: '#ba68c8', weight: 7, power: 2 },
  legendaer: { id: 'legendaer', name: 'legendär', color: '#ffb300', weight: 1, power: 3 },
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
  /** Erster Topf kostet so viel DNA, jeder weitere das `potGrowth`-fache. */
  potBaseCost: 30,
  potGrowth: 3,
  maxPots: 6,
  /** Stunden für Level n → n+1 = hoursPerLevel × n. */
  hoursPerLevel: 1,
  maxLevel: 100,
  /** Harz pro Stunde = resinPerLevel × Level × Seltenheit. */
  resinPerLevel: 0.2,
  /** Samenchance nach einer geschafften Welle (ab `seedFromWave`), bei Bosswellen höher. */
  seedChance: 0.04,
  bossSeedChance: 0.4,
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
