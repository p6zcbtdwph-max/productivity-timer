import type { StatusOnHit } from '../systems/StatsSystem';

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  /** Zellen pro Sekunde. */
  speed: number;
  damage: number;
  sourceTowerId: number;
  /** 0 = Einzelziel. */
  splashRadius: number;
  shieldBreaker: number;
  /** Kritischer Treffer (zählt für die Roboter-Anpassung als 'krit'). */
  crit?: boolean;
  onHit: StatusOnHit;
  color: string;
}
