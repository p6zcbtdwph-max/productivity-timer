/**
 * Globale Upgrades (wirken auf ALLE Türme) und Item-Kategorien teilen sich
 * dieselben Wirkungsarten. Gold kann nie in einzelne Türme fließen, nur
 * hierhin, in Items, in neue Türme und ins Verlegen.
 */
export type ModifierKind =
  | 'damage' //      Schaden
  | 'fireRate' //    Angriffsgeschwindigkeit
  | 'range' //       Reichweite
  | 'evolution' //   Evolutionschance (absolut, z.B. +0.5 %)
  | 'secondary' //   Stärke aller geerbten/benachbarten Boni
  | 'passive'; //    Passiv: Gold- und XP-Gewinn

export interface UpgradeDef {
  id: ModifierKind;
  name: string;
  description: string;
  /** Wirkung pro Stufe (Prozent bzw. absolute Chance bei 'evolution'). */
  perLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const UPGRADE_DEFS: Readonly<Record<ModifierKind, UpgradeDef>> = {
  damage: {
    id: 'damage',
    name: 'Schaden',
    description: 'Alle Türme verursachen mehr Schaden.',
    perLevel: 0.05,
    baseCost: 60,
    costGrowth: 1.5,
  },
  fireRate: {
    id: 'fireRate',
    name: 'Angriffsgeschwindigkeit',
    description: 'Alle Türme schießen schneller.',
    perLevel: 0.04,
    baseCost: 60,
    costGrowth: 1.5,
  },
  range: {
    id: 'range',
    name: 'Reichweite',
    description: 'Alle Türme sehen weiter.',
    perLevel: 0.03,
    baseCost: 80,
    costGrowth: 1.55,
  },
  evolution: {
    id: 'evolution',
    name: 'Evolutionschance',
    description: 'Jeder Evolutionswurf gelingt häufiger.',
    perLevel: 0.001,
    baseCost: 100,
    costGrowth: 1.6,
  },
  secondary: {
    id: 'secondary',
    name: 'Sekundäre Effekte',
    description: 'Geerbte Boni (Vorfahren, Geschwister, Nachbarn) werden stärker.',
    perLevel: 0.05,
    baseCost: 90,
    costGrowth: 1.55,
  },
  passive: {
    id: 'passive',
    name: 'Passiv',
    description: 'Mehr Gold und XP aus jedem Abschuss.',
    perLevel: 0.05,
    baseCost: 70,
    costGrowth: 1.5,
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADE_DEFS) as ModifierKind[];

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round(def.baseCost * def.costGrowth ** level);
}
