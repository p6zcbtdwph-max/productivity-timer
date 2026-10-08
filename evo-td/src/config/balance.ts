/**
 * Zentrale Balance-Werte. Alles, was "Zahl" ist und das Spielgefühl steuert,
 * steht hier, nicht in den Systemen.
 */
export const BALANCE = {
  /** Simulationsschritt in Sekunden. */
  stepSeconds: 1 / 60,

  map: {
    cellSize: 40,
  },

  player: {
    startGold: 60,
    startLives: 10,
    /** Leben, die ein durchgebrochener Boss kostet. */
    bossLeakLives: 3,
  },

  economy: {
    /** Kosten des ersten Einzellers; jeder weitere Turm wird teurer. */
    towerBaseCost: 20,
    towerCostGrowth: 1.25,
    /** Wellen-Abschlussbonus (wird mit 2^tier skaliert). */
    waveClearBonus: 8,
  },

  waves: {
    /** Sekunden zwischen zwei Wellenstarts (Idle: Wellen kommen von alleine). */
    interval: 18,
    /** Abstand zwischen zwei Gegnern einer Welle. */
    spawnGap: 0.7,
    baseCount: 4,
    countPerWave: 0.6,
    /** Obergrenze an Gegnern pro Welle; darüber wächst nur noch die HP. */
    maxCount: 24,
    /** Alle N Wellen verdoppeln sich Gegner-HP und -Belohnung (2er-Potenzen). */
    wavesPerTier: 5,
    bossEvery: 10,
  },

  enemies: {
    baseHp: 12,
    /** Zellen pro Sekunde. */
    baseSpeed: 1.4,
    baseReward: 4,
  },

  xp: {
    /** XP pro Schadenspunkt. */
    perDamage: 0.08,
    perKill: 6,
    /** XP für Level 2; danach * levelGrowth pro Level. */
    levelBase: 20,
    levelGrowth: 1.45,
    /** Statbonus (Schaden + Feuerrate) pro Level über 1. */
    statPerLevel: 0.07,
  },

  /** Stärke geerbter Boni relativ zum eigenen Bonus. */
  bonuses: {
    ancestorStrength: 0.5,
    siblingStrength: 0.25,
    /** Eigener Bonus direkt angrenzender Türme (8er-Nachbarschaft). */
    neighbourStrength: 0.25,
    neighbourDiagonal: true,
  },

  /** Synergie: jeder direkt angrenzende Turm derselben Art (Grund, Evolution zu stoppen). */
  synergy: {
    damagePerTwin: 0.1,
    fireRatePerTwin: 0.05,
  },

  /** Prestige durch Fusion zweier gleicher Türme. */
  prestige: {
    damagePerLevel: 0.75,
    fireRatePerLevel: 0.15,
    rangePerLevel: 0.1,
    /** Absolute Evolutionschance pro Prestige-Stufe. */
    evolutionPerLevel: 0.003,
  },

  /** Verlegen von Türmen. */
  relocate: {
    /** Alle N Wellen gibt es eine Verlegung. */
    wavesPerCharge: 5,
    /** Kosten als Anteil der aktuellen Turmkosten. */
    costFactor: 0.5,
  },

  /** Gegner-Elemente (Spezial-Eigenschaften). */
  elements: {
    /** Ab dieser Welle können Gegner Elemente tragen. */
    fromWave: 4,
    /** Wahrscheinlichkeit pro Gegner: base + perWave * Welle, gedeckelt. */
    baseChance: 0.05,
    chancePerWave: 0.015,
    maxChance: 0.5,
    /** Plasma-Schild als Anteil der Max-HP. */
    shieldFraction: 0.6,
    /** Nanobots: Heilung pro Sekunde als Anteil der Max-HP. */
    healFractionPerSecond: 0.03,
  },

  evolution: {
    /** Sekunden zwischen zwei Evolutionswürfen pro Turm. */
    checkInterval: 2,
    baseChance: 0.004,
    perLevel: 0.0015,
    /** Bonus pro weiterem Turm desselben Typs auf dem Feld. */
    perSameType: 0.002,
    /** Höchstens 5 % je Wurf (alle 2 s): im Schnitt frühestens alle ~40 s eine Evolution. */
    maxChance: 0.05,
  },

  /** Evolutionskammern, Reviere und Winterruhe (Passiv-Modus, läuft in Echtzeit). */
  passive: {
    /** Kammern, Ausbrüten und Eier: siehe data/nest.ts. */
    /** Evolutionen pro Stunde auf Tier 0; halbiert sich je Tier. */
    evolutionsPerHour: 2,
    /** Revierplätze je Karte ohne Artefakt. */
    mapSlots: 1,
    /** Offline-Obergrenze ohne Artefakt (Stunden). */
    offlineCapHours: 8,
    /** Kraft der Türme während der Winterruhe ohne Artefakt. */
    offlinePower: 0.5,
    /** Kürzere Abwesenheiten werden ohne Bericht verrechnet. */
    reportAfterSeconds: 60,
  },

  persistence: {
    autosaveSeconds: 10,
    runKey: 'evo-td-run',
    runVersion: 4,
    metaKey: 'evo-td-meta',
    metaVersion: 2,
  },
} as const;

/** Gegner-Tier (0,1,2,...) für eine Wellennummer (1-basiert). */
export function tierForWave(wave: number): number {
  return Math.floor((wave - 1) / BALANCE.waves.wavesPerTier);
}

/** 2er-Potenz-Skalierung für Gegner-HP und Belohnung. */
export function tierMultiplier(tier: number): number {
  return 2 ** tier;
}

/** Kosten für den n-ten gebauten Turm (0-basiert). */
export function towerCost(towersBuilt: number): number {
  return Math.round(BALANCE.economy.towerBaseCost * BALANCE.economy.towerCostGrowth ** towersBuilt);
}

/** XP, die ein Turm braucht, um von `level` auf `level + 1` zu kommen. */
export function xpForLevel(level: number): number {
  return Math.round(BALANCE.xp.levelBase * BALANCE.xp.levelGrowth ** (level - 1));
}
