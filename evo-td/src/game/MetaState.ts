/**
 * Permanenter Zustand über alle Runs hinweg (Globaler Shop). Eigener
 * Speicherstand, getrennt vom Run-Zustand.
 */
import type { MetaUpgradeId } from '../data/meta';
import type { TowerId } from '../data/towers';

export interface MetaState {
  dna: number;
  totalDnaEarned: number;
  bestWave: number;
  runs: number;
  /** Freigeschaltete Arten (nur Tier >= UNLOCK_FROM_TIER wird eingetragen). */
  unlockedTowers: TowerId[];
  upgrades: Record<MetaUpgradeId, number>;
  /** Spieler-Schalter für Auto-Fusion (nur wirksam, wenn freigeschaltet). */
  autoFusionEnabled: boolean;
}

export function createInitialMeta(): MetaState {
  return {
    dna: 0,
    totalDnaEarned: 0,
    bestWave: 0,
    runs: 0,
    unlockedTowers: [],
    upgrades: {
      startGold: 0,
      startLives: 0,
      towerCost: 0,
      evolutionBase: 0,
      damage: 0,
      fireRate: 0,
      inheritance: 0,
      itemLuck: 0,
      itemSlots: 0,
      relocate: 0,
      dnaGain: 0,
      autoFusion: 0,
    },
    autoFusionEnabled: false,
  };
}
