import type { TowerId } from '../../data/towers';

export interface Tower {
  id: number;
  defId: TowerId;
  /** Index in `map.buildSlots`. */
  slot: number;
  x: number;
  y: number;
  level: number;
  /** Prestige-Stufe durch Fusion (0 = nie fusioniert). */
  prestige: number;
  xp: number;
  /** Sekunden bis zum nächsten Schuss. */
  cooldown: number;
  /** Sekunden bis zum nächsten Evolutionswurf. */
  evolutionTimer: number;
  /** Spieler hat die Evolution dieses Turms angehalten. */
  evolutionLocked: boolean;
  kills: number;
  damageDealt: number;
}
