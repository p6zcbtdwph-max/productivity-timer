/**
 * Eier: Währung des Passiv-Modus. Man findet sie (sehr selten) nach aktiv
 * geschafften Wellen, brütet sie in Evolutionskammern aus, und Tiere in
 * Revieren legen neue Eier. Mit Eiern kauft man Kammern und Nest-Pflege.
 */
export const NEST = {
  /** Fundchance nach einer geschafften Welle (ab `fromWave`), bei Bosswellen höher. So selten wie Samen. */
  eggChance: 0.003,
  bossEggChance: 0.03,
  fromWave: 5,
  /** Startausstattung: ein Ei und eine Kammer. */
  starterEggs: 1,
  startChambers: 1,
  /** Ausbrüten: erster Einzeller kostet so viele Eier, jeder weitere das `hatchGrowth`-fache. */
  hatchBaseCost: 1,
  hatchGrowth: 1.35,
  /** Zweite Kammer kostet so viele Eier, jede weitere das `chamberGrowth`-fache. */
  chamberBaseCost: 5,
  chamberGrowth: 3,
  maxChambers: 8,
  /** Eier pro Stunde eines Tier-0-Tiers im Revier; ×2 je Tier, ×(1 + Bestwelle/50). */
  eggsPerHour: 0.05,
} as const;

export type NestUpgradeId = 'nistmaterial' | 'wildwechsel' | 'brutpflege' | 'laubdecke';

export interface NestUpgradeDef {
  id: NestUpgradeId;
  name: string;
  description: string;
  perLevel: number;
  /** Infinity = skaliert unendlich. */
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const NEST_UPGRADES: readonly NestUpgradeDef[] = [
  { id: 'nistmaterial', name: 'Nistmaterial', description: 'Evolutionskammern +10 % schneller je Stufe.', perLevel: 0.1, maxLevel: Infinity, baseCost: 3, costGrowth: 1.5 },
  { id: 'wildwechsel', name: 'Wildwechsel', description: '+10 % Eier aus Revieren je Stufe.', perLevel: 0.1, maxLevel: Infinity, baseCost: 3, costGrowth: 1.5 },
  { id: 'brutpflege', name: 'Brutpflege', description: '+10 % Chance, nach Wellen Eier zu finden, je Stufe.', perLevel: 0.1, maxLevel: Infinity, baseCost: 5, costGrowth: 1.6 },
  { id: 'laubdecke', name: 'Laubdecke', description: '+1 Stunde Offline-Obergrenze je Stufe.', perLevel: 1, maxLevel: 8, baseCost: 8, costGrowth: 2 },
];

export const NEST_UPGRADE_DEFS: Readonly<Record<NestUpgradeId, NestUpgradeDef>> = Object.fromEntries(
  NEST_UPGRADES.map((u) => [u.id, u]),
) as Record<NestUpgradeId, NestUpgradeDef>;

export function nestUpgradeCost(def: NestUpgradeDef, level: number): number {
  return Math.round(def.baseCost * def.costGrowth ** level);
}
