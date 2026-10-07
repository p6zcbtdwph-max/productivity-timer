import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { ARTIFACT_ORDER, dnaForWave, META_UPGRADE_DEFS, REPEAT_WAVE_FACTOR } from '../src/data/meta';
import { childrenOf } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, overallBestWave } from '../src/game/MetaState';
import {
  achievementStatus,
  artifactState,
  buyMetaUpgrade,
  canUnlock,
  canUnlockArtifact,
  computeDna,
  isUnlocked,
  metaValues,
  settleRun,
  unlockArtifact,
  unlockTower,
} from '../src/game/systems/MetaSystem';
import { formatNumber } from '../src/ui/dom';

const MAP = START_MAP.id;

describe('DNA', () => {
  it('kommt fast nur aus neuen Bestwellen der Karte', () => {
    const meta = createInitialMeta();
    const first = settleRun(meta, MAP, 20);
    expect(first.fromRepeatedWaves).toBe(0);
    expect(first.fromNewWaves).toBeGreaterThan(0);
    expect(meta.bestWaveByMap[MAP]).toBe(20);
    expect(meta.dna).toBe(first.total);

    const repeat = computeDna(meta, MAP, 20);
    expect(repeat.fromNewWaves).toBe(0);
    expect(repeat.total).toBeLessThanOrEqual(Math.ceil(first.total * REPEAT_WAVE_FACTOR) + 1);

    const push = computeDna(meta, MAP, 25);
    let expectedNew = 0;
    for (let w = 21; w <= 25; w++) expectedNew += dnaForWave(w);
    expect(push.fromNewWaves).toBe(expectedNew);
  });

  it('späte Wellen sind viel mehr wert', () => {
    expect(dnaForWave(1000) / dnaForWave(10)).toBeGreaterThan(500);
  });

  it('endRun schreibt DNA gut und startet einen frischen Run', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta);
    game.state.wave.current = 12;
    const report = game.endRun();
    expect(report.wave).toBe(12);
    expect(meta.dna).toBe(report.total);
    expect(meta.runs).toBe(1);
    expect(game.state.wave.current).toBe(0);
    expect(game.state.bestWaveAtStart).toBe(12);
  });
});

describe('Arten freischalten', () => {
  it('verlangt freien Elternknoten und DNA', () => {
    const meta = createInitialMeta();
    expect(isUnlocked(meta, 'wurm')).toBe(true);
    expect(isUnlocked(meta, 'schnecke')).toBe(false);
    expect(canUnlock(meta, 'tintenfisch')).toBe(false);
    meta.dna = 125;
    expect(unlockTower(meta, 'schnecke')).toBe(true);
    expect(unlockTower(meta, 'tintenfisch')).toBe(true);
    expect(meta.dna).toBe(0);
  });

  it('Mutationen lassen sich freischalten, sobald die Endform frei ist', () => {
    const meta = createInitialMeta();
    meta.dna = 1_000_000;
    for (const id of ['fisch', 'frosch', 'spitzmaus', 'wolf']) unlockTower(meta, id);
    const mutation = childrenOf('wolf')[0] as string;
    expect(unlockTower(meta, mutation)).toBe(true);
  });
});

describe('Artefakte (feste Reihenfolge)', () => {
  it('nur das nächste ist freischaltbar, mit Bestwelle und DNA', () => {
    const meta = createInitialMeta();
    const [first, second, third] = ARTIFACT_ORDER;
    if (!first || !second || !third) throw new Error('zu wenige Artefakte');
    expect(artifactState(meta, first.id)).toBe('next');
    expect(artifactState(meta, second.id)).toBe('locked');
    meta.dna = 1_000_000;
    expect(canUnlockArtifact(meta, second.id)).toBe(false); // Vorgänger fehlt
    expect(unlockArtifact(meta, first.id)).toBe(true);
    expect(meta.upgrades[first.id]).toBe(1);
    expect(artifactState(meta, second.id)).toBe('next');
    expect(canUnlockArtifact(meta, second.id)).toBe(false); // Bestwelle fehlt
    meta.bestWaveByMap[MAP] = second.unlockWave;
    expect(unlockArtifact(meta, second.id)).toBe(true);
    expect(artifactState(meta, third.id)).toBe('next');
  });

  it('Reihenfolge ist nach Bestwelle sortiert und Stufen kosten erst nach Freischaltung', () => {
    for (let i = 1; i < ARTIFACT_ORDER.length; i++) {
      expect((ARTIFACT_ORDER[i] as { unlockWave: number }).unlockWave).toBeGreaterThanOrEqual(
        (ARTIFACT_ORDER[i - 1] as { unlockWave: number }).unlockWave,
      );
    }
    const meta = createInitialMeta();
    meta.dna = 1000;
    expect(buyMetaUpgrade(meta, 'startGold')).toBe(false); // nicht besessen
    unlockArtifact(meta, 'startGold');
    const before = metaValues(meta).startGold;
    expect(buyMetaUpgrade(meta, 'startGold')).toBe(true);
    expect(metaValues(meta).startGold).toBe(before + META_UPGRADE_DEFS.startGold.perLevel);
  });

  it('Gedächtnis kauft am Run-Ende automatisch die gewählten Stufen', () => {
    const meta = createInitialMeta();
    for (const a of ARTIFACT_ORDER) meta.upgrades[a.id] = 1;
    meta.autoArtifacts.damage = true;
    meta.dna = 0;
    const report = settleRun(meta, MAP, 60);
    expect(report.autoBought.length).toBeGreaterThan(0);
    expect(report.autoBought.every((id) => id === 'damage')).toBe(true);
    expect(meta.upgrades.damage).toBe(1 + report.autoBought.length);
    expect(meta.upgrades.startGold).toBe(1); // nicht gewählt
  });

  it('ohne Gedächtnis kein Auto-Kauf', () => {
    const meta = createInitialMeta();
    meta.upgrades.damage = 1;
    meta.autoArtifacts.damage = true;
    expect(settleRun(meta, MAP, 60).autoBought).toEqual([]);
  });
});

describe('Auto-Kauf im Run (Instinkt)', () => {
  it('kauft nur gewählte Upgrades und nur mit freigeschaltetem Artefakt', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta, createInitialState(3));
    game.state.gold = 100_000;
    meta.autoUpgrades.damage = true;
    for (let i = 0; i < 120; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.upgrades.damage).toBe(0); // Instinkt fehlt

    meta.upgrades.autoUpgrades = 1;
    for (let i = 0; i < 120; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.upgrades.damage).toBeGreaterThan(0);
    expect(game.state.upgrades.range).toBe(0);
  });

  it('hält bei Auto-Bau Gold für den nächsten Turm zurück', () => {
    const meta = createInitialMeta();
    meta.upgrades.autoUpgrades = 1;
    meta.autoUpgrades.damage = true;
    const game = new Game(START_MAP, meta, createInitialState(4));
    game.setAutoBuild(true);
    game.state.gold = game.towerCost() + 10; // reicht nicht für Turm + Upgrade
    for (let i = 0; i < 120; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.upgrades.damage).toBe(0);
    expect(game.state.towers.length).toBeGreaterThan(0);
  });
});

describe('Karten-Erfolge', () => {
  it('alle 50 Bestwellen +10 % Schaden, als eigener Faktor', () => {
    const meta = createInitialMeta();
    expect(metaValues(meta).achievementDamageMult).toBe(1);
    meta.bestWaveByMap[MAP] = 149;
    const [status] = achievementStatus(meta);
    expect(status?.milestones).toBe(2);
    expect(status?.nextAt).toBe(150);
    expect(metaValues(meta).achievementDamageMult).toBeCloseTo(1.2);
    const report = computeDna(meta, MAP, 205);
    expect(report.newMilestones).toBe(2);
    expect(overallBestWave(meta)).toBe(149);
  });
});

describe('Zahlenformat', () => {
  it('trägt bis Welle 1000+', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(12_345)).toBe('12.3K');
    expect(formatNumber(2 ** 200 * 12)).toMatch(/e\d+$/);
    expect(formatNumber(1.5e12)).toBe('1.5T');
  });
});
