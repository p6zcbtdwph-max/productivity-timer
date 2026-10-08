import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { ARTIFACT_ORDER, dnaForWave, META_UPGRADE_DEFS, REPEAT_WAVE_FACTOR } from '../src/data/meta';
import { childrenOf } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta, overallBestWave } from '../src/game/MetaState';
import { AUTO_WEIGHTS, autoMode, DANGER_THRESHOLD, runAutoUpgrades } from '../src/game/systems/AutoSystem';
import { addSpeciesXp, speciesXp } from '../src/game/systems/CompendiumSystem';
import { grantXp } from '../src/game/systems/LevelSystem';
import {
  achievementStatus,
  artifactState,
  buyMetaUpgrade,
  canUnlockArtifact,
  computeDna,
  isUnlocked,
  metaValues,
  settleRun,
  unlockArtifact,
  unlockProgress,
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

describe('Arten freischalten (über Kompendium-XP)', () => {
  it('Tier 2 frei, danach XP der Elternart nötig – kein DNA', () => {
    const meta = createInitialMeta();
    meta.dna = 1_000_000; // DNA hilft nicht
    expect(isUnlocked(meta, 'wurm')).toBe(true);
    expect(isUnlocked(meta, 'schnecke')).toBe(false);
    expect(unlockProgress(meta, 'schnecke')).toEqual({ parent: 'wurm', xp: 0, need: 1500 });
    const unlocked = addSpeciesXp(meta, 'wurm', 1500);
    expect(unlocked).toEqual(expect.arrayContaining([...childrenOf('wurm')]));
    expect(isUnlocked(meta, 'schnecke')).toBe(true);
    expect(meta.dna).toBe(1_000_000);
    expect(addSpeciesXp(meta, 'wurm', 1000)).toEqual([]); // nur einmal gemeldet
    expect(speciesXp(meta, 'wurm')).toBe(2500);
  });

  it('XP von Türmen zählen im Kompendium und melden Freischaltungen', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta, createInitialState(5));
    game.state.gold = 10_000;
    const tower = game.build(0);
    if (!tower) throw new Error('Bau fehlgeschlagen');
    game.forceEvolve(tower.id, 'wurm');
    const seen: string[] = [];
    game.bus.on('speciesUnlocked', ({ id, by }) => {
      expect(by).toBe('wurm');
      seen.push(id);
    });
    grantXp(game.ctx, tower, 1499);
    expect(seen).toEqual([]);
    grantXp(game.ctx, tower, 1);
    expect(seen.sort()).toEqual([...childrenOf('wurm')].sort());
  });

  it('Mutationen werden über XP der Endform frei', () => {
    const meta = createInitialMeta();
    const mutation = childrenOf('wolf')[0] as string;
    const { need } = unlockProgress(meta, mutation);
    expect(isUnlocked(meta, mutation)).toBe(false);
    addSpeciesXp(meta, 'wolf', need);
    expect(isUnlocked(meta, mutation)).toBe(true);
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
  function autoGame(seed: number): Game {
    const meta = createInitialMeta();
    meta.upgrades.autoUpgrades = 1;
    meta.autoUpgradeEnabled = true;
    const game = new Game(START_MAP, meta, createInitialState(seed));
    // Alle Plätze belegen, damit kein neuer Turm gekauft werden kann.
    game.state.gold = 1e12;
    for (let slot = 0; slot < START_MAP.buildSlots.length; slot++) game.build(slot);
    game.state.gold = 2000;
    return game;
  }

  it('braucht Instinkt und den Schalter', () => {
    const game = autoGame(1);
    game.meta.autoUpgradeEnabled = false;
    expect(runAutoUpgrades(game.ctx)).toEqual([]);
    game.meta.autoUpgradeEnabled = true;
    game.meta.upgrades.autoUpgrades = 0;
    expect(runAutoUpgrades(game.ctx)).toEqual([]);
    game.meta.upgrades.autoUpgrades = 1;
    expect(runAutoUpgrades(game.ctx).length).toBeGreaterThan(0);
  });

  it('kauft nichts, solange ein neuer Turm bezahlbar ist', () => {
    const meta = createInitialMeta();
    meta.upgrades.autoUpgrades = 1;
    meta.autoUpgradeEnabled = true;
    const game = new Game(START_MAP, meta, createInitialState(2));
    game.state.gold = game.towerCost() + 500;
    expect(runAutoUpgrades(game.ctx)).toEqual([]);
    expect(game.state.gold).toBe(game.towerCost() + 500);
  });

  it('läuft einmal beim Start jeder Welle (ab Welle 2)', () => {
    const game = autoGame(3);
    let calls = 0;
    game.bus.on('autoUpgraded', () => calls++);
    for (let i = 0; i < 60 * 45; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.wave.current).toBeGreaterThanOrEqual(2);
    expect(calls).toBeGreaterThan(0);
    expect(calls).toBeLessThanOrEqual(game.state.wave.current - 1);
  });

  it('Gefahr: Schaden und Feuerrate zuerst; ruhig: Gold zuerst', () => {
    expect(AUTO_WEIGHTS.gefahr.damage).toBeGreaterThan(AUTO_WEIGHTS.gefahr.passive);
    expect(AUTO_WEIGHTS.ruhig.passive).toBeGreaterThan(AUTO_WEIGHTS.ruhig.damage);

    const danger = autoGame(4);
    danger.state.wave.danger = DANGER_THRESHOLD + 0.1;
    expect(autoMode(danger.ctx)).toBe('gefahr');
    const bought = runAutoUpgrades(danger.ctx);
    expect(bought.slice(0, 2).sort()).toEqual(['damage', 'fireRate']);
    expect(danger.state.wave.danger).toBe(0); // Messung zurückgesetzt

    const calm = autoGame(5);
    calm.state.wave.danger = 0.2;
    expect(autoMode(calm.ctx)).toBe('ruhig');
    expect(runAutoUpgrades(calm.ctx)[0]).toBe('passive');

    const leak = autoGame(6);
    leak.state.wave.leaks = 1;
    expect(autoMode(leak.ctx)).toBe('gefahr');
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
