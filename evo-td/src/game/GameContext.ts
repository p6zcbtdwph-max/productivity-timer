import type { EventBus } from '../core/EventBus';
import type { Rng } from '../core/Rng';
import type { MapDef } from '../data/map';
import type { GameEvents } from './events';
import type { GameState } from './GameState';
import type { MetaState } from './MetaState';

/** Alles, was ein System braucht, um einen Schritt zu rechnen. */
export interface GameContext {
  state: GameState;
  /** Permanenter Zustand (Globaler Shop); wird gelesen, nie von Run-Systemen verändert. */
  meta: MetaState;
  map: MapDef;
  rng: Rng;
  bus: EventBus<GameEvents>;
}
