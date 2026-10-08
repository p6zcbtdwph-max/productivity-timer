import type { Item } from '../data/items';
import type { TowerId } from '../data/towers';
import type { TreeId } from '../data/garden';
import type { ObstacleKind } from '../data/map';
import type { DamageCategory } from './GameState';
import type { ModifierKind } from '../data/upgrades';
import type { DnaReport } from './systems/MetaSystem';
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
  enemyKilled: { enemy: Enemy; byTowerId: number; reward: number };
  enemyRevived: { enemy: Enemy };
  enemyLeaked: { enemy: Enemy };
  waveStarted: { wave: number; tier: number };
  waveCleared: { wave: number; bonus: number };
  gameOver: { wave: number };
  autoUpgraded: { kinds: ModifierKind[]; mode: 'gefahr' | 'ruhig' };
  speciesUnlocked: { id: TowerId; by: TowerId };
  seedFound: { tree: TreeId; wave: number };
  itemFound: { item: Item; wave: number };
  eggFound: { wave: number };
  obstacleCleared: { slot: number; kind: ObstacleKind; cost: number };
  robotsAdapted: { category: DamageCategory; resist: number };
  runEnded: { report: DnaReport };
}
