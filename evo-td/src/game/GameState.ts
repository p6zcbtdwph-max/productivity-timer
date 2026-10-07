/**
 * Der komplette Spielzustand als reines Datenobjekt (kein Verhalten).
 * Systeme lesen und verändern ihn; der SaveManager serialisiert ihn 1:1.
 */
import { BALANCE } from '../config/balance';
import type { Item } from '../data/items';
import type { TowerId } from '../data/towers';
import type { ModifierKind } from '../data/upgrades';
import type { Enemy } from './entities/Enemy';
import type { SpawnOrder } from './systems/WaveSystem';
import type { Projectile } from './entities/Projectile';
import type { Tower } from './entities/Tower';

export interface WaveState {
  /** Aktuelle Wellennummer (1-basiert); 0 = noch keine Welle gestartet. */
  current: number;
  /** Sekunden bis zum nächsten Wellenstart. */
  countdown: number;
  /** Noch zu spawnende Gegner der laufenden Welle. */
  spawnQueue: SpawnOrder[];
  /** Sekunden bis zum nächsten Spawn. */
  spawnTimer: number;
  /** Lebende Gegner, die noch zur aktuellen Welle gehören (für den Bonus). */
  aliveFromCurrent: number;
}

/** Schadensarten, an die sich Roboter anpassen können (Roboterfabrik). */
export type DamageCategory = 'direkt' | 'flaeche' | 'gift' | 'krit';
export const DAMAGE_CATEGORIES: readonly DamageCategory[] = ['direkt', 'flaeche', 'gift', 'krit'];

export interface AdaptationState {
  /** Resistenz je Schadensart (0..max). */
  resist: Record<DamageCategory, number>;
  /** Schaden je Art seit der letzten Anpassung. */
  tally: Record<DamageCategory, number>;
  /** Bereits durchgeführte Anpassungen (fehlt in alten Ständen = 0). */
  stage?: number;
}

export function createAdaptation(): AdaptationState {
  return {
    resist: { direkt: 0, flaeche: 0, gift: 0, krit: 0 },
    tally: { direkt: 0, flaeche: 0, gift: 0, krit: 0 },
    stage: 0,
  };
}

export interface GameState {
  /** Karte dieses Runs (fehlt in alten Spielständen = Urmeer). */
  mapId?: string;
  /** Geräumte Hindernisse (Bauplatz-Indizes). */
  clearedObstacles?: number[];
  /** Roboter-Anpassung (nur auf Karten mit Anpassungs-Modus). */
  adaptation?: AdaptationState;
  seed: number;
  rngState: number;
  /** Simulierte Spielzeit in Sekunden. */
  time: number;
  gold: number;
  lives: number;
  towersBuilt: number;
  nextEntityId: number;
  /** Bestwelle dieser Karte zu Run-Beginn. */
  bestWaveAtStart: number;
  /** Sekunden bis zum nächsten Auto-Upgrade-Kauf. */
  autoUpgradeTimer: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  wave: WaveState;
  /** Bereits gesehene Turmtypen (für die Stammbaum-Ansicht). */
  discovered: TowerId[];
  /** Idle-Komfort: automatisch Einzeller bauen, sobald Gold reicht. */
  autoBuild: boolean;
  /** Stufen der globalen Upgrades. */
  upgrades: Record<ModifierKind, number>;
  /** Alle besessenen Items. */
  items: Item[];
  /** Ausgerüstete Items (IDs aus `items`), begrenzt durch shop.itemSlots. */
  equippedItemIds: number[];
  /** Anzahl bisher gekaufter Items (Preissteigerung). */
  itemPurchases: number;
  /** Verbrauchte Verlegungen (verfügbar = floor(welle / wavesPerCharge) - verbraucht). */
  relocatesUsed: number;
  gameOver: boolean;
  stats: {
    kills: number;
    evolutions: number;
    fusions: number;
    goldEarned: number;
  };
}

export function createInitialState(
  seed: number,
  start: { gold: number; lives: number } = { gold: BALANCE.player.startGold, lives: BALANCE.player.startLives },
  mapId = 'urmeer',
): GameState {
  return {
    mapId,
    clearedObstacles: [],
    adaptation: createAdaptation(),
    seed,
    rngState: seed,
    time: 0,
    gold: start.gold,
    lives: start.lives,
    towersBuilt: 0,
    nextEntityId: 1,
    bestWaveAtStart: 0,
    autoUpgradeTimer: 1,
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
    upgrades: { damage: 0, fireRate: 0, range: 0, evolution: 0, secondary: 0, passive: 0 },
    items: [],
    equippedItemIds: [],
    itemPurchases: 0,
    relocatesUsed: 0,
    gameOver: false,
    stats: { kills: 0, evolutions: 0, fusions: 0, goldEarned: 0 },
  };
}

export function allocId(state: GameState): number {
  return state.nextEntityId++;
}
