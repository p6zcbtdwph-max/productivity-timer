import { describe, expect, it } from 'vitest';
import { cellKey, createMap, START_MAP } from '../src/data/map';

describe('Karte', () => {
  it('Bauplätze liegen nie auf dem Pfad, aber immer daneben', () => {
    for (const slot of START_MAP.buildSlots) {
      expect(START_MAP.pathCells.has(cellKey(slot.x, slot.y))).toBe(false);
      const adjacent = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => START_MAP.pathCells.has(cellKey(slot.x + (dx as number), slot.y + (dy as number))));
      expect(adjacent).toBe(true);
    }
  });

  it('Pfad beginnt am linken und endet am rechten Rand', () => {
    const first = START_MAP.waypoints[0];
    const last = START_MAP.waypoints[START_MAP.waypoints.length - 1];
    expect(first?.x).toBe(0.5);
    expect(last?.x).toBe(START_MAP.cols - 0.5);
  });

  it('lehnt diagonale Pfadsegmente ab', () => {
    expect(() => createMap(5, 5, [{ x: 0, y: 0 }, { x: 2, y: 2 }])).toThrow();
  });
});
