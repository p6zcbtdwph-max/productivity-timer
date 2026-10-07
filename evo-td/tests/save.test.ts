import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import { SaveManager } from '../src/persistence/SaveManager';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('Speichern & Laden', () => {
  it('Spielstand übersteht eine JSON-Rundreise und die Simulation läuft identisch weiter', () => {
    const saves = new SaveManager<ReturnType<typeof createInitialState>>('run', 1, new MemoryStorage());
    const a = new Game(START_MAP, createInitialMeta(), createInitialState(99));
    a.state.gold = 10_000;
    a.build(0);
    a.build(3);
    for (let i = 0; i < 60 * 20; i++) a.update(BALANCE.stepSeconds);

    saves.save(a.state);
    const loaded = saves.load();
    expect(loaded).toBeDefined();
    const b = new Game(START_MAP, createInitialMeta(), loaded);

    for (let i = 0; i < 60 * 20; i++) {
      a.update(BALANCE.stepSeconds);
      b.update(BALANCE.stepSeconds);
    }
    expect(b.state.gold).toBe(a.state.gold);
    expect(b.state.stats).toEqual(a.state.stats);
    expect(b.state.towers.map((t) => t.defId)).toEqual(a.state.towers.map((t) => t.defId));
  });

  it('liefert undefined, wenn nichts gespeichert ist', () => {
    expect(new SaveManager('x', 1, new MemoryStorage()).load()).toBeUndefined();
  });
});
