import { describe, expect, it } from 'vitest';
import { dnaForWave, REPEAT_WAVE_FACTOR } from '../src/data/meta';
import { START_MAP } from '../src/data/map';
import { childrenOf } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialMeta } from '../src/game/MetaState';
import { buyMetaUpgrade, canUnlock, computeDna, isUnlocked, metaValues, settleRun, unlockTower } from '../src/game/systems/MetaSystem';
import { formatNumber } from '../src/ui/dom';

describe('Globaler Shop (Meta)', () => {
  it('DNA kommt fast nur aus neuen Bestwellen', () => {
    const meta = createInitialMeta();
    const first = settleRun(meta, 20);
    expect(first.fromRepeatedWaves).toBe(0);
    expect(first.fromNewWaves).toBeGreaterThan(0);
    expect(meta.bestWave).toBe(20);
    expect(meta.dna).toBe(first.total);

    const repeat = computeDna(meta, 20);
    expect(repeat.fromNewWaves).toBe(0);
    expect(repeat.total).toBeLessThanOrEqual(Math.ceil(first.total * REPEAT_WAVE_FACTOR) + 1);

    const push = computeDna(meta, 25);
    let expectedNew = 0;
    for (let w = 21; w <= 25; w++) expectedNew += dnaForWave(w);
    expect(push.fromNewWaves).toBe(expectedNew);
    expect(push.fromNewWaves).toBeGreaterThan(push.fromRepeatedWaves);
  });

  it('späte Wellen sind viel mehr wert', () => {
    expect(dnaForWave(1000) / dnaForWave(10)).toBeGreaterThan(500);
  });

  it('Freischaltung verlangt freien Elternknoten und DNA', () => {
    const meta = createInitialMeta();
    expect(isUnlocked(meta, 'wurm')).toBe(true);
    expect(isUnlocked(meta, 'schnecke')).toBe(false);
    expect(canUnlock(meta, 'tintenfisch')).toBe(false); // Eltern (Schnecke) gesperrt
    meta.dna = 24;
    expect(canUnlock(meta, 'schnecke')).toBe(false); // zu wenig
    meta.dna = 125;
    expect(unlockTower(meta, 'schnecke')).toBe(true);
    expect(meta.dna).toBe(100);
    expect(unlockTower(meta, 'schnecke')).toBe(false); // schon frei
    expect(unlockTower(meta, 'tintenfisch')).toBe(true);
    expect(meta.dna).toBe(0);
  });

  it('Mutationen lassen sich freischalten, sobald die Endform frei ist', () => {
    const meta = createInitialMeta();
    meta.dna = 1_000_000;
    for (const id of ['fisch', 'frosch', 'spitzmaus', 'wolf']) unlockTower(meta, id);
    const mutation = childrenOf('wolf')[0] as string;
    expect(canUnlock(meta, mutation)).toBe(true);
    expect(unlockTower(meta, mutation)).toBe(true);
    expect(isUnlocked(meta, mutation)).toBe(true);
  });

  it('Meta-Upgrades kosten DNA, haben eine Obergrenze und wirken auf Startwerte', () => {
    const meta = createInitialMeta();
    const before = metaValues(meta);
    meta.dna = 100_000;
    expect(buyMetaUpgrade(meta, 'startLives')).toBe(true);
    expect(metaValues(meta).startLives).toBe(before.startLives + 1);
    expect(buyMetaUpgrade(meta, 'autoFusion')).toBe(true);
    expect(buyMetaUpgrade(meta, 'autoFusion')).toBe(false); // max 1
    expect(metaValues(meta).autoFusion).toBe(true);
    const game = new Game(START_MAP, meta);
    expect(game.state.lives).toBe(before.startLives + 1);
  });

  it('endRun schreibt DNA gut und startet einen frischen Run', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta);
    game.state.wave.current = 12;
    game.state.gold = 999;
    const report = game.endRun();
    expect(report.wave).toBe(12);
    expect(meta.dna).toBe(report.total);
    expect(meta.runs).toBe(1);
    expect(game.state.wave.current).toBe(0);
    expect(game.state.bestWaveAtStart).toBe(12);
  });

  it('formatNumber trägt bis Welle 1000+', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(12_345)).toBe('12.3K');
    expect(formatNumber(2 ** 200 * 12)).toMatch(/e\d+$/);
    expect(formatNumber(1.5e12)).toBe('1.5T');
  });
});
