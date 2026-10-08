/**
 * Kompendium: Jede Art, die man je gezüchtet hat, gibt dauerhaft einen kleinen
 * passiven Bonus. Der Typ folgt aus dem eigenen Bonus der Art, die Stärke aus
 * Rekord-Level, Rekord-Prestige und Tier.
 */
import type { BonusKind } from './bonuses';

export type CompendiumEffect =
  | 'damage'
  | 'fireRate'
  | 'range'
  | 'critChance'
  | 'critDamage'
  | 'gold'
  | 'xp'
  | 'enemySlow'
  | 'shieldBreaker'
  | 'antiHeal'
  | 'evolution';

export interface CompendiumEffectDef {
  id: CompendiumEffect;
  name: string;
  /** Wirkung je Rekord-Punkt bei Tier 0. */
  perPoint: number;
  /** Obergrenze der Summe (undefined = keine). */
  cap?: number;
  /** Anzeige: "+12 % Schaden" */
  format: (value: number) => string;
}

const pct = (v: number, digits = 1): string => `${(v * 100).toFixed(digits)} %`;

export const COMPENDIUM_EFFECTS: Readonly<Record<CompendiumEffect, CompendiumEffectDef>> = {
  damage: { id: 'damage', name: 'Schaden', perPoint: 0.0005, format: (v) => `+${pct(v)} Schaden` },
  fireRate: { id: 'fireRate', name: 'Feuerrate', perPoint: 0.0004, format: (v) => `+${pct(v)} Feuerrate` },
  range: { id: 'range', name: 'Reichweite', perPoint: 0.0002, cap: 0.5, format: (v) => `+${pct(v)} Reichweite` },
  critChance: { id: 'critChance', name: 'Krit-Chance', perPoint: 0.0001, cap: 0.25, format: (v) => `+${pct(v, 2)} Krit-Chance` },
  critDamage: { id: 'critDamage', name: 'Krit-Schaden', perPoint: 0.002, format: (v) => `+${v.toFixed(2)}× Krit-Schaden` },
  gold: { id: 'gold', name: 'Gold', perPoint: 0.0005, format: (v) => `+${pct(v)} Gold` },
  xp: { id: 'xp', name: 'XP', perPoint: 0.0005, format: (v) => `+${pct(v)} XP` },
  enemySlow: { id: 'enemySlow', name: 'Roboter langsamer', perPoint: 0.0001, cap: 0.3, format: (v) => `-${pct(v)} Robotertempo` },
  shieldBreaker: { id: 'shieldBreaker', name: 'Schildbrecher', perPoint: 0.001, format: (v) => `+${pct(v)} gegen Schilde` },
  antiHeal: { id: 'antiHeal', name: 'Anti-Heilung', perPoint: 0.0003, cap: 0.6, format: (v) => `-${pct(v)} Nanobot-Heilung` },
  /** Nur aus dem Garten (Farn): absolute Evolutionschance. */
  evolution: { id: 'evolution', name: 'Evolutionschance', perPoint: 0, cap: 0.1, format: (v) => `+${pct(v, 2)} Evolutionschance` },
};

export const COMPENDIUM_EFFECT_IDS = Object.keys(COMPENDIUM_EFFECTS) as CompendiumEffect[];

/** Welcher Kompendium-Effekt zu welchem Art-Bonus gehört. */
export const EFFECT_BY_BONUS: Readonly<Record<BonusKind, CompendiumEffect>> = {
  damage: 'damage',
  damageMult: 'damage',
  poison: 'damage',
  splash: 'damage',
  fireRate: 'fireRate',
  range: 'range',
  crit: 'critChance',
  critDamage: 'critDamage',
  multi: 'gold',
  gold: 'gold',
  xp: 'xp',
  slow: 'enemySlow',
  shieldBreaker: 'shieldBreaker',
  antiHeal: 'antiHeal',
};

/** Rekord einer Art. */
export interface CompendiumRecord {
  maxLevel: number;
  maxPrestige: number;
  /** Gesammelte XP dieser Art über alle Runs (schaltet Nachfahren frei). Fehlt in alten Ständen. */
  xp?: number;
}

/** Ein Prestige zählt so viel wie diese Anzahl Level. */
export const POINTS_PER_PRESTIGE = 25;

export function recordPoints(record: CompendiumRecord): number {
  return record.maxLevel + POINTS_PER_PRESTIGE * record.maxPrestige;
}

/** Höhere Arten geben mehr: ×(1 + 0,5 · Tier). */
export function tierWeight(tier: number): number {
  return 1 + 0.5 * tier;
}
