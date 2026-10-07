/**
 * Items: dieselben Wirkungsarten wie die globalen Upgrades, aber mit
 * Qualitätsstufe. Beim Kauf einer Stufe besteht jeweils eine Chance, dass
 * stattdessen die nächsthöhere Stufe fällt (verkettet, daher sind legendäre
 * Items extrem selten).
 */
import type { ModifierKind } from './upgrades';

export type ItemQuality = 'bronze' | 'silber' | 'gold' | 'platin' | 'legendaer';

export interface QualityDef {
  id: ItemQuality;
  name: string;
  color: string;
  /** Multiplikator auf die Grundwirkung der Kategorie. */
  power: number;
  /** Chance, beim Kauf/Aufwerten auf die nächste Stufe zu springen. */
  upgradeChance: number;
  /** Grundpreis (wird mit Gegner-Tier und Kaufanzahl skaliert). null = nicht kaufbar. */
  basePrice: number | null;
}

export const QUALITY_ORDER: readonly ItemQuality[] = ['bronze', 'silber', 'gold', 'platin', 'legendaer'];

export const QUALITY_DEFS: Readonly<Record<ItemQuality, QualityDef>> = {
  bronze: { id: 'bronze', name: 'Bronze', color: '#cd7f32', power: 1, upgradeChance: 0.25, basePrice: 120 },
  silber: { id: 'silber', name: 'Silber', color: '#c0c0c0', power: 2, upgradeChance: 0.15, basePrice: 600 },
  gold: { id: 'gold', name: 'Gold', color: '#ffd700', power: 4, upgradeChance: 0.08, basePrice: 3000 },
  platin: { id: 'platin', name: 'Platin', color: '#e5e4e2', power: 8, upgradeChance: 0.03, basePrice: 15000 },
  legendaer: { id: 'legendaer', name: 'Legendär', color: '#ff6ec7', power: 16, upgradeChance: 0, basePrice: null },
};

export interface ItemCategoryDef {
  id: ModifierKind;
  name: string;
  /** Grundwirkung bei Bronze (Prozent bzw. absolute Chance bei 'evolution'). */
  base: number;
}

export const ITEM_CATEGORIES: Readonly<Record<ModifierKind, ItemCategoryDef>> = {
  damage: { id: 'damage', name: 'Klinge', base: 0.1 },
  fireRate: { id: 'fireRate', name: 'Reflex', base: 0.08 },
  range: { id: 'range', name: 'Linse', base: 0.05 },
  evolution: { id: 'evolution', name: 'Mutagen', base: 0.01 },
  secondary: { id: 'secondary', name: 'Erbgut', base: 0.1 },
  passive: { id: 'passive', name: 'Beute', base: 0.1 },
};

export const ITEM_CATEGORY_IDS = Object.keys(ITEM_CATEGORIES) as ModifierKind[];

export interface Item {
  id: number;
  category: ModifierKind;
  quality: ItemQuality;
}

export function itemPower(item: Item): number {
  return ITEM_CATEGORIES[item.category].base * QUALITY_DEFS[item.quality].power;
}

export function nextQuality(quality: ItemQuality): ItemQuality | undefined {
  const index = QUALITY_ORDER.indexOf(quality);
  return QUALITY_ORDER[index + 1];
}

export function describeItem(item: Item): string {
  const value = itemPower(item);
  const category = ITEM_CATEGORIES[item.category];
  return `${QUALITY_DEFS[item.quality].name} ${category.name}: +${(value * 100).toFixed(item.category === 'evolution' ? 1 : 0)} % ${categoryLabel(item.category)}`;
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
