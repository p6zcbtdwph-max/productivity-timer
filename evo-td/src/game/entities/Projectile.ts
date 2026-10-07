import type { AttackDef, StatusEffectDef } from '../../data/towers';

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  /** Zellen pro Sekunde. */
  speed: number;
  damage: number;
  sourceTowerId: number;
  attack: AttackDef;
  onHit: readonly StatusEffectDef[];
  color: string;
}
