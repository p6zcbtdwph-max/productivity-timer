import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { Rng } from '../src/core/Rng';
import { START_MAP } from '../src/data/map';
import { ITEMS, itemLevel, itemPower, QUALITY_DEFS, type ItemQuality } from '../src/data/items';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import type { Tower } from '../src/game/entities/Tower';
import { globalModifiers } from '../src/game/systems/ModifierSystem';
import { computeStats, environmentFor } from '../src/game/systems/StatsSystem';
import { upgradePrice } from '../src/game/systems/ShopSystem';
import { addItem, equippedModifiers, equipSlots, isEquipped, itemDropChance, maybeDropItem, mergeAll, mergeItem, mergePartner, rollQuality } from '../src/game/systems/ItemSystem';
import { planBulk } from '../src/game/systems/BulkBuy';

function statsOf(game: Game, tower: Tower) {
  return computeStats(tower, environmentFor(game.ctx, tower));
}

function richGame(seed = 1): Game {
  const game = new Game(START_MAP, createInitialMeta(), createInitialState(seed));
  game.state.gold = 10_000_000;
  return game;
}

describe('Fusion (Prestige)', () => {
  it('verschmilzt nur zwei gleiche Türme gleicher Prestige-Stufe', () => {
    const game = richGame();
    const a = game.build(0);
    const b = game.build(1);
    const c = game.build(2);
    if (!a || !b || !c) throw new Error('Bau fehlgeschlagen');
    game.forceEvolve(c.id, 'wurm');
    expect(game.fuse(a.id, c.id)).toBe(false); // andere Art
    expect(game.fuse(a.id, a.id)).toBe(false); // mit sich selbst

    b.level = 7;
    expect(game.fuse(a.id, b.id)).toBe(true);
    expect(game.state.towers.map((t) => t.id)).not.toContain(b.id);
    expect(a.prestige).toBe(1);
    expect(a.level).toBe(7); // höheres Level bleibt
    expect(game.state.stats.fusions).toBe(1);

    const d = game.build(1);
    if (!d) throw new Error('Bau fehlgeschlagen');
    expect(game.fuse(a.id, d.id)).toBe(false); // Prestige 1 vs 0
  });

  it('kostet kein Gold', () => {
    const game = richGame();
    const a = game.build(0);
    const b = game.build(1);
    if (!a || !b) throw new Error('Bau fehlgeschlagen');
    const gold = game.state.gold;
    game.fuse(a.id, b.id);
    expect(game.state.gold).toBe(gold);
  });
});

describe('Verlegen', () => {
  it('eine Verlegung je 5 Wellen, kostet Gold, nur auf freie Plätze', () => {
    const game = richGame();
    const tower = game.build(0);
    if (!tower) throw new Error('Bau fehlgeschlagen');
    expect(game.relocateCharges()).toBe(0);
    expect(game.relocate(tower.id, 5)).toBe(false);

    game.state.wave.current = BALANCE.relocate.wavesPerCharge * 2;
    expect(game.relocateCharges()).toBe(2);
    const gold = game.state.gold;
    expect(game.relocate(tower.id, 5)).toBe(true);
    expect(tower.slot).toBe(5);
    expect(game.state.gold).toBe(gold - game.relocateCost());
    expect(game.relocateCharges()).toBe(1);

    game.build(6);
    expect(game.relocate(tower.id, 6)).toBe(false); // belegt
    expect(game.relocate(tower.id, 7)).toBe(true);
    expect(game.relocateCharges()).toBe(0);
  });
});

describe('Shop', () => {
  it('Upgrades werden teurer und wirken auf alle Türme', () => {
    const game = richGame();
    const first = upgradePrice(game.ctx, 'damage');
    expect(game.buyUpgrade('damage')).toBe(true);
    expect(upgradePrice(game.ctx, 'damage')).toBeGreaterThan(first);
    expect(globalModifiers(game.state).damage).toBeCloseTo(0.05);
  });

  it('Turmkosten steigen mit jedem Turm', () => {
    const game = richGame();
    const c0 = game.towerCost();
    game.build(0);
    const c1 = game.towerCost();
    game.build(1);
    expect(c1).toBeGreaterThan(c0);
    expect(game.towerCost()).toBeGreaterThan(c1);
  });

  it('Mehrfachkauf: ×10 kauft zehn Stufen auf einmal, Max so viele wie Gold reicht', () => {
    const game = richGame();
    game.meta.buyAmount = 10;
    expect(game.buyUpgradeBulk('damage')).toBe(10);
    expect(game.state.upgrades.damage).toBe(10);
    game.meta.buyAmount = 'max';
    game.state.gold = upgradePrice(game.ctx, 'range') * 3;
    const bought = game.buyUpgradeBulk('range');
    expect(bought).toBeGreaterThanOrEqual(1);
    expect(game.state.gold).toBeLessThan(upgradePrice(game.ctx, 'range'));
    game.meta.buyAmount = 100;
    game.state.gold = 1;
    expect(game.buyUpgradeBulk('fireRate')).toBe(0); // nicht leistbar: nichts gekauft
  });

  it('planBulk kappt an der Höchststufe und zeigt bei Max den nächsten Preis', () => {
    const cost = (l: number): number => 10 * 2 ** l;
    expect(planBulk(10, 3, 5, cost, 1e9)).toEqual({ count: 2, total: 80 + 160, affordable: true });
    expect(planBulk('max', 0, Infinity, cost, 35)).toEqual({ count: 2, total: 30, affordable: true });
    expect(planBulk('max', 0, Infinity, cost, 5)).toEqual({ count: 1, total: 10, affordable: false });
    expect(planBulk(1, 5, 5, cost, 1e9).count).toBe(0);
  });
});

describe('Items (global, Funde)', () => {
  it('Qualität ist verkettet: Legendär aus Bronze ist extrem selten', () => {
    const rng = new Rng(2024);
    const counts: Record<ItemQuality, number> = { bronze: 0, silber: 0, gold: 0, platin: 0, legendaer: 0 };
    const n = 200_000;
    for (let i = 0; i < n; i++) counts[rollQuality('bronze', rng)]++;
    const q = QUALITY_DEFS;
    expect(counts.bronze / n).toBeCloseTo(1 - q.bronze.upgradeChance, 1);
    expect(counts.silber / n).toBeCloseTo(q.bronze.upgradeChance * (1 - q.silber.upgradeChance), 1);
    const legendaryRate = q.bronze.upgradeChance * q.silber.upgradeChance * q.gold.upgradeChance * q.platin.upgradeChance;
    expect(legendaryRate).toBeLessThan(0.0002);
    expect(counts.legendaer).toBeLessThan(n * 0.001);
    expect(rollQuality('legendaer', rng)).toBe('legendaer');
  });

  it('Funde sind sehr selten, nur aktiv, und landen im globalen Inventar', () => {
    const game = richGame(4);
    expect(itemDropChance(game.meta, ITEMS.fromWave - 1, false)).toBe(0);
    expect(itemDropChance(game.meta, ITEMS.fromWave, false)).toBe(ITEMS.dropChance);
    game.meta.upgrades.itemFind = 5; // ×2
    expect(itemDropChance(game.meta, 10, true)).toBeCloseTo(ITEMS.bossDropChance * 2);
    const offline = { ...game.ctx, offline: true };
    for (let i = 0; i < 1000; i++) expect(maybeDropItem(offline, 10, true)).toBeUndefined();
    let found = 0;
    for (let i = 0; i < 1000; i++) if (maybeDropItem(game.ctx, 10, true)) found++;
    expect(found).toBeGreaterThan(0);
    expect(game.meta.items.inventory).toHaveLength(found);
    expect(game.meta.items.equipped).toHaveLength(1); // erster Fund wird ausgerüstet, 1 Platz
  });

  it('Start mit einem Platz; Beutel gibt mehr; ausgerüstete Items wirken auf alle Türme', () => {
    const game = richGame();
    const a = game.build(0);
    const b = game.build(5);
    if (!a || !b) throw new Error('Bau fehlgeschlagen');
    const baseA = statsOf(game, a).damage;
    const baseB = statsOf(game, b).damage;
    const sword = addItem(game.meta, 'damage', 'gold');
    const lens = addItem(game.meta, 'range', 'bronze');
    expect(equipSlots(game.meta)).toBe(1);
    expect(isEquipped(game.meta, sword.id)).toBe(true);
    expect(game.toggleEquip(lens.id)).toBe(false); // kein Platz
    game.invalidateStats();
    expect(statsOf(game, a).damage).toBeCloseTo(baseA * (1 + 0.4) / 1, 5);
    expect(statsOf(game, b).damage).toBeCloseTo(baseB * 1.4, 5);
    expect(globalModifiers(game.state, game.meta).damage).toBeCloseTo(0.4);

    game.meta.upgrades.itemSlots = 1;
    expect(equipSlots(game.meta)).toBe(2);
    expect(game.toggleEquip(lens.id)).toBe(true);
    expect(game.toggleEquip(sword.id)).toBe(true); // ablegen
    expect(globalModifiers(game.state, game.meta).damage).toBe(0);
  });

  it('Verschmelzen braucht die Perlmuschel; Stufe +1 wirkt ×1,8; Pfauenfeder verstärkt', () => {
    const game = richGame();
    const meta = game.meta;
    const x = addItem(meta, 'fireRate', 'silber');
    const y = addItem(meta, 'fireRate', 'silber');
    addItem(meta, 'fireRate', 'gold'); // andere Qualität passt nicht
    expect(mergeItem(meta, x.id)).toBe(false); // ohne Artefakt
    meta.upgrades.itemMerge = 1;
    expect(mergePartner(meta, x.id)?.id).toBe(y.id);
    const before = itemPower(x);
    expect(game.mergeItem(x.id)).toBe(true);
    expect(itemLevel(x)).toBe(2);
    expect(itemPower(x)).toBeCloseTo(before * ITEMS.mergeGrowth);
    expect(meta.items.inventory.map((i) => i.id)).not.toContain(y.id);
    expect(isEquipped(meta, x.id)).toBe(true); // x war ausgerüstet

    // alles verschmelzen: 4 gleiche → 1 auf Stufe 3
    for (let i = 0; i < 4; i++) addItem(meta, 'range', 'bronze');
    expect(mergeAll(meta)).toBeGreaterThanOrEqual(3);
    expect(meta.items.inventory.filter((i) => i.category === 'range').map(itemLevel)).toEqual([3]);

    const plain = equippedModifiers(meta).fireRate;
    meta.upgrades.itemPower = 10; // ×2
    expect(equippedModifiers(meta).fireRate).toBeCloseTo(plain * 2);
  });
});
