import type { ElementId } from '../../data/elements';
import type { EnemyId } from '../../data/enemies';

export type StatusEffect =
  | { kind: 'slow'; amount: number; remaining: number }
  | { kind: 'poison'; dps: number; remaining: number }
  | { kind: 'antiHeal'; percent: number; remaining: number };

export interface Enemy {
  id: number;
  defId: EnemyId;
  element: ElementId | null;
  hp: number;
  maxHp: number;
  /** Energieschild (Element Plasma); wird vor den HP abgebaut. */
  shield: number;
  shieldMax: number;
  /** Zusätzliche Leben (Element Titan). */
  extraLives: number;
  /** Grundgeschwindigkeit in Zellen/s (vor Statuseffekten). */
  speed: number;
  /** Gold bei Kill (inkl. Element-Multiplikator). */
  reward: number;
  /** Welcher Weg der Karte (fehlt in alten Spielständen = 0). */
  pathIndex?: number;
  /** Index des nächsten Wegpunkts. */
  waypointIndex: number;
  x: number;
  y: number;
  statuses: StatusEffect[];
  /** Faktor auf Selbstheilung (Kompendium-Anti-Heilung); fehlt in alten Spielständen. */
  healMultiplier?: number;
  /** Für Targeting "first": wie weit auf dem Pfad (in Zellen). */
  distanceTravelled: number;
}
