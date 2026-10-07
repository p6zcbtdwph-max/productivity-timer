import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { getTowerDef, TARGETING_ORDER } from '../src/data/towers';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import { spawnEnemy } from '../src/game/systems/WaveSystem';

function setup(): Game {
  const game = new Game(START_MAP, createInitialMeta(), createInitialState(1));
  game.state.gold = 1e9;
  return game;
}

describe('Zielpriorität', () => {
  it('Standard ist die Priorität der Art, Durchschalten geht reihum', () => {
    const game = setup();
    const t = game.build(0);
    if (!t) throw new Error('Bau fehlgeschlagen');
    expect(t.targeting).toBeUndefined();
    expect(getTowerDef('einzeller').targeting).toBe('first');
    const seen = [];
    for (let i = 0; i < TARGETING_ORDER.length; i++) seen.push(game.cycleTargeting(t.id));
    expect(seen).toEqual(['last', 'strongest', 'weakest', 'closest', 'first']);
  });

  it('bleibt bei Evolution erhalten', () => {
    const game = setup();
    const t = game.build(0);
    if (!t) throw new Error('Bau fehlgeschlagen');
    game.cycleTargeting(t.id); // last
    game.forceEvolve(t.id, 'wurm');
    expect(t.targeting).toBe('last');
  });

  function shotTargetAfter(mode: 'first' | 'last' | 'strongest' | 'weakest'): number {
    const game = setup();
    // Turm vorne am Weg, drei Gegner auf dem ersten Wegstück, alle in Reichweite
    const t = game.build(1);
    if (!t) throw new Error('Bau fehlgeschlagen');
    t.targeting = mode;
    const ids: number[] = [];
    for (const [x, hp] of [[0.6, 50], [1.2, 500], [1.8, 5]] as const) {
      const e = spawnEnemy(game.ctx, { defId: 'drohne', element: null }, 1);
      e.x = x;
      e.distanceTravelled = x;
      e.hp = e.maxHp = hp;
      e.speed = 0;
      ids.push(e.id);
    }
    game.update(BALANCE.stepSeconds);
    const p = game.state.projectiles[0];
    if (!p) throw new Error('kein Schuss');
    return ids.indexOf(p.targetId);
  }

  it('wählt das richtige Ziel', () => {
    expect(shotTargetAfter('first')).toBe(2); // am weitesten
    expect(shotTargetAfter('last')).toBe(0); // am wenigsten weit
    expect(shotTargetAfter('strongest')).toBe(1); // 500 HP
    expect(shotTargetAfter('weakest')).toBe(2); // 5 HP
  });
});
