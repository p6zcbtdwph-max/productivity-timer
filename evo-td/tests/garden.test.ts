import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/Rng';
import { GARDEN, RARITIES, resinPerHour, TREE_DEFS, TREE_IDS, treeBonus } from '../src/data/garden';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, normalizeMeta } from '../src/game/MetaState';
import { gardenTotals, plantSeed, potUnlockCost, rollTree, seedChance, tickGarden, unlockPot, uproot } from '../src/game/systems/GardenSystem';
import { metaValues } from '../src/game/systems/MetaSystem';
import { tickPassive } from '../src/game/systems/PassiveSystem';
import { computeStats, EMPTY_ENVIRONMENT } from '../src/game/systems/StatsSystem';
import { onEnemyRemoved } from '../src/game/systems/WaveSystem';

const HOUR = 3600;

function withPot() {
  const meta = createInitialMeta();
  meta.dna = 1e9;
  unlockPot(meta);
  meta.garden.seeds.eiche = 2;
  return meta;
}

describe('Garten: Töpfe und Pflanzen', () => {
  it('Töpfe kosten DNA, ×3 je Topf, mit Obergrenze', () => {
    const meta = createInitialMeta();
    meta.dna = 1e9;
    expect(potUnlockCost(meta)).toBe(GARDEN.potBaseCost);
    unlockPot(meta);
    expect(potUnlockCost(meta)).toBe(GARDEN.potBaseCost * GARDEN.potGrowth);
    for (let i = 1; i < GARDEN.maxPots; i++) unlockPot(meta);
    expect(potUnlockCost(meta)).toBeUndefined();
  });

  it('pflanzen verbraucht einen Samen, ausgraben macht den Topf frei', () => {
    const meta = withPot();
    expect(plantSeed(meta, 0, 'kiefer')).toBe(false); // kein Samen
    expect(plantSeed(meta, 0, 'eiche')).toBe(true);
    expect(meta.garden.seeds.eiche).toBe(1);
    expect(plantSeed(meta, 0, 'eiche')).toBe(false); // belegt
    expect(uproot(meta, 0)).toBe(true);
    expect(meta.garden.pots[0]?.tree).toBeNull();
  });

  it('alte Spielstände bekommen einen leeren Garten', () => {
    const old = createInitialMeta() as Partial<ReturnType<typeof createInitialMeta>>;
    delete old.garden;
    expect(normalizeMeta(old).garden.pots).toEqual([]);
  });
});

describe('Garten: Wachstum und Harz', () => {
  it('wächst langsam: Level n → n+1 dauert n Stunden', () => {
    const meta = withPot();
    plantSeed(meta, 0, 'eiche');
    tickGarden(meta, 0.99 * HOUR);
    expect(meta.garden.pots[0]?.level).toBe(1);
    tickGarden(meta, 0.02 * HOUR);
    expect(meta.garden.pots[0]?.level).toBe(2);
    // Level 2 → 10 braucht 2+3+...+9 = 44 Stunden
    const report = tickGarden(meta, 44 * HOUR);
    expect(meta.garden.pots[0]?.level).toBe(10);
    expect(report.levelUps.map((l) => l.level)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('produziert Harz nach Level und Seltenheit', () => {
    const meta = withPot();
    plantSeed(meta, 0, 'eiche');
    const pot = meta.garden.pots[0];
    if (!pot) throw new Error();
    pot.level = 20;
    const report = tickGarden(meta, 10 * HOUR);
    const expected = resinPerHour('eiche', 20) * 10;
    expect(report.resin).toBe(Math.floor(expected));
    expect(meta.garden.resin).toBe(report.resin);
    expect(resinPerHour('mammutbaum', 10)).toBeGreaterThan(resinPerHour('moos', 10));
  });

  it('läuft über die Echtzeit-Abrechnung mit (auch offline)', () => {
    const meta = withPot();
    plantSeed(meta, 0, 'eiche');
    meta.passive.lastTick = 0;
    const report = tickPassive(meta, 3 * HOUR * 1000);
    expect(report.garden.levelUps.length).toBeGreaterThan(0);
  });
});

describe('Garten: Boni', () => {
  it('Bonus je Baum = perLevel × Level × Seltenheit; Garten ist ein eigener Topf', () => {
    expect(treeBonus('eiche', 10)).toBeCloseTo(TREE_DEFS.eiche.perLevel * 10 * RARITIES.selten.power);
    const meta = withPot();
    plantSeed(meta, 0, 'eiche');
    (meta.garden.pots[0] as { level: number }).level = 30;
    const totals = gardenTotals(meta);
    expect(totals.damage).toBeCloseTo(treeBonus('eiche', 30));
    const stats = computeStats({ defId: 'wurm', level: 1, prestige: 0 }, { ...EMPTY_ENVIRONMENT, meta: metaValues(meta) });
    expect(stats.breakdown.damage.garten).toBeCloseTo(1 + totals.damage);
  });

  it('Farn erhöht die Evolutionschance', () => {
    const meta = withPot();
    meta.garden.seeds.farn = 1;
    plantSeed(meta, 0, 'farn');
    (meta.garden.pots[0] as { level: number }).level = 20;
    expect(metaValues(meta).passiveSum.evolution).toBeCloseTo(treeBonus('farn', 20));
  });
});

describe('Garten: Samenfund', () => {
  it('Chance erst ab Welle 5, bei Bosswellen höher', () => {
    expect(seedChance(4, false)).toBe(0);
    expect(seedChance(5, false)).toBe(GARDEN.seedChance);
    expect(seedChance(10, true)).toBe(GARDEN.bossSeedChance);
  });

  it('Seltenheiten werden gemäß Gewicht gewürfelt; legendär ist rar', () => {
    const rng = new Rng(7);
    const counts = new Map<string, number>(TREE_IDS.map((id) => [id, 0]));
    const n = 50_000;
    for (let i = 0; i < n; i++) {
      const id = rollTree(rng);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const c = (id: string): number => counts.get(id) ?? 0;
    const legendary = c('mammutbaum') / n;
    expect(legendary).toBeGreaterThan(0.005);
    expect(legendary).toBeLessThan(0.02);
    const common = (c('moos') + c('farn') + c('schachtelhalm')) / n;
    expect(common).toBeGreaterThan(0.65);
  });

  it('nach geschafften Wellen landen Samen im Inventar', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta, createInitialState(11));
    let found = 0;
    game.bus.on('seedFound', () => found++);
    for (let wave = 5; wave <= 400; wave++) {
      game.state.wave.current = wave;
      game.state.wave.aliveFromCurrent = 1;
      game.bus.emit('waveStarted', { wave, tier: 0 });
      onEnemyRemoved(game.ctx); // Welle geschafft
    }
    expect(found).toBeGreaterThan(5);
    expect(meta.garden.seedsFound).toBe(found);
  });
});
