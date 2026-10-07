/**
 * Einfache Startkarte: ein S-förmiger Pfad auf einem Raster.
 * Bauplätze sind alle Zellen, die direkt an den Pfad grenzen.
 * Koordinaten sind Zellenkoordinaten; der Renderer multipliziert mit cellSize.
 */
import type { Vec2 } from '../core/Vec2';

export interface MapDef {
  cols: number;
  rows: number;
  /** Eckpunkte des Pfades (Zellenmitte = +0.5). */
  waypoints: readonly Vec2[];
  /** Alle Pfadzellen (für Rendering & Bauplatz-Berechnung). */
  pathCells: ReadonlySet<string>;
  /** Bauplätze in Zellenkoordinaten. */
  buildSlots: readonly Vec2[];
}

export const cellKey = (x: number, y: number): string => `${x},${y}`;

/** Zellen entlang eines achsenparallelen Pfades zwischen den Eckpunkten. */
function tracePath(corners: readonly Vec2[]): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i] as Vec2;
    const b = corners[i + 1] as Vec2;
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Pfadsegment ${i} ist nicht achsenparallel`);
    }
    const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    for (let s = 0; s <= steps; s++) {
      cells.add(cellKey(a.x + dx * s, a.y + dy * s));
    }
  }
  return cells;
}

function computeBuildSlots(cols: number, rows: number, pathCells: ReadonlySet<string>): Vec2[] {
  const slots: Vec2[] = [];
  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (pathCells.has(cellKey(x, y))) continue;
      const touchesPath = neighbours.some(([dx, dy]) => pathCells.has(cellKey(x + dx, y + dy)));
      if (touchesPath) slots.push({ x, y });
    }
  }
  return slots;
}

export function createMap(cols: number, rows: number, corners: readonly Vec2[]): MapDef {
  const pathCells = tracePath(corners);
  return {
    cols,
    rows,
    waypoints: corners.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 })),
    pathCells,
    buildSlots: computeBuildSlots(cols, rows, pathCells),
  };
}

/** Startkarte: 20 x 12 Zellen, S-Kurve von links nach rechts. */
export const START_MAP: MapDef = createMap(20, 12, [
  { x: 0, y: 2 },
  { x: 16, y: 2 },
  { x: 16, y: 6 },
  { x: 3, y: 6 },
  { x: 3, y: 9 },
  { x: 19, y: 9 },
]);
