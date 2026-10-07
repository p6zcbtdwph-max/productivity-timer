import { describe, expect, it } from 'vitest';
import { BALANCE, tierForWave, tierMultiplier } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { Rng } from '../src/core/Rng';
import { composeWave, spawnEnemy } from '../src/game/systems/WaveSystem';

describe('Wellen und Gegner', () => {
  it('Gegner-HP verdoppelt sich pro Tier (2er-Potenzen)', () => {
    const game = new Game(START_MAP, createInitialState(1));
    const perTier = BALANCE.waves.wavesPerTier;
    const hpTier0 = spawnEnemy(game.ctx, { defId: 'drohne', element: null }, 1).maxHp;
    const hpTier1 = spawnEnemy(game.ctx, { defId: 'drohne', element: null }, perTier + 1).maxHp;
    const hpTier3 = spawnEnemy(game.ctx, { defId: 'drohne', element: null }, 3 * perTier + 1).maxHp;
    expect(hpTier1).toBe(hpTier0 * 2);
    expect(hpTier3).toBe(hpTier0 * 8);
    expect(tierMultiplier(tierForWave(perTier))).toBe(1);
    expect(tierMultiplier(tierForWave(perTier + 1))).toBe(2);
  });

  it('Wellen werden größer und jede zehnte bringt einen Boss', () => {
    const rng = new Rng(1);
    expect(composeWave(10, rng).length).toBeGreaterThan(composeWave(1, rng).length);
    expect(composeWave(10, rng).map((o) => o.defId)).toContain('boss');
    expect(composeWave(9, rng).map((o) => o.defId)).not.toContain('boss');
    expect(composeWave(1, rng).every((o) => o.element === null)).toBe(true);
  });

  it('ohne Türme verliert der Spieler irgendwann Leben', () => {
    const game = new Game(START_MAP, createInitialState(3));
    for (let i = 0; i < 60 * 60; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.lives).toBeLessThan(BALANCE.player.startLives);
  });

  it('ein Einzeller tötet Gegner der ersten Welle und sammelt XP', () => {
    const game = new Game(START_MAP, createInitialState(5));
    // Alle Bauplätze mit Einzellern füllen, Gold dafür spendieren.
    game.state.gold = 1_000_000;
    for (let slot = 0; slot < START_MAP.buildSlots.length; slot++) game.build(slot);
    for (let i = 0; i < 60 * 40; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.stats.kills).toBeGreaterThan(0);
    expect(game.state.towers.some((t) => t.xp > 0 || t.level > 1)).toBe(true);
    expect(game.state.lives).toBe(BALANCE.player.startLives);
  });
});
