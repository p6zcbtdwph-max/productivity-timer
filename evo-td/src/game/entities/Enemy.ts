import type { EnemyId } from '../../data/enemies';
import type { TraitId } from '../../data/traits';

export type StatusEffect =
  | { kind: 'slow'; factor: number; remaining: number }
  | { kind: 'poison'; dps: number; remaining: number };

export interface Enemy {
  id: number;
  defId: EnemyId;
  hp: number;
  maxHp: number;
  /** Grundgeschwindigkeit in Zellen/s (vor Statuseffekten). */
  speed: number;
  /** Gold bei Kill. */
  reward: number;
  /** Index des nächsten Wegpunkts. */
  waypointIndex: number;
  x: number;
  y: number;
  statuses: StatusEffect[];
  traits: TraitId[];
  /** Für Targeting "first": wie weit auf dem Pfad (in Zellen). */
  distanceTravelled: number;
}
