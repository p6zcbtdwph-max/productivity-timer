import { describe, expect, it } from 'vitest';
import { cellKey, createMap, MAPS, START_MAP } from '../src/data/map';

describe('Karten', () => {
  it('Bauplätze liegen nie auf einem Weg, aber immer daneben', () => {
    for (const map of MAPS) {
      for (const slot of map.buildSlots) {
        expect(map.pathCells.has(cellKey(slot.x, slot.y))).toBe(false);
        const adjacent = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => map.pathCells.has(cellKey(slot.x + (dx as number), slot.y + (dy as number))));
        expect(adjacent).toBe(true);
      }
    }
  });

  it('jeder Weg beginnt am linken und endet am rechten Rand', () => {
    for (const map of MAPS) {
      for (const path of map.paths) {
        expect(path[0]?.x).toBe(0.5);
        expect(path[path.length - 1]?.x).toBe(map.cols - 0.5);
      }
    }
  });

  it('jede Karte ist anders: Wege, Objekte, Modus', () => {
    const [urmeer, kontinent, fabrik] = MAPS;
    if (!urmeer || !kontinent || !fabrik) throw new Error('3 Karten erwartet');
    expect(urmeer.paths).toHaveLength(1);
    expect(kontinent.paths).toHaveLength(2);
    expect(fabrik.paths).toHaveLength(2);
    // Urkontinent: Weg teilt sich (gleicher Start), Fabrik: zwei Eingänge (verschiedene Starts)
    expect(kontinent.paths[0]?.[0]).toEqual(kontinent.paths[1]?.[0]);
    expect(fabrik.paths[0]?.[0]).not.toEqual(fabrik.paths[1]?.[0]);
    expect(new Set(kontinent.slotBiome.filter(Boolean)).size).toBe(4);
    expect(kontinent.obstacles.length).toBeGreaterThan(0);
    expect(fabrik.obstacles.every((o) => o.kind === 'schrott')).toBe(true);
    expect(fabrik.adaptive).toBeDefined();
    expect(kontinent.adaptive).toBeUndefined();
    expect(kontinent.unlock?.mapId).toBe(urmeer.id);
    expect(fabrik.unlock?.mapId).toBe(kontinent.id);
    expect(new Set(MAPS.map((m) => m.achievement.kind)).size).toBe(3);
  });

  it('lehnt diagonale Wege und Objekte neben Bauplätzen ab', () => {
    const base = { id: 't', name: 'T', description: '', achievement: { kind: 'damage' as const, every: 50, perMilestone: 0.1 }, cols: 5, rows: 5 };
    expect(() => createMap({ ...base, paths: [[{ x: 0, y: 0 }, { x: 2, y: 2 }]] })).toThrow();
    expect(() =>
      createMap({ ...base, paths: [[{ x: 0, y: 2 }, { x: 4, y: 2 }]], obstacles: [{ x: 0, y: 4, kind: 'fels' }] }),
    ).toThrow();
    expect(START_MAP.obstacles).toHaveLength(0);
  });
});
