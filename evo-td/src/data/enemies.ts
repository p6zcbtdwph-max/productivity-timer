/**
 * Roboter-Gegner. Werte sind Multiplikatoren auf die Basiswerte in `balance.ts`;
 * die eigentliche Skalierung (2er-Potenzen pro Tier) passiert im WaveSystem.
 */
export type EnemyId = 'drohne' | 'laeufer' | 'panzer' | 'boss';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  color: string;
  /** Größe des Blocks in Zellen. */
  size: number;
  hpMult: number;
  speedMult: number;
  rewardMult: number;
}

export const ENEMY_DEFS: Readonly<Record<EnemyId, EnemyDef>> = {
  drohne: { id: 'drohne', name: 'Drohne', color: '#ff5252', size: 0.45, hpMult: 1, speedMult: 1, rewardMult: 1 },
  laeufer: { id: 'laeufer', name: 'Läufer', color: '#ff9100', size: 0.4, hpMult: 0.6, speedMult: 1.7, rewardMult: 1 },
  panzer: { id: 'panzer', name: 'Panzer', color: '#b71c1c', size: 0.6, hpMult: 3, speedMult: 0.65, rewardMult: 3 },
  boss: { id: 'boss', name: 'Boss-Einheit', color: '#d500f9', size: 0.8, hpMult: 12, speedMult: 0.55, rewardMult: 15 },
};

export function getEnemyDef(id: EnemyId): EnemyDef {
  return ENEMY_DEFS[id];
}
