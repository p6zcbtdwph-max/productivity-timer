import type { TowerId } from '../data/towers';
import type { Enemy } from './entities/Enemy';
import type { Tower } from './entities/Tower';

/** Alle Ereignisse, die die Spiellogik nach außen meldet. */
export interface GameEvents extends Record<string, unknown> {
  towerBuilt: { tower: Tower };
  towerEvolved: { tower: Tower; from: TowerId; to: TowerId };
  towerLevelUp: { tower: Tower };
  enemyKilled: { enemy: Enemy; byTowerId: number; reward: number };
  enemyRevived: { enemy: Enemy };
  enemyLeaked: { enemy: Enemy };
  waveStarted: { wave: number; tier: number };
  waveCleared: { wave: number; bonus: number };
  gameOver: { wave: number };
}
