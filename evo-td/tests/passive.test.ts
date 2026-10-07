import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { BASE_TOWER_IDS, getTowerDef } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, type MetaState } from '../src/game/MetaState';
import { simulateOfflineRun } from '../src/game/OfflineRun';
import { metaValues } from '../src/game/systems/MetaSystem';
import {
  animalCost,
  animalDnaPerHour,
  assignToMap,
  buyAnimal,
  chamberEvolutionRate,
  chamberUnlockCost,
  freeChamber,
  returnToChamber,
  tickPassive,
  toggleChamberLock,
  unlockChamber,
} from '../src/game/systems/PassiveSystem';

const HOUR = 3600_000;

function richMeta(): MetaState {
  const meta = createInitialMeta();
  meta.dna = 1_000_000;
  meta.passive.lastTick = 0;
  return meta;
}

describe('Evolutionskammern', () => {
  it('Kammern kosten DNA, ×4 je Kammer, mit Obergrenze', () => {
    const meta = richMeta();
    meta.dna = 1e9;
    expect(chamberUnlockCost(meta)).toBe(BALANCE.passive.chamberBaseCost);
    expect(unlockChamber(meta)).toBe(true);
    expect(chamberUnlockCost(meta)).toBe(BALANCE.passive.chamberBaseCost * BALANCE.passive.chamberGrowth);
    for (let i = 1; i < BALANCE.passive.maxChambers; i++) unlockChamber(meta);
    expect(meta.passive.chambersUnlocked).toBe(BALANCE.passive.maxChambers);
    expect(chamberUnlockCost(meta)).toBeUndefined();
    expect(unlockChamber(meta)).toBe(false);
  });

  it('Tiere kaufen: nur in freie, freigeschaltete Kammern, Preis steigt', () => {
    const meta = richMeta();
    expect(buyAnimal(meta, 0)).toBeUndefined(); // keine Kammer
    unlockChamber(meta);
    const first = animalCost(meta);
    const animal = buyAnimal(meta, 0);
    expect(animal?.defId).toBe('einzeller');
    expect(buyAnimal(meta, 0)).toBeUndefined(); // belegt
    expect(animalCost(meta)).toBeGreaterThan(first);
    expect(freeChamber(meta)).toBeUndefined();
  });

  it('entwickelt sich in Echtzeit nur zu freigeschalteten Arten, höhere Tiers langsamer', () => {
    const meta = richMeta();
    unlockChamber(meta);
    const animal = buyAnimal(meta, 0);
    if (!animal) throw new Error('Kauf fehlgeschlagen');
    // Ohne Freischaltungen höchstens Tier 1
    tickPassive(meta, 24 * HOUR);
    expect(getTowerDef(animal.defId).tier).toBeLessThanOrEqual(1);
    expect(getTowerDef(animal.defId).tier).toBe(1); // 8 h bei 2/h: praktisch sicher

    meta.unlockedTowers.push(...BASE_TOWER_IDS);
    const rateT1 = chamberEvolutionRate(meta, animal);
    expect(rateT1).toBeCloseTo(BALANCE.passive.evolutionsPerHour / 2);
    meta.upgrades.hatchery = 4;
    expect(chamberEvolutionRate(meta, animal)).toBeCloseTo(rateT1 * 2);

    toggleChamberLock(meta, animal.id);
    expect(chamberEvolutionRate(meta, animal)).toBe(0);
    const before = animal.defId;
    tickPassive(meta, 48 * HOUR);
    expect(animal.defId).toBe(before);
  });

  it('lange Abwesenheit wird gedeckelt, kann aber mehrere Evolutionen enthalten', () => {
    const meta = richMeta();
    meta.unlockedTowers.push(...BASE_TOWER_IDS);
    unlockChamber(meta);
    const animal = buyAnimal(meta, 0);
    if (!animal) throw new Error('Kauf fehlgeschlagen');
    meta.upgrades.hatchery = 20; // ×6
    const report = tickPassive(meta, 100 * HOUR);
    expect(report.seconds).toBe(metaValues(meta).offlineCapSeconds);
    expect(report.cappedSeconds).toBeGreaterThan(0);
    expect(report.evolutions.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < report.evolutions.length; i++) {
      expect(report.evolutions[i]?.from).toBe(report.evolutions[i - 1]?.to);
    }
  });
});

describe('Reviere', () => {
  it('Zuweisung belegt Revierplätze, gibt die Kammer frei und bringt DNA pro Stunde', () => {
    const meta = richMeta();
    unlockChamber(meta);
    unlockChamber(meta);
    const a = buyAnimal(meta, 0);
    const b = buyAnimal(meta, 1);
    if (!a || !b) throw new Error('Kauf fehlgeschlagen');
    a.defId = 'wolf'; // Tier 4
    expect(assignToMap(meta, a.id, START_MAP.id)).toBe(true);
    expect(a.chamber).toBeNull();
    expect(freeChamber(meta)).toBe(0);
    expect(assignToMap(meta, b.id, START_MAP.id)).toBe(false); // nur 1 Platz
    meta.upgrades.territory = 1;
    expect(assignToMap(meta, b.id, START_MAP.id)).toBe(true);

    meta.bestWaveByMap[START_MAP.id] = 100;
    const expected = BALANCE.passive.dnaPerHour * 16 * 3;
    expect(animalDnaPerHour(meta, a)).toBeCloseTo(expected);

    const dnaBefore = meta.dna;
    meta.passive.lastTick = 0;
    const report = tickPassive(meta, 2 * HOUR);
    const perHour = animalDnaPerHour(meta, a) + animalDnaPerHour(meta, b);
    expect(report.dna).toBe(Math.floor(perHour * 2));
    expect(meta.dna).toBe(dnaBefore + report.dna);

    expect(returnToChamber(meta, a.id)).toBe(true);
    expect(a.chamber).toBe(0);
  });
});

describe('Winterruhe (Offline-Run)', () => {
  function setup(seed: number): Game {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta, createInitialState(seed));
    game.state.gold = 1_000_000;
    for (let slot = 0; slot < 8; slot++) game.build(slot);
    return game;
  }

  it('läuft weiter, stirbt nie und hält vor der Wand an', async () => {
    const game = setup(21);
    const lives = game.state.lives;
    const report = await simulateOfflineRun(game, 8 * 3600, { sync: true });
    expect(report.stoppedAtWall).toBe(true);
    expect(report.waveAfter).toBeGreaterThan(report.waveBefore);
    expect(game.state.lives).toBe(lives);
    expect(game.state.gameOver).toBe(false);
    expect(report.simulatedSeconds).toBeLessThan(8 * 3600);
  });

  it('verminderte Kraft: offline kommt man weniger weit als mit voller Kraft', async () => {
    const weak = setup(5);
    const weakReport = await simulateOfflineRun(weak, 8 * 3600, { sync: true });
    const strong = setup(5);
    strong.meta.upgrades.winterFur = 10; // 100 % Kraft
    const strongReport = await simulateOfflineRun(strong, 8 * 3600, { sync: true });
    expect(strongReport.power).toBe(1);
    expect(weakReport.power).toBe(BALANCE.passive.offlinePower);
    expect(strongReport.waveAfter).toBeGreaterThan(weakReport.waveAfter);
  });

  it('ohne Türme passiert nichts', async () => {
    const game = new Game(START_MAP, createInitialMeta(), createInitialState(1));
    const report = await simulateOfflineRun(game, 3600, { sync: true });
    expect(report.simulatedSeconds).toBe(0);
    expect(game.state.wave.current).toBe(0);
  });
});
