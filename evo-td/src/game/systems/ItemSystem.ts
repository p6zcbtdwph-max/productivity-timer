/**
 * Items: seltene Funde nach Wellen (nur aktiv), über alle Runs im Inventar.
 * Ausgerüstete Items wirken als Perks auf alle Türme (Topf "Ausrüstung").
 * Artefakte: Beutel (Plätze), Elsternnest (Fundchance), Perlmuschel
 * (Verschmelzen), Pfauenfeder (Stärke), Klee (höhere Qualität).
 */
import { ITEM_CATEGORY_IDS, ITEMS, itemLevel, itemPower, nextQuality, QUALITY_DEFS, type Item, type ItemQuality } from '../../data/items';
import type { ModifierKind } from '../../data/upgrades';
import type { Rng } from '../../core/Rng';
import type { GameContext } from '../GameContext';
import type { MetaState } from '../MetaState';
import { metaValues } from './MetaSystem';

/** Würfelt die Qualität eines Funds (verkettete Aufwertung ab `start`). */
export function rollQuality(start: ItemQuality, rng: Rng, luckMultiplier = 1): ItemQuality {
  let quality = start;
  for (;;) {
    const next = nextQuality(quality);
    if (!next || !rng.chance(Math.min(0.9, QUALITY_DEFS[quality].upgradeChance * luckMultiplier))) return quality;
    quality = next;
  }
}

export function itemDropChance(meta: MetaState, wave: number, boss: boolean): number {
  if (wave < ITEMS.fromWave) return 0;
  return Math.min(1, (boss ? ITEMS.bossDropChance : ITEMS.dropChance) * metaValues(meta).itemFindMult);
}

export function addItem(meta: MetaState, category: ModifierKind, quality: ItemQuality, level = 1): Item {
  const item: Item = { id: meta.items.nextId++, category, quality, ...(level > 1 ? { level } : {}) };
  meta.items.inventory.push(item);
  meta.items.found++;
  // Freier Platz? Dann gleich ausrüsten.
  if (meta.items.equipped.length < equipSlots(meta)) meta.items.equipped.push(item.id);
  return item;
}

/** Nach einer geschafften Welle: vielleicht ein Item finden. Nie in der Winterruhe. */
export function maybeDropItem(ctx: GameContext, wave: number, boss: boolean): Item | undefined {
  if (ctx.offline) return undefined;
  if (!ctx.rng.chance(itemDropChance(ctx.meta, wave, boss))) return undefined;
  const quality = rollQuality('bronze', ctx.rng, metaValues(ctx.meta).itemLuckMult);
  const item = addItem(ctx.meta, ctx.rng.pick(ITEM_CATEGORY_IDS), quality);
  ctx.bus.emit('itemFound', { item, wave });
  return item;
}

// --- Ausrüsten ----------------------------------------------------------------

export function equipSlots(meta: MetaState): number {
  return metaValues(meta).itemSlots;
}

export function isEquipped(meta: MetaState, id: number): boolean {
  return meta.items.equipped.includes(id);
}

/** Ausrüsten bzw. ablegen. Ausrüsten geht nur mit freiem Platz. */
export function toggleEquip(meta: MetaState, id: number): boolean {
  const items = meta.items;
  if (!items.inventory.some((i) => i.id === id)) return false;
  const index = items.equipped.indexOf(id);
  if (index >= 0) {
    items.equipped.splice(index, 1);
    return true;
  }
  if (items.equipped.length >= equipSlots(meta)) return false;
  items.equipped.push(id);
  return true;
}

export function equippedItems(meta: MetaState): Item[] {
  return meta.items.inventory.filter((i) => meta.items.equipped.includes(i.id));
}

/** Summe der Wirkungen aller ausgerüsteten Items je Kategorie. */
export function equippedModifiers(meta: MetaState): Record<ModifierKind, number> {
  const result: Record<ModifierKind, number> = { damage: 0, fireRate: 0, range: 0, evolution: 0, secondary: 0, passive: 0 };
  const power = metaValues(meta).itemPowerMult;
  // Nur so viele wie Plätze da sind (falls Plätze je weniger würden).
  for (const item of equippedItems(meta).slice(0, equipSlots(meta))) result[item.category] += itemPower(item, power);
  return result;
}

// --- Verschmelzen ---------------------------------------------------------------

export function sameKind(a: Item, b: Item): boolean {
  return a.id !== b.id && a.category === b.category && a.quality === b.quality && itemLevel(a) === itemLevel(b);
}

/** Ein passender Partner zum Verschmelzen (bevorzugt ein nicht ausgerüsteter). */
export function mergePartner(meta: MetaState, id: number): Item | undefined {
  const item = meta.items.inventory.find((i) => i.id === id);
  if (!item || !metaValues(meta).itemMerge) return undefined;
  const partners = meta.items.inventory.filter((i) => sameKind(item, i));
  return partners.find((i) => !isEquipped(meta, i.id)) ?? partners[0];
}

/** Verschmilzt ein Item mit einem gleichen: es steigt eine Stufe, das andere verschwindet. */
export function mergeItem(meta: MetaState, id: number): boolean {
  const item = meta.items.inventory.find((i) => i.id === id);
  const partner = mergePartner(meta, id);
  if (!item || !partner) return false;
  item.level = itemLevel(item) + 1;
  const partnerEquipped = isEquipped(meta, partner.id);
  meta.items.inventory = meta.items.inventory.filter((i) => i.id !== partner.id);
  meta.items.equipped = meta.items.equipped.filter((e) => e !== partner.id);
  if (partnerEquipped && !isEquipped(meta, item.id)) meta.items.equipped.push(item.id);
  return true;
}

/** Verschmilzt so lange alles Gleiche, bis nichts mehr passt. Gibt die Zahl der Verschmelzungen zurück. */
export function mergeAll(meta: MetaState): number {
  if (!metaValues(meta).itemMerge) return 0;
  let merges = 0;
  for (let guard = 0; guard < 10_000; guard++) {
    const item = meta.items.inventory.find((i) => mergePartner(meta, i.id));
    if (!item || !mergeItem(meta, item.id)) break;
    merges++;
  }
  return merges;
}

/** Item wegwerfen (räumt das Inventar auf). */
export function discardItem(meta: MetaState, id: number): boolean {
  const before = meta.items.inventory.length;
  meta.items.inventory = meta.items.inventory.filter((i) => i.id !== id);
  meta.items.equipped = meta.items.equipped.filter((e) => e !== id);
  return meta.items.inventory.length < before;
}
