/**
 * Globaler Shop: permanente Upgrades und Freischaltungen, bezahlt mit DNA.
 * DNA gibt es nur am Ende eines Runs, und fast nur für neue Bestwellen.
 */
export type MetaUpgradeId =
  | 'startGold'
  | 'startLives'
  | 'towerCost'
  | 'evolutionBase'
  | 'damage'
  | 'fireRate'
  | 'inheritance'
  | 'itemLuck'
  | 'itemSlots'
  | 'relocate'
  | 'dnaGain'
  | 'autoFusion';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  /** Wirkung pro Stufe; Bedeutung je nach Upgrade (siehe MetaSystem). */
  perLevel: number;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const META_UPGRADE_DEFS: Readonly<Record<MetaUpgradeId, MetaUpgradeDef>> = {
  startGold: { id: 'startGold', name: 'Startkapital', description: '+30 Startgold je Stufe.', perLevel: 30, maxLevel: 50, baseCost: 10, costGrowth: 1.35 },
  startLives: { id: 'startLives', name: 'Zähigkeit', description: '+1 Startleben je Stufe.', perLevel: 1, maxLevel: 15, baseCost: 20, costGrowth: 1.6 },
  towerCost: { id: 'towerCost', name: 'Zellteilung', description: 'Turmkosten wachsen je Stufe 1 % langsamer.', perLevel: 0.01, maxLevel: 12, baseCost: 30, costGrowth: 1.7 },
  evolutionBase: { id: 'evolutionBase', name: 'Mutationsdruck', description: '+0,4 % Grund-Evolutionschance je Stufe.', perLevel: 0.004, maxLevel: 25, baseCost: 15, costGrowth: 1.45 },
  damage: { id: 'damage', name: 'Raubtierinstinkt', description: 'Schaden ×(1 + 0,08 je Stufe), eigener Topf.', perLevel: 0.08, maxLevel: 100, baseCost: 25, costGrowth: 1.3 },
  fireRate: { id: 'fireRate', name: 'Stoffwechsel', description: 'Feuerrate ×(1 + 0,05 je Stufe), eigener Topf.', perLevel: 0.05, maxLevel: 100, baseCost: 25, costGrowth: 1.3 },
  inheritance: { id: 'inheritance', name: 'Erbgut', description: '+5 % Stärke aller geerbten und Nachbar-Boni je Stufe.', perLevel: 0.05, maxLevel: 40, baseCost: 40, costGrowth: 1.4 },
  itemLuck: { id: 'itemLuck', name: 'Glücksgen', description: 'Item-Aufwertungschancen ×(1 + 0,1 je Stufe).', perLevel: 0.1, maxLevel: 20, baseCost: 60, costGrowth: 1.6 },
  itemSlots: { id: 'itemSlots', name: 'Tragkraft', description: '+1 Item-Slot je Stufe.', perLevel: 1, maxLevel: 4, baseCost: 200, costGrowth: 3 },
  relocate: { id: 'relocate', name: 'Wanderlust', description: 'Verlegung eine Welle früher je Stufe (mindestens alle 2).', perLevel: 1, maxLevel: 3, baseCost: 80, costGrowth: 2.5 },
  dnaGain: { id: 'dnaGain', name: 'Genbank', description: '+10 % DNA am Run-Ende je Stufe.', perLevel: 0.1, maxLevel: 30, baseCost: 50, costGrowth: 1.5 },
  autoFusion: { id: 'autoFusion', name: 'Symbiose', description: 'Schaltet Auto-Fusion frei (Idle-Komfort).', perLevel: 1, maxLevel: 1, baseCost: 150, costGrowth: 1 },
};

export const META_UPGRADE_IDS = Object.keys(META_UPGRADE_DEFS) as MetaUpgradeId[];

export function metaUpgradeCost(def: MetaUpgradeDef, level: number): number {
  return Math.round(def.baseCost * def.costGrowth ** level);
}

/** DNA-Wert einer einzelnen Welle (überlinear, späte Wellen zählen stark). */
export function dnaForWave(wave: number): number {
  return Math.ceil(wave ** 1.5 / 10);
}

/** Anteil, den bereits erreichte Wellen noch bringen ("sehr wenig"). */
export const REPEAT_WAVE_FACTOR = 0.1;
