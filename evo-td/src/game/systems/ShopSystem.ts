/**
 * Gold-Shop: globale Upgrades (deterministisch, Stufe für Stufe) und Items
 * (Qualitätsstufe kaufen, mit Glück fällt eine höhere).
 */
import { BALANCE, tierForWave, tierMultiplier } from '../../config/balance';
import {
  ITEM_CATEGORY_IDS,
  nextQuality,
  QUALITY_DEFS,
  type Item,
  type ItemQuality,
} from '../../data/items';
import { UPGRADE_DEFS, upgradeCost, type ModifierKind } from '../../data/upgrades';
import type { Rng } from '../../core/Rng';
import type { GameContext } from '../GameContext';
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

export function buyItem(ctx: GameContext, quality: ItemQuality): Item | undefined {
  const price = itemPrice(ctx, quality);
  if (price === undefined || ctx.state.gameOver || ctx.state.gold < price) return undefined;
  ctx.state.gold -= price;
  ctx.state.itemPurchases++;
  const item: Item = {
    id: allocId(ctx.state),
    category: ctx.rng.pick(ITEM_CATEGORY_IDS),
    quality: rollQuality(quality, ctx.rng, metaValues(ctx.meta).itemLuckMult),
  };
  ctx.state.items.push(item);
  ctx.bus.emit('itemObtained', { item, boughtQuality: quality });
  return item;
}

export function isEquipped(ctx: GameContext, itemId: number): boolean {
  return ctx.state.equippedItemIds.includes(itemId);
}

export function toggleEquip(ctx: GameContext, itemId: number): boolean {
  const { state } = ctx;
  if (!state.items.some((i) => i.id === itemId)) return false;
  const index = state.equippedItemIds.indexOf(itemId);
  if (index >= 0) {
    state.equippedItemIds.splice(index, 1);
    return true;
  }
  if (state.equippedItemIds.length >= metaValues(ctx.meta).itemSlots) return false;
  state.equippedItemIds.push(itemId);
  return true;
}
