import type { Item, ItemQuality } from '../data/items';
import type { TowerId } from '../data/towers';
import type { ModifierKind } from '../data/upgrades';
import type { Enemy } from './entities/Enemy';
import type { Tower } from './entities/Tower';

/** Alle Ereignisse, die die Spiellogik nach außen meldet. */
export interface GameEvents extends Record<string, unknown> {
  towerBuilt: { tower: Tower };
  towerEvolved: { tower: Tower; from: TowerId; to: TowerId };
  towerLevelUp: { tower: Tower };
  towerFused: { tower: Tower; consumedId: number };
  towerRelocated: { tower: Tower; fromSlot: number; toSlot: number };
  upgradeBought: { kind: ModifierKind; level: number };
  itemObtained: { item: Item; boughtQuality: ItemQuality };
  enemyKilled: { enemy: Enemy; byTowerId: number; reward: number };
  enemyRevived: { enemy: Enemy };
  enemyLeaked: { enemy: Enemy };
  waveStarted: { wave: number; tier: number };
  waveCleared: { wave: number; bonus: number };
  gameOver: { wave: number };
}
