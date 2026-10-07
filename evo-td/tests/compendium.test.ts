import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { COMPENDIUM_EFFECTS, EFFECT_BY_BONUS, POINTS_PER_PRESTIGE, tierWeight } from '../src/data/compendium';
import { START_MAP } from '../src/data/map';
import { BASE_TOWER_IDS, getTowerDef } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, normalizeMeta } from '../src/game/MetaState';
import { compendiumTotals, recordSpecies, speciesBonus, speciesEffect } from '../src/game/systems/CompendiumSystem';
import { metaValues } from '../src/game/systems/MetaSystem';
import { computeStats, EMPTY_ENVIRONMENT } from '../src/game/systems/StatsSystem';
import { spawnEnemy } from '../src/game/systems/WaveSystem';
import { buyAnimal, unlockChamber } from '../src/game/systems/PassiveSystem';

describe('Kompendium: Rekorde', () => {
  it('speichert nur Verbesserungen von Level und Prestige', () => {
    const meta = createInitialMeta();
    expect(recordSpecies(meta, 'wolf', 10, 0)).toBe(true);
    expect(recordSpecies(meta, 'wolf', 5, 0)).toBe(false);
    expect(recordSpecies(meta, 'wolf', 5, 2)).toBe(true);
    expect(meta.compendium.wolf).toEqual({ maxLevel: 10, maxPrestige: 2 });
  });

  it('der Run schreibt Bau, Level, Evolution und Fusion mit', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta, createInitialState(1));
    game.state.gold = 1e6;
    const a = game.build(0);
    const b = game.build(1);
    if (!a || !b) throw new Error('Bau fehlgeschlagen');
    expect(meta.compendium.einzeller).toEqual({ maxLevel: 1, maxPrestige: 0 });
    game.fuse(a.id, b.id);
    expect(meta.compendium.einzeller?.maxPrestige).toBe(1);
    game.forceEvolve(a.id, 'wurm');
    expect(meta.compendium.wurm).toBeDefined();
  });

  it('Kammer-Tiere landen auch im Kompendium', () => {
    const meta = createInitialMeta();
    meta.dna = 1e6;
    unlockChamber(meta);
    buyAnimal(meta, 0);
    expect(meta.compendium.einzeller).toBeDefined();
  });

  it('alte Spielstände ohne Kompendium werden ergänzt', () => {
    const old = createInitialMeta() as Partial<ReturnType<typeof createInitialMeta>>;
    delete old.compendium;
    expect(normalizeMeta(old).compendium).toEqual({});
  });
});

describe('Kompendium: Boni', () => {
  it('jeder Bonus-Typ hat einen Kompendium-Effekt, Arten unterscheiden sich', () => {
    const effects = new Set(BASE_TOWER_IDS.map((id) => speciesEffect(id)));
    expect(effects.size).toBeGreaterThanOrEqual(8);
    for (const id of BASE_TOWER_IDS) expect(EFFECT_BY_BONUS[getTowerDef(id).bonus.kind]).toBe(speciesEffect(id));
  });

  it('Stärke = perPoint × (Level + 25 × Prestige) × (1 + 0,5 × Tier)', () => {
    const meta = createInitialMeta();
    recordSpecies(meta, 'hai', 40, 2); // Tier 3, Schaden
    const expected = COMPENDIUM_EFFECTS.damage.perPoint * (40 + 2 * POINTS_PER_PRESTIGE) * tierWeight(3);
    expect(speciesBonus(meta, 'hai')).toBeCloseTo(expected);
    expect(compendiumTotals(meta).damage).toBeCloseTo(expected);
  });

  it('Obergrenzen greifen', () => {
    const meta = createInitialMeta();
    recordSpecies(meta, 'spinne', 1_000_000, 0);
    expect(compendiumTotals(meta).enemySlow).toBe(COMPENDIUM_EFFECTS.enemySlow.cap);
  });

  it('wirkt als eigener Topf und auf Gegner', () => {
    const meta = createInitialMeta();
    recordSpecies(meta, 'hai', 100, 0);
    recordSpecies(meta, 'spinne', 100, 0);
    recordSpecies(meta, 'zitterrochen', 100, 0);
    const values = metaValues(meta);
    const stats = computeStats({ defId: 'wurm', level: 1, prestige: 0 }, { ...EMPTY_ENVIRONMENT, meta: values });
    expect(stats.breakdown.damage.kompendium).toBeCloseTo(1 + values.compendium.damage);

    const game = new Game(START_MAP, meta, createInitialState(2));
    const enemy = spawnEnemy(game.ctx, { defId: 'drohne', element: 'nano' }, 1);
    expect(enemy.speed).toBeCloseTo(BALANCE.enemies.baseSpeed * (1 - values.compendium.enemySlow));
    expect(enemy.healMultiplier).toBeCloseTo(1 - values.compendium.antiHeal);
  });
});
