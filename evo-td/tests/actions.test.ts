import { describe, expect, it } from 'vitest';
import { BALANCE, tierForWave, tierMultiplier } from '../src/config/balance';
import { Rng } from '../src/core/Rng';
import { START_MAP } from '../src/data/map';
import { QUALITY_DEFS, type ItemQuality } from '../src/data/items';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import type { Tower } from '../src/game/entities/Tower';
import { globalModifiers } from '../src/game/systems/ModifierSystem';
import { computeStats, environmentFor } from '../src/game/systems/StatsSystem';
import { itemPrice, rollQuality, upgradePrice } from '../src/game/systems/ShopSystem';

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

  it('Item-Preise skalieren mit Gegner-Tier und Kaufanzahl, Legendär ist nicht kaufbar', () => {
    const game = richGame();
    game.state.wave.current = 1;
    const early = itemPrice(game.ctx, 'bronze') ?? 0;
    game.state.wave.current = BALANCE.waves.wavesPerTier * 3 + 1;
    expect(itemPrice(game.ctx, 'bronze')).toBe(early * tierMultiplier(tierForWave(game.state.wave.current)));
    expect(itemPrice(game.ctx, 'legendaer')).toBeUndefined();
    const tower = game.build(0);
    if (!tower) throw new Error('Bau fehlgeschlagen');
    expect(game.buyItemFor(tower.id, 'legendaer')).toBe(false);
    const before = itemPrice(game.ctx, 'silber') ?? 0;
    expect(game.buyItemFor(tower.id, 'silber')).toBe(true);
    expect(itemPrice(game.ctx, 'silber')).toBeGreaterThan(before);
    expect(tower.items).toHaveLength(1);
    expect(game.buyItemFor(9999, 'bronze')).toBe(false); // unbekannter Turm
  });

  it('Aufwertung ist verkettet: Legendär aus Bronze ist extrem selten', () => {
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

  it('Items gehören zu einem Turm: höchstens 3 je Turm, wirken nur dort', () => {
    const game = richGame();
    const a = game.build(0);
    const b = game.build(5);
    if (!a || !b) throw new Error('Bau fehlgeschlagen');
    expect(BALANCE.shop.itemSlots).toBe(3);
    const before = statsOf(game, b);
    for (let i = 0; i < BALANCE.shop.itemSlots; i++) expect(game.buyItemFor(a.id, 'bronze')).toBe(true);
    expect(game.buyItemFor(a.id, 'bronze')).toBe(false); // voll
    expect(a.items).toHaveLength(3);
    expect(b.items ?? []).toHaveLength(0);
    // Der Nachbar b profitiert nicht von a's Items.
    const after = statsOf(game, b);
    expect(after.damage).toBeCloseTo(before.damage);
    expect(after.cooldown).toBeCloseTo(before.cooldown);
  });

  it('Turm-Items fließen in den Ausrüstungs-Topf des Turms', () => {
    const game = richGame();
    const t = game.build(0);
    if (!t) throw new Error('Bau fehlgeschlagen');
    const base = statsOf(game, t).range;
    t.items = [{ id: 1000, category: 'range', quality: 'gold' }];
    expect(statsOf(game, t).range).toBeGreaterThan(base);
  });
});
