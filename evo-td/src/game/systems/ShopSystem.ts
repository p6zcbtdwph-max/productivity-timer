/**
 * Gold-Shop: globale Upgrades (deterministisch, Stufe für Stufe) und Items
 * (Qualitätsstufe kaufen, mit Glück fällt eine höhere).
 */
import { BALANCE, tierForWave, tierMultiplier } from '../../config/balance';
import {
  ITEM_CATEGORY_IDS,
  itemPower,
  nextQuality,
  QUALITY_DEFS,
  type Item,
  type ItemQuality,
} from '../../data/items';
import { UPGRADE_DEFS, upgradeCost, type ModifierKind } from '../../data/upgrades';
import type { Rng } from '../../core/Rng';
import type { GameContext } from '../GameContext';
import type { Tower } from '../entities/Tower';
import { allocId } from '../GameState';
import { metaValues } from './MetaSystem';

// --- Upgrades ---------------------------------------------------------------

export function upgradePrice(ctx: GameContext, kind: ModifierKind): number {
  return upgradeCost(UPGRADE_DEFS[kind], ctx.state.upgrades[kind]);
}

export function buyUpgrade(ctx: GameContext, kind: ModifierKind): boolean {
  const price = upgradePrice(ctx, kind);
  if (ctx.state.gameOver || ctx.state.gold < price) return false;
  ctx.state.gold -= price;
  ctx.state.upgrades[kind]++;
  ctx.bus.emit('upgradeBought', { kind, level: ctx.state.upgrades[kind] });
  return true;
}

// --- Items ------------------------------------------------------------------

/** Preis einer Qualitätsstufe: Grundpreis × Gegner-Tier × Kaufanzahl. */
export function itemPrice(ctx: GameContext, quality: ItemQuality): number | undefined {
  const base = QUALITY_DEFS[quality].basePrice;
  if (base === null) return undefined;
  const tier = tierMultiplier(tierForWave(Math.max(1, ctx.state.wave.current)));
  return Math.round(base * tier * BALANCE.shop.itemPriceGrowth ** ctx.state.itemPurchases);
}

/** Würfelt, auf welche Stufe ein Kauf tatsächlich fällt (verkettete Aufwertung). */
export function rollQuality(bought: ItemQuality, rng: Rng, luckMultiplier = 1): ItemQuality {
  let quality = bought;
  for (;;) {
    const next = nextQuality(quality);
    if (!next || !rng.chance(Math.min(0.9, QUALITY_DEFS[quality].upgradeChance * luckMultiplier))) return quality;
    quality = next;
  }
}

/** Item-Plätze pro Turm (Basis 3, Artefakt "Beutel" erhöht). */
export function towerItemSlots(ctx: GameContext): number {
  return metaValues(ctx.meta).itemSlots;
}

export function canBuyItemFor(ctx: GameContext, tower: Tower, quality: ItemQuality): boolean {
  const price = itemPrice(ctx, quality);
  return price !== undefined && !ctx.state.gameOver && ctx.state.gold >= price && (tower.items?.length ?? 0) < towerItemSlots(ctx);
}

/** Kauft ein Item direkt für einen Turm. Kategorie zufällig, mit Glück eine höhere Stufe. */
export function buyItemForTower(ctx: GameContext, tower: Tower, quality: ItemQuality): Item | undefined {
  if (!canBuyItemFor(ctx, tower, quality)) return undefined;
  ctx.state.gold -= itemPrice(ctx, quality) as number;
  ctx.state.itemPurchases++;
  const item: Item = {
    id: allocId(ctx.state),
    category: ctx.rng.pick(ITEM_CATEGORY_IDS),
    quality: rollQuality(quality, ctx.rng, metaValues(ctx.meta).itemLuckMult),
  };
  (tower.items ??= []).push(item);
  ctx.bus.emit('itemObtained', { item, boughtQuality: quality, tower });
  return item;
}

/** Summe der Item-Wirkungen je Kategorie für einen Turm. */
export function towerItemModifiers(items: readonly Item[] | undefined): Record<ModifierKind, number> {
  const result: Record<ModifierKind, number> = { damage: 0, fireRate: 0, range: 0, evolution: 0, secondary: 0, passive: 0 };
  for (const item of items ?? []) result[item.category] += itemPower(item);
  return result;
}
