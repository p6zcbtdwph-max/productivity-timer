/**
 * Der komplette Spielzustand als reines Datenobjekt (kein Verhalten).
 * Systeme lesen und verändern ihn; der SaveManager serialisiert ihn 1:1.
 */
import { BALANCE } from '../config/balance';
import type { TowerId } from '../data/towers';
import type { Enemy } from './entities/Enemy';
import type { Projectile } from './entities/Projectile';
import type { Tower } from './entities/Tower';

export interface WaveState {
  /** Aktuelle Wellennummer (1-basiert); 0 = noch keine Welle gestartet. */
  current: number;
  /** Sekunden bis zum nächsten Wellenstart. */
  countdown: number;
  /** Noch zu spawnende Gegner der laufenden Welle. */
  spawnQueue: Enemy['defId'][];
  /** Sekunden bis zum nächsten Spawn. */
  spawnTimer: number;
  /** Lebende Gegner, die noch zur aktuellen Welle gehören (für den Bonus). */
  aliveFromCurrent: number;
}

export interface GameState {
  seed: number;
  rngState: number;
  /** Simulierte Spielzeit in Sekunden. */
  time: number;
  gold: number;
  lives: number;
  towersBuilt: number;
  nextEntityId: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  wave: WaveState;
  /** Bereits gesehene Turmtypen (für die Stammbaum-Ansicht). */
  discovered: TowerId[];
  /** Idle-Komfort: automatisch Einzeller bauen, sobald Gold reicht. */
  autoBuild: boolean;
  gameOver: boolean;
  stats: {
    kills: number;
    evolutions: number;
    goldEarned: number;
  };
}

export function createInitialState(seed: number): GameState {
  return {
    seed,
    rngState: seed,
    time: 0,
    gold: BALANCE.player.startGold,
    lives: BALANCE.player.startLives,
    towersBuilt: 0,
    nextEntityId: 1,
    towers: [],
    enemies: [],
    projectiles: [],
    wave: {
      current: 0,
      countdown: 8,
      spawnQueue: [],
      spawnTimer: 0,
      aliveFromCurrent: 0,
    },
    discovered: ['einzeller'],
    autoBuild: false,
    gameOver: false,
    stats: { kills: 0, evolutions: 0, goldEarned: 0 },
  };
}

export function allocId(state: GameState): number {
  return state.nextEntityId++;
}
