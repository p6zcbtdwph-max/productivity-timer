/**
 * Permanenter Zustand über alle Runs hinweg (Globaler Shop). Eigener
 * Speicherstand, getrennt vom Run-Zustand.
 */
import type { MetaUpgradeId } from '../data/meta';
import type { TowerId } from '../data/towers';
import type { ModifierKind } from '../data/upgrades';

export interface MetaState {
  dna: number;
  totalDnaEarned: number;
  /** Bestwelle je Karte (Karten-ID → Welle). Grundlage für DNA und Erfolge. */
  bestWaveByMap: Record<string, number>;
  runs: number;
  /** Freigeschaltete Arten (nur Tier >= UNLOCK_FROM_TIER wird eingetragen). */
  unlockedTowers: TowerId[];
  /** Artefakt-Stufen; 0 = noch nicht freigeschaltet. */
  upgrades: Record<MetaUpgradeId, number>;
  /** Spieler-Schalter für Auto-Fusion (nur wirksam, wenn freigeschaltet). */
  autoFusionEnabled: boolean;
  /** Auto-Kauf je Run-Upgrade (wirksam ab Artefakt "Instinkt"). */
  autoUpgrades: Record<ModifierKind, boolean>;
  /** Auto-Kauf je Artefakt am Run-Ende (wirksam ab Artefakt "Gedächtnis"). */
  autoArtifacts: Partial<Record<MetaUpgradeId, boolean>>;
}

export function createInitialMeta(): MetaState {
  return {
    dna: 0,
    totalDnaEarned: 0,
    bestWaveByMap: {},
    runs: 0,
    unlockedTowers: [],
    upgrades: {
      startGold: 0,
      evolutionBase: 0,
      damage: 0,
      startLives: 0,
      autoUpgrades: 0,
      fireRate: 0,
      inheritance: 0,
      towerCost: 0,
      autoFusion: 0,
      itemLuck: 0,
      dnaGain: 0,
      autoArtifacts: 0,
      relocate: 0,
      itemSlots: 0,
    },
    autoFusionEnabled: false,
    autoUpgrades: { damage: false, fireRate: false, range: false, evolution: false, secondary: false, passive: false },
    autoArtifacts: {},
  };
}

/** Höchste Bestwelle über alle Karten. */
export function overallBestWave(meta: MetaState): number {
  return Math.max(0, ...Object.values(meta.bestWaveByMap));
}
