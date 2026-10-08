/**
 * Items: seltene Funde nach geschafften Wellen. Ausgerüstet wirken sie als
 * Perks auf ALLE Türme und bleiben über alle Runs erhalten.
 *
 * Beim Fund wird die Qualität verkettet gewürfelt (Bronze → Silber → …),
 * daher sind legendäre Items extrem selten. Zwei gleiche Items (Kategorie,
 * Qualität und Stufe) lassen sich mit dem passenden Artefakt zu einem Item
 * der nächsten Stufe verschmelzen.
 */
import type { ModifierKind } from './upgrades';

export type ItemQuality = 'bronze' | 'silber' | 'gold' | 'platin' | 'legendaer';

export interface QualityDef {
  id: ItemQuality;
  name: string;
  color: string;
  /** Multiplikator auf die Grundwirkung der Kategorie. */
  power: number;
  /** Chance, beim Fund auf die nächste Qualität zu springen. */
  upgradeChance: number;
}

export const QUALITY_ORDER: readonly ItemQuality[] = ['bronze', 'silber', 'gold', 'platin', 'legendaer'];

export const QUALITY_DEFS: Readonly<Record<ItemQuality, QualityDef>> = {
  bronze: { id: 'bronze', name: 'Bronze', color: '#cd7f32', power: 1, upgradeChance: 0.25 },
  silber: { id: 'silber', name: 'Silber', color: '#c0c0c0', power: 2, upgradeChance: 0.15 },
  gold: { id: 'gold', name: 'Gold', color: '#ffd700', power: 4, upgradeChance: 0.08 },
  platin: { id: 'platin', name: 'Platin', color: '#e5e4e2', power: 8, upgradeChance: 0.03 },
  legendaer: { id: 'legendaer', name: 'Legendär', color: '#ff6ec7', power: 16, upgradeChance: 0 },
};

export interface ItemCategoryDef {
  id: ModifierKind;
  name: string;
  /** Grundwirkung bei Bronze, Stufe 1 (Anteil bzw. absolute Chance bei 'evolution'). */
  base: number;
}

export const ITEM_CATEGORIES: Readonly<Record<ModifierKind, ItemCategoryDef>> = {
  damage: { id: 'damage', name: 'Klinge', base: 0.1 },
  fireRate: { id: 'fireRate', name: 'Reflex', base: 0.08 },
  range: { id: 'range', name: 'Linse', base: 0.05 },
  evolution: { id: 'evolution', name: 'Mutagen', base: 0.003 },
  secondary: { id: 'secondary', name: 'Erbgut', base: 0.1 },
  passive: { id: 'passive', name: 'Beute', base: 0.1 },
};

export const ITEM_CATEGORY_IDS = Object.keys(ITEM_CATEGORIES) as ModifierKind[];

export const ITEMS = {
  /** Fundchance nach einer aktiv geschafften Welle (ab `fromWave`), Bosswellen höher. Sehr selten. */
  dropChance: 0.008,
  bossDropChance: 0.06,
  fromWave: 3,
  /** Ausrüstungsplätze ohne Artefakt. */
  baseSlots: 1,
  /** Jede Verschmelzungs-Stufe multipliziert die Wirkung (2 Items → 1 mit ×1,8). */
  mergeGrowth: 1.8,
} as const;

export interface Item {
  id: number;
  category: ModifierKind;
  quality: ItemQuality;
  /** Verschmelzungs-Stufe (fehlt = 1). */
  level?: number;
}

export function itemLevel(item: Item): number {
  return item.level ?? 1;
}

/** Wirkung eines Items; `powerMult` kommt vom Artefakt für Item-Stärke. */
export function itemPower(item: Item, powerMult = 1): number {
  return ITEM_CATEGORIES[item.category].base * QUALITY_DEFS[item.quality].power * ITEMS.mergeGrowth ** (itemLevel(item) - 1) * powerMult;
}

export function nextQuality(quality: ItemQuality): ItemQuality | undefined {
  const index = QUALITY_ORDER.indexOf(quality);
  return QUALITY_ORDER[index + 1];
}

export function itemName(item: Item): string {
  const level = itemLevel(item);
  return `${QUALITY_DEFS[item.quality].name} ${ITEM_CATEGORIES[item.category].name}${level > 1 ? ` +${level - 1}` : ''}`;
}

export function describeItem(item: Item, powerMult = 1): string {
  const value = itemPower(item, powerMult);
  return `${itemName(item)}: +${(value * 100).toFixed(item.category === 'evolution' ? 2 : 0)} % ${categoryLabel(item.category)}`;
}

export function categoryLabel(kind: ModifierKind): string {
  switch (kind) {
    case 'damage':
      return 'Schaden';
    case 'fireRate':
      return 'Feuerrate';
    case 'range':
      return 'Reichweite';
    case 'evolution':
      return 'Evolutionschance';
    case 'secondary':
      return 'sekundäre Effekte';
    case 'passive':
      return 'Gold & XP';
  }
}
