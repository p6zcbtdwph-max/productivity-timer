/**
 * Permanenter Zustand über alle Runs hinweg (Globaler Shop). Eigener
 * Speicherstand, getrennt vom Run-Zustand.
 */
import { META_UPGRADE_IDS, type MetaUpgradeId } from '../data/meta';
import type { CompendiumRecord } from '../data/compendium';
import type { TowerId } from '../data/towers';
import type { GardenUpgradeId, TreeId } from '../data/garden';
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
  /** Letzter Zeitpunkt (ms), an dem das Spiel sichtbar lief; Grundlage der Winterruhe. */
  lastSeen: number;
  passive: PassiveState;
  /** Rekorde je Art (Kompendium). */
  compendium: Record<TowerId, CompendiumRecord>;
  garden: GardenState;
}

export interface GardenPot {
  tree: TreeId | null;
  level: number;
  /** Stunden Fortschritt zum nächsten Level. */
  growth: number;
}

export interface GardenState {
  pots: GardenPot[];
  /** Gefundene, noch nicht gepflanzte Samen. */
  seeds: Partial<Record<TreeId, number>>;
  /** Harz (Währung), ganzzahlig ausgezahlt. */
  resin: number;
  resinFraction: number;
  resinEarned: number;
  seedsFound: number;
  /** Pflege-Stufen (für Harz gekauft). */
  upgrades: Partial<Record<GardenUpgradeId, number>>;
}

export function createGarden(): GardenState {
  return {
    pots: [{ tree: null, level: 0, growth: 0 }],
    seeds: {},
    resin: 0,
    resinFraction: 0,
    resinEarned: 0,
    seedsFound: 0,
    upgrades: {},
  };
}

/** Ein Tier aus der Evolutionskammer: entweder in einer Kammer oder in einem Revier. */
export interface PassiveAnimal {
  id: number;
  defId: TowerId;
  /** Kammer-Index oder null. */
  chamber: number | null;
  /** Karten-ID des Reviers oder null. */
  mapId: string | null;
  evolutionLocked: boolean;
}

export interface PassiveState {
  /** Letzter Abrechnungszeitpunkt (ms). */
  lastTick: number;
  rngState: number;
  nextAnimalId: number;
  animalsBought: number;
  chambersUnlocked: number;
  animals: PassiveAnimal[];
  /** Angesammelte Bruchteile passiver DNA (ausgezahlt wird ganzzahlig). */
  dnaFraction: number;
  dnaEarned: number;
}

export function createInitialMeta(): MetaState {
  return {
    dna: 0,
    totalDnaEarned: 0,
    bestWaveByMap: {},
    runs: 0,
    unlockedTowers: [],
    upgrades: Object.fromEntries(META_UPGRADE_IDS.map((id) => [id, 0])) as Record<MetaUpgradeId, number>,
    autoFusionEnabled: false,
    autoUpgrades: { damage: false, fireRate: false, range: false, evolution: false, secondary: false, passive: false },
    autoArtifacts: {},
    lastSeen: Date.now(),
    passive: {
      lastTick: Date.now(),
      rngState: (Date.now() ^ 0x5bd1e995) >>> 0,
      nextAnimalId: 1,
      animalsBought: 0,
      chambersUnlocked: 0,
      animals: [],
      dnaFraction: 0,
      dnaEarned: 0,
    },
    compendium: {},
    garden: createGarden(),
  };
}

/**
 * Ergänzt fehlende Felder eines geladenen Stands (neue Features ohne
 * Versionssprung, damit bestehende Spielstände erhalten bleiben).
 */
export function normalizeMeta(loaded: Partial<MetaState> | undefined): MetaState {
  const fresh = createInitialMeta();
  if (!loaded) return fresh;
  return {
    ...fresh,
    ...loaded,
    upgrades: { ...fresh.upgrades, ...loaded.upgrades },
    autoUpgrades: { ...fresh.autoUpgrades, ...loaded.autoUpgrades },
    passive: { ...fresh.passive, ...loaded.passive },
    compendium: { ...loaded.compendium },
    garden: normalizeGarden({ ...fresh.garden, ...loaded.garden }),
  };
}

function normalizeGarden(garden: GardenState): GardenState {
  return {
    ...garden,
    pots: garden.pots.length > 0 ? garden.pots : [{ tree: null, level: 0, growth: 0 }],
    upgrades: { ...garden.upgrades },
  };
}

/** Höchste Bestwelle über alle Karten. */
export function overallBestWave(meta: MetaState): number {
  return Math.max(0, ...Object.values(meta.bestWaveByMap));
}
