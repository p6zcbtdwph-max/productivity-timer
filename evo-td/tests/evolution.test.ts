import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import { evolutionChance } from '../src/game/systems/EvolutionSystem';
import { BASE_MAX_TIER, BASE_TOWER_IDS, childrenOf, getTowerDef } from '../src/data/towers';

describe('Evolution', () => {
  it('Chance steigt mit Level und gleichartigen Türmen, bleibt aber gedeckelt', () => {
    const base = evolutionChance(1, 1);
    expect(base).toBeCloseTo(BALANCE.evolution.baseChance);
    expect(evolutionChance(5, 1)).toBeGreaterThan(base);
    expect(evolutionChance(1, 5)).toBeGreaterThan(base);
    expect(evolutionChance(1000, 1000)).toBe(BALANCE.evolution.maxChance);
  });

  it('ohne Freischaltung bleibt es bei Tier 1', () => {
    const game = new Game(START_MAP, createInitialMeta(), createInitialState(9));
    game.state.gold = 10_000;
    const tower = game.build(0);
    if (!tower) throw new Error('Bau fehlgeschlagen');
    tower.level = 500;
    for (let i = 0; i < 60 * 120; i++) game.update(BALANCE.stepSeconds);
    expect(getTowerDef(tower.defId).tier).toBe(1);
  });

  it('ein gesperrter Turm entwickelt sich nie, ein freier irgendwann', () => {
    const game = new Game(START_MAP, createInitialMeta(), createInitialState(42));
    game.state.gold = 10_000;
    const locked = game.build(0);
    const free = game.build(1);
    if (!locked || !free) throw new Error('Bau fehlgeschlagen');
    game.toggleEvolutionLock(locked.id);
    // Hohe Chance erzwingen über Level.
    locked.level = 200;
    free.level = 200;

    for (let i = 0; i < 60 * 60; i++) game.update(BALANCE.stepSeconds);

    expect(locked.defId).toBe('einzeller');
    expect(free.defId).not.toBe('einzeller');
    expect(game.state.discovered).toContain(free.defId);
  });

  it('Evolution landet immer bei einem freigeschalteten direkten Nachfahren', () => {
    const game = new Game(START_MAP, createInitialMeta(), createInitialState(7));
    game.meta.unlockedTowers.push(...BASE_TOWER_IDS);
    game.state.gold = 10_000;
    const tower = game.build(0);
    if (!tower) throw new Error('Bau fehlgeschlagen');
    tower.level = 500;
    let lastDef = tower.defId;
    game.bus.on('towerEvolved', ({ from, to }) => {
      expect(from).toBe(lastDef);
      expect(childrenOf(from)).toContain(to);
      expect(getTowerDef(to).tier).toBeLessThanOrEqual(BASE_MAX_TIER);
      lastDef = to;
    });
    for (let i = 0; i < 60 * 300; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.stats.evolutions).toBeGreaterThan(0);
  });
});
