import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/Rng';
import { BALANCE } from '../src/config/balance';
import { GARDEN, RARITIES, resinPerHour, TREE_DEFS, TREE_IDS, treeBonus } from '../src/data/garden';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, normalizeMeta } from '../src/game/MetaState';
import { buyGardenUpgrade, gardenTotals, gardenUpgradePrice, plantSeed, potUnlockCost, rollTree, seedChance, tickGarden, unlockPot, uproot } from '../src/game/systems/GardenSystem';
import { metaValues } from '../src/game/systems/MetaSystem';
import { tickPassive } from '../src/game/systems/PassiveSystem';
import { computeStats, EMPTY_ENVIRONMENT } from '../src/game/systems/StatsSystem';
import { onEnemyRemoved } from '../src/game/systems/WaveSystem';

const HOUR = 3600;

function withPot() {
  const meta = createInitialMeta(); // startet mit einem Topf
  meta.garden.seeds.eiche = 2;
  return meta;
}

describe('Garten: Töpfe und Pflanzen', () => {
  it('Start mit einem Topf; weitere nur für Harz (nicht DNA), ×3 je Topf, mit Obergrenze', () => {
    const meta = createInitialMeta();
    expect(meta.garden.pots).toHaveLength(1);
    meta.dna = 1e9;
    expect(unlockPot(meta)).toBe(false); // DNA zählt nicht
    expect(potUnlockCost(meta)).toBe(GARDEN.potBaseCost);
    meta.garden.resin = 1e9;
    expect(unlockPot(meta)).toBe(true);
    expect(meta.garden.resin).toBe(1e9 - GARDEN.potBaseCost);
    expect(meta.dna).toBe(1e9);
    expect(potUnlockCost(meta)).toBe(GARDEN.potBaseCost * GARDEN.potGrowth);
    while (unlockPot(meta));
    expect(meta.garden.pots).toHaveLength(GARDEN.maxPots);
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

  it('alte Spielstände bekommen einen Garten mit Start-Topf', () => {
    const old = createInitialMeta() as Partial<ReturnType<typeof createInitialMeta>>;
    delete old.garden;
    expect(normalizeMeta(old).garden.pots).toHaveLength(1);
    const empty = createInitialMeta();
    empty.garden.pots = [];
    expect(normalizeMeta(empty).garden.pots).toHaveLength(1);
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

describe('Pflege (Harz)', () => {
  it('kostet Harz mit steigendem Preis und Obergrenze', () => {
    const meta = createInitialMeta();
    expect(buyGardenUpgrade(meta, 'duenger')).toBe(false);
    meta.garden.resin = 1e9;
    const first = gardenUpgradePrice(meta, 'duenger') ?? 0;
    expect(buyGardenUpgrade(meta, 'duenger')).toBe(true);
    expect(gardenUpgradePrice(meta, 'duenger')).toBeGreaterThan(first);
    while (buyGardenUpgrade(meta, 'laubdecke'));
    expect(gardenUpgradePrice(meta, 'laubdecke')).toBeUndefined();
  });

  it('Dünger beschleunigt das Wachstum, Harzkanäle nicht das Wachstum aber das Harz', () => {
    const a = withPot();
    const b = withPot();
    plantSeed(a, 0, 'eiche');
    plantSeed(b, 0, 'eiche');
    b.garden.upgrades.duenger = 20; // ×4
    tickGarden(a, 10 * HOUR);
    tickGarden(b, 10 * HOUR);
    expect(b.garden.pots[0]?.level).toBeGreaterThan(a.garden.pots[0]?.level ?? 0);

    const c = withPot();
    plantSeed(c, 0, 'eiche');
    (c.garden.pots[0] as { level: number }).level = 50;
    const plain = tickGarden(structuredClone(c), HOUR).resin;
    c.garden.upgrades.harzkanal = 20; // ×4
    expect(tickGarden(c, HOUR).resin).toBeGreaterThanOrEqual(plain * 4 - 1);
  });

  it('Kompost verstärkt Baum-Boni, Vogelfutter und Veredelung wirken auf Samen', () => {
    const meta = withPot();
    plantSeed(meta, 0, 'eiche');
    (meta.garden.pots[0] as { level: number }).level = 10;
    const before = gardenTotals(meta).damage;
    meta.garden.upgrades.kompost = 10; // ×2
    expect(gardenTotals(meta).damage).toBeCloseTo(before * 2);

    const rng = new Rng(3);
    const lucky = new Rng(3);
    let rare = 0;
    let rareLucky = 0;
    for (let i = 0; i < 20_000; i++) {
      if (TREE_DEFS[rollTree(rng)].rarity !== 'haeufig') rare++;
      if (TREE_DEFS[rollTree(lucky, 2)].rarity !== 'haeufig') rareLucky++;
    }
    expect(rareLucky).toBeGreaterThan(rare * 1.5);
  });

  it('Passiv-Pflege wirkt auf Kammern, Reviere und Offline-Zeit', () => {
    const meta = createInitialMeta();
    const before = metaValues(meta);
    meta.garden.upgrades.nistmaterial = 10;
    meta.garden.upgrades.wildwechsel = 10;
    meta.garden.upgrades.laubdecke = 3;
    const after = metaValues(meta);
    expect(after.chamberSpeedMult).toBeCloseTo(before.chamberSpeedMult * 2);
    expect(after.passiveDnaMult).toBeCloseTo(before.passiveDnaMult * 2);
    expect(after.offlineCapSeconds).toBe(before.offlineCapSeconds + 3 * HOUR);
  });
});

describe('Samen nur aktiv', () => {
  it('in der Winterruhe gibt es keine Samen', async () => {
    const { simulateOfflineRun } = await import('../src/game/OfflineRun');
    const meta = createInitialMeta();
    meta.garden.upgrades.vogelfutter = 15; // Chance hoch, damit ein Fund sicher wäre
    const game = new Game(START_MAP, meta, createInitialState(4));
    game.state.gold = 1e9;
    for (let slot = 0; slot < 40; slot++) game.build(slot);
    for (const t of game.state.towers) t.level = 200;
    const report = await simulateOfflineRun(game, 2 * HOUR, { sync: true });
    expect(report.waveAfter).toBeGreaterThan(20);
    expect(meta.garden.seedsFound).toBe(0);

    // aktiv dagegen schon
    const active = new Game(START_MAP, meta, createInitialState(4));
    active.state.gold = 1e9;
    for (let slot = 0; slot < 40; slot++) active.build(slot);
    for (const t of active.state.towers) t.level = 200;
    for (let i = 0; i < 60 * 60 * 10; i++) active.update(BALANCE.stepSeconds);
    expect(meta.garden.seedsFound).toBeGreaterThan(0);
  });
});
