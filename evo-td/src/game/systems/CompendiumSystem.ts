/** Kompendium: Rekorde je Art speichern und die passiven Boni daraus ableiten. */
import {
  COMPENDIUM_EFFECT_IDS,
  COMPENDIUM_EFFECTS,
  EFFECT_BY_BONUS,
  recordPoints,
  tierWeight,
  type CompendiumEffect,
} from '../../data/compendium';
import { getTowerDef, isValidTowerId, type TowerId } from '../../data/towers';
import type { MetaState } from '../MetaState';

export type CompendiumTotals = Record<CompendiumEffect, number>;

/** Trägt einen Rekord ein; gibt true zurück, wenn er sich verbessert hat. */
export function recordSpecies(meta: MetaState, id: TowerId, level: number, prestige: number): boolean {
  const current = meta.compendium[id];
  if (!current) {
    meta.compendium[id] = { maxLevel: level, maxPrestige: prestige };
    return true;
  }
  let improved = false;
  if (level > current.maxLevel) {
    current.maxLevel = level;
    improved = true;
  }
  if (prestige > current.maxPrestige) {
    current.maxPrestige = prestige;
    improved = true;
  }
  return improved;
}

export function speciesEffect(id: TowerId): CompendiumEffect {
  return EFFECT_BY_BONUS[getTowerDef(id).bonus.kind];
}

/** Bonus einer einzelnen Art (vor Obergrenzen). */
export function speciesBonus(meta: MetaState, id: TowerId): number {
  const record = meta.compendium[id];
  if (!record) return 0;
  const effect = COMPENDIUM_EFFECTS[speciesEffect(id)];
  return effect.perPoint * recordPoints(record) * tierWeight(getTowerDef(id).tier);
}

export function compendiumTotals(meta: MetaState): CompendiumTotals {
  const totals = Object.fromEntries(COMPENDIUM_EFFECT_IDS.map((e) => [e, 0])) as CompendiumTotals;
  for (const id of Object.keys(meta.compendium)) {
    if (!isValidTowerId(id)) continue;
    totals[speciesEffect(id)] += speciesBonus(meta, id);
  }
  for (const e of COMPENDIUM_EFFECT_IDS) {
    const cap = COMPENDIUM_EFFECTS[e].cap;
    if (cap !== undefined) totals[e] = Math.min(cap, totals[e]);
  }
  return totals;
}
