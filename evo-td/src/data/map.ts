/**
 * Karten. Jede Karte hat eigene Wege, eigene Objekte und einen eigenen Modus
 * (angelehnt an Bloons TD):
 *
 *  - Urmeer:       ein S-Pfad, keine Besonderheiten (Einstieg).
 *  - Urkontinent:  der Weg teilt sich; vier Biome (Luft, Land, Erde, Wasser); Bäume,
 *                  Felsen und Riffe blockieren Plätze; Anhöhen geben Reichweite.
 *  - Roboterfabrik: zwei Eingänge laufen zusammen; die Roboter passen sich an
 *                  die Schadensart an, mit der du am meisten Schaden machst;
 *                  Schrotthaufen blockieren Plätze; Kräne geben Reichweite.
 *
 * Bauplätze sind alle Zellen, die direkt an einen Weg grenzen.
 * Koordinaten sind Zellenkoordinaten; der Renderer multipliziert mit cellSize.
 */
import type { Vec2 } from '../core/Vec2';

export type Biome = 'luft' | 'land' | 'erde' | 'wasser';

/** Erfolgsbonus einer Karte: alle `every` Bestwellen +`perMilestone` (immer derselbe Typ pro Karte). */
export interface MapAchievementDef {
  kind: 'damage' | 'fireRate' | 'dna';
  every: number;
  perMilestone: number;
}

export type ObstacleKind = 'baum' | 'fels' | 'riff' | 'schrott';

export interface ObstacleDef {
  slot: number;
  kind: ObstacleKind;
}

/** Roboter-Anpassung (Modus der Roboterfabrik). */
export interface AdaptiveDef {
  /** Alle N Wellen passen sich die Roboter an. */
  every: number;
  /** Zusätzliche Resistenz je Anpassung. */
  step: number;
  /** Höchste Resistenz je Schadensart. */
  max: number;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  achievement: MapAchievementDef;
  /** Freischaltung: Bestwelle auf einer anderen Karte (undefined = immer frei). */
  unlock?: { mapId: string; wave: number };
  cols: number;
  rows: number;
  /** Ein oder mehrere Wege (Eckpunkte, Zellenmitte = +0.5). Gegner verteilen sich abwechselnd. */
  paths: readonly (readonly Vec2[])[];
  /** Alle Wegzellen (für Rendering & Bauplatz-Berechnung). */
  pathCells: ReadonlySet<string>;
  /** Bauplätze in Zellenkoordinaten. */
  buildSlots: readonly Vec2[];
  /** Biom je Bauplatz (null = kein Biom). */
  slotBiome: readonly (Biome | null)[];
  /** Hindernisse auf Bauplätzen (im Run für Gold räumbar). */
  obstacles: readonly ObstacleDef[];
  /** Bauplätze mit erhöhter Lage (+Reichweite). */
  highGround: ReadonlySet<number>;
  /** Kartenmodus: Roboter passen sich an. */
  adaptive?: AdaptiveDef;
  /** Farbton des Hintergrunds. */
  tint: string;
}

export const cellKey = (x: number, y: number): string => `${x},${y}`;

/** Zellen entlang eines achsenparallelen Pfades zwischen den Eckpunkten. */
function tracePath(corners: readonly Vec2[], into: Set<string>): void {
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i] as Vec2;
    const b = corners[i + 1] as Vec2;
    if (a.x !== b.x && a.y !== b.y) {
      throw new Error(`Pfadsegment ${i} ist nicht achsenparallel`);
    }
    const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    for (let s = 0; s <= steps; s++) into.add(cellKey(a.x + dx * s, a.y + dy * s));
  }
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

export interface MapSpec {
  id: string;
  name: string;
  description: string;
  achievement: MapAchievementDef;
  unlock?: { mapId: string; wave: number };
  cols: number;
  rows: number;
  paths: readonly (readonly Vec2[])[];
  biomes?: readonly { biome: Biome; x0: number; y0: number; x1: number; y1: number }[];
  obstacles?: readonly { x: number; y: number; kind: ObstacleKind }[];
  highGround?: readonly Vec2[];
  adaptive?: AdaptiveDef;
  tint?: string;
}

export function createMap(spec: MapSpec): MapDef {
  const pathCells = new Set<string>();
  for (const path of spec.paths) tracePath(path, pathCells);
  const buildSlots = computeBuildSlots(spec.cols, spec.rows, pathCells);
  const slotIndex = (x: number, y: number, what: string): number => {
    const index = buildSlots.findIndex((s) => s.x === x && s.y === y);
    if (index < 0) throw new Error(`${spec.id}: ${what} bei ${x},${y} liegt auf keinem Bauplatz`);
    return index;
  };
  const slotBiome = buildSlots.map((slot) => {
    const zone = spec.biomes?.find((b) => slot.x >= b.x0 && slot.x <= b.x1 && slot.y >= b.y0 && slot.y <= b.y1);
    return zone ? zone.biome : null;
  });
  const obstacles = (spec.obstacles ?? []).map((o) => ({ slot: slotIndex(o.x, o.y, 'Hindernis'), kind: o.kind }));
  const highGround = new Set((spec.highGround ?? []).map((h) => slotIndex(h.x, h.y, 'Anhöhe')));
  for (const o of obstacles) {
    if (highGround.has(o.slot)) throw new Error(`${spec.id}: Hindernis und Anhöhe auf demselben Platz`);
  }
  const map: MapDef = {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    achievement: spec.achievement,
    cols: spec.cols,
    rows: spec.rows,
    paths: spec.paths.map((path) => path.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }))),
    pathCells,
    buildSlots,
    slotBiome,
    obstacles,
    highGround,
    tint: spec.tint ?? '#101418',
  };
  if (spec.unlock) map.unlock = spec.unlock;
  if (spec.adaptive) map.adaptive = spec.adaptive;
  return map;
}

/** Startkarte: 20 × 12 Zellen, S-Kurve von links nach rechts. */
export const START_MAP: MapDef = createMap({
  id: 'urmeer',
  name: 'Urmeer',
  description: 'Ein einziger, gewundener Weg. Hier beginnt alles.',
  achievement: { kind: 'damage', every: 50, perMilestone: 0.1 },
  cols: 20,
  rows: 12,
  paths: [
    [
      { x: 0, y: 2 },
      { x: 16, y: 2 },
      { x: 16, y: 6 },
      { x: 3, y: 6 },
      { x: 3, y: 9 },
      { x: 19, y: 9 },
    ],
  ],
});

/** Urkontinent: der Weg teilt sich in eine Luft- und eine Wasserroute. */
export const CONTINENT_MAP: MapDef = createMap({
  id: 'urkontinent',
  name: 'Urkontinent',
  description: 'Der Weg teilt sich über Gebirge und Küste. Arten in ihrem Heimat-Biom (Luft, Land, Erde, Wasser) schlagen härter zu. Bäume, Felsen und Riffe lassen sich räumen, Anhöhen geben Reichweite.',
  achievement: { kind: 'fireRate', every: 50, perMilestone: 0.05 },
  unlock: { mapId: 'urmeer', wave: 60 },
  cols: 20,
  rows: 12,
  paths: [
    [
      { x: 0, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 1 },
      { x: 15, y: 1 },
      { x: 15, y: 5 },
      { x: 19, y: 5 },
    ],
    [
      { x: 0, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 10 },
      { x: 15, y: 10 },
      { x: 15, y: 5 },
      { x: 19, y: 5 },
    ],
  ],
  biomes: [
    { biome: 'luft', x0: 0, y0: 0, x1: 19, y1: 3 },
    { biome: 'land', x0: 0, y0: 4, x1: 9, y1: 7 },
    { biome: 'erde', x0: 10, y0: 4, x1: 19, y1: 7 },
    { biome: 'wasser', x0: 0, y0: 8, x1: 19, y1: 11 },
  ],
  obstacles: [
    { x: 8, y: 0, kind: 'fels' },
    { x: 11, y: 2, kind: 'fels' },
    { x: 5, y: 6, kind: 'baum' },
    { x: 14, y: 4, kind: 'baum' },
    { x: 14, y: 6, kind: 'baum' },
    { x: 8, y: 11, kind: 'riff' },
    { x: 11, y: 9, kind: 'riff' },
  ],
  highGround: [
    { x: 2, y: 4 },
    { x: 17, y: 4 },
    { x: 6, y: 2 },
    { x: 13, y: 9 },
  ],
  tint: '#0f1712',
});

/** Roboterfabrik: zwei Eingänge, die Roboter passen sich an. */
export const FACTORY_MAP: MapDef = createMap({
  id: 'fabrik',
  name: 'Roboterfabrik',
  description: 'Zwei Fließbänder laufen zusammen. Alle 25 Wellen werden die Roboter resistent gegen die Schadensart, mit der du am meisten Schaden machst. Schrott blockiert Plätze, Kräne geben Reichweite.',
  achievement: { kind: 'dna', every: 50, perMilestone: 0.1 },
  unlock: { mapId: 'urkontinent', wave: 60 },
  cols: 20,
  rows: 12,
  paths: [
    [
      { x: 0, y: 1 },
      { x: 8, y: 1 },
      { x: 8, y: 6 },
      { x: 12, y: 6 },
      { x: 12, y: 2 },
      { x: 17, y: 2 },
      { x: 17, y: 9 },
      { x: 19, y: 9 },
    ],
    [
      { x: 0, y: 10 },
      { x: 8, y: 10 },
      { x: 8, y: 6 },
      { x: 12, y: 6 },
      { x: 12, y: 2 },
      { x: 17, y: 2 },
      { x: 17, y: 9 },
      { x: 19, y: 9 },
    ],
  ],
  obstacles: [
    { x: 4, y: 0, kind: 'schrott' },
    { x: 4, y: 2, kind: 'schrott' },
    { x: 4, y: 9, kind: 'schrott' },
    { x: 4, y: 11, kind: 'schrott' },
    { x: 10, y: 5, kind: 'schrott' },
    { x: 10, y: 7, kind: 'schrott' },
    { x: 16, y: 5, kind: 'schrott' },
  ],
  highGround: [
    { x: 7, y: 4 },
    { x: 13, y: 4 },
    { x: 18, y: 8 },
  ],
  adaptive: { every: 25, step: 0.2, max: 0.8 },
  tint: '#16131a',
});

/** Alle Karten in Freischalt-Reihenfolge. */
export const MAPS: readonly MapDef[] = [START_MAP, CONTINENT_MAP, FACTORY_MAP];

export function getMap(id: string | undefined): MapDef {
  return MAPS.find((m) => m.id === id) ?? START_MAP;
}

const lengthCache = new WeakMap<MapDef, number[]>();

/** Länge eines Weges in Zellen. */
export function pathLength(map: MapDef, index: number): number {
  let lengths = lengthCache.get(map);
  if (!lengths) {
    lengths = map.paths.map((path) => {
      let sum = 0;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1] as Vec2;
        const b = path[i] as Vec2;
        sum += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      }
      return sum;
    });
    lengthCache.set(map, lengths);
  }
  return lengths[index] ?? lengths[0] ?? 1;
}
