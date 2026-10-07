/**
 * Boni ("Eigenschaften") der Turmarten.
 *
 * Jede Art hat genau einen eigenen Bonus. Bei einer Evolution bleiben die
 * Boni der Vorfahren und der Geschwister-Arten als sekundäre Eigenschaften
 * erhalten, mit reduzierter Stärke (siehe StatsSystem). Damit sich Boni
 * stapeln lassen, werden sie hier als Daten beschrieben und erst im
 * StatsSystem zu konkreten Werten verrechnet.
 */

export type BonusDef =
  | { kind: 'damage'; percent: number }
  | { kind: 'fireRate'; percent: number }
  | { kind: 'range'; percent: number }
  | { kind: 'crit'; chance: number; multiplier: number }
  | { kind: 'multi'; extraTargets: number }
  | { kind: 'splash'; radius: number }
  /** Verlangsamt um `amount` (0.4 = 40 % langsamer) für `duration` Sekunden. */
  | { kind: 'slow'; amount: number; duration: number }
  /** Gift: pro Sekunde `percentOfDamage` des Treffer-Schadens, `duration` Sekunden. */
  | { kind: 'poison'; percentOfDamage: number; duration: number }
  | { kind: 'gold'; percent: number }
  | { kind: 'xp'; percent: number }
  /** Zusatzschaden gegen Schilde (Element Plasma). */
  | { kind: 'shieldBreaker'; percent: number }
  /** Unterdrückt Heilung (Element Nano) für `duration` Sekunden um `percent`. */
  | { kind: 'antiHeal'; percent: number; duration: number };

export type BonusKind = BonusDef['kind'];

/** Skaliert einen Bonus auf eine Stärke (1 = voll, 0.5 = halb, ...). */
export function scaleBonus(bonus: BonusDef, strength: number): BonusDef {
  switch (bonus.kind) {
    case 'damage':
    case 'fireRate':
    case 'range':
    case 'gold':
    case 'xp':
    case 'shieldBreaker':
      return { ...bonus, percent: bonus.percent * strength };
    case 'crit':
      return { ...bonus, chance: bonus.chance * strength };
    case 'multi':
      return { ...bonus, extraTargets: bonus.extraTargets * strength };
    case 'splash':
      return { ...bonus, radius: bonus.radius * strength };
    case 'slow':
      return { ...bonus, amount: bonus.amount * strength };
    case 'poison':
      return { ...bonus, percentOfDamage: bonus.percentOfDamage * strength };
    case 'antiHeal':
      return { ...bonus, percent: bonus.percent * strength };
  }
}

const pct = (n: number): string => `${Math.round(n * 100)} %`;

/** Kurze, lesbare Beschreibung für die UI. */
export function describeBonus(bonus: BonusDef): string {
  switch (bonus.kind) {
    case 'damage':
      return `+${pct(bonus.percent)} Schaden`;
    case 'fireRate':
      return `+${pct(bonus.percent)} Feuerrate`;
    case 'range':
      return `+${pct(bonus.percent)} Reichweite`;
    case 'crit':
      return `${pct(bonus.chance)} Krit (×${bonus.multiplier})`;
    case 'multi':
      return `+${bonus.extraTargets.toFixed(bonus.extraTargets % 1 ? 2 : 0)} Ziele`;
    case 'splash':
      return `Fläche r=${bonus.radius.toFixed(2)}`;
    case 'slow':
      return `Slow ${pct(bonus.amount)} für ${bonus.duration}s`;
    case 'poison':
      return `Gift ${pct(bonus.percentOfDamage)}/s für ${bonus.duration}s`;
    case 'gold':
      return `+${pct(bonus.percent)} Gold`;
    case 'xp':
      return `+${pct(bonus.percent)} XP`;
    case 'shieldBreaker':
      return `+${pct(bonus.percent)} gegen Schilde`;
    case 'antiHeal':
      return `-${pct(bonus.percent)} Heilung für ${bonus.duration}s`;
  }
}
