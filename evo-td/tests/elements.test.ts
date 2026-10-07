import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { applyDamage } from '../src/game/systems/DamageSystem';
import { updateElements } from '../src/game/systems/ElementSystem';
import { applyOnHit } from '../src/game/systems/StatusSystem';
import { elementChance, spawnEnemy } from '../src/game/systems/WaveSystem';

function freshGame(): Game {
  return new Game(START_MAP, createInitialState(11));
}

describe('Gegner-Elemente', () => {
  it('kommen erst ab der konfigurierten Welle vor', () => {
    expect(elementChance(BALANCE.elements.fromWave - 1)).toBe(0);
    expect(elementChance(BALANCE.elements.fromWave)).toBeGreaterThan(0);
    expect(elementChance(1000)).toBe(BALANCE.elements.maxChance);
  });

  it('Gold-Legierung verdoppelt die Belohnung', () => {
    const game = freshGame();
    const plain = spawnEnemy(game.ctx, { defId: 'drohne', element: null }, 1);
    const gold = spawnEnemy(game.ctx, { defId: 'drohne', element: 'gold' }, 1);
    expect(gold.reward).toBe(plain.reward * 2);
  });

  it('Plasma-Schild nimmt Schaden vor den HP auf, Schildbrecher beschleunigt das', () => {
    const game = freshGame();
    const enemy = spawnEnemy(game.ctx, { defId: 'drohne', element: 'plasma' }, 1);
    expect(enemy.shield).toBeCloseTo(enemy.maxHp * BALANCE.elements.shieldFraction);
    applyDamage(game.ctx, enemy, enemy.shield / 2, 0);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(enemy.shield).toBeCloseTo(enemy.shieldMax / 2);

    const other = spawnEnemy(game.ctx, { defId: 'drohne', element: 'plasma' }, 1);
    applyDamage(game.ctx, other, other.shield / 2, 0, { shieldBreaker: 1 });
    expect(other.shield).toBeCloseTo(0);
    expect(other.hp).toBe(other.maxHp);
  });

  it('Titan-Kern überlebt den ersten Tod genau einmal', () => {
    const game = freshGame();
    const enemy = spawnEnemy(game.ctx, { defId: 'drohne', element: 'titan' }, 1);
    const kills = game.state.stats.kills;
    applyDamage(game.ctx, enemy, enemy.maxHp * 10, 0);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(enemy.extraLives).toBe(0);
    expect(game.state.enemies).toContain(enemy);
    applyDamage(game.ctx, enemy, enemy.maxHp * 10, 0);
    expect(game.state.enemies).not.toContain(enemy);
    expect(game.state.stats.kills).toBe(kills + 1);
  });

  it('Nanobots heilen, Anti-Heilung unterdrückt das', () => {
    const game = freshGame();
    const enemy = spawnEnemy(game.ctx, { defId: 'drohne', element: 'nano' }, 1);
    applyDamage(game.ctx, enemy, enemy.maxHp / 2, 0);
    const before = enemy.hp;
    updateElements(game.ctx, 1);
    expect(enemy.hp).toBeCloseTo(before + enemy.maxHp * BALANCE.elements.healFractionPerSecond);

    applyOnHit(enemy, { antiHeal: { percent: 1, duration: 5 } });
    const suppressed = enemy.hp;
    updateElements(game.ctx, 1);
    expect(enemy.hp).toBeCloseTo(suppressed);
  });
});
