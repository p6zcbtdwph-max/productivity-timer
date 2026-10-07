/**
 * Rechnet aus Art, Stammbaum, Nachbarn, Prestige, Level, Ausrüstung und
 * Meta-Upgrades die effektiven Kampfwerte eines Turms.
 *
 * Verrechnung in Töpfen (bewusst unterschiedlich, damit Quellen sich nicht
 * alle gleich anfühlen):
 *
 *   Schaden = Basis(Tier, Archetyp)
 *           × (1 + Σ Art-Boni %)          Topf "Art":        eigener, Vorfahren-, Geschwister-, Nachbar-Boni (additiv)
 *           × (1 + Σ Ausrüstung %)        Topf "Ausrüstung": Upgrades im Run + Items (additiv)
 *           × Π Mutations-Faktoren         reine Multiplikatoren (z.B. Titan ×1.25, stapeln multiplikativ)
 *           × (1 + 0.10 · gleiche Nachbarn) Synergie: angrenzende Türme derselben Art
 *           × (1 + 0.75 · Prestige)        Prestige
 *           × (1 + 0.07 · (Level − 1))     Level
 *           × Meta-Faktor                  Artefakte (Globaler Shop)
 *           × Erfolgs-Faktor               Karten-Erfolge (alle 50 Bestwellen)
 *           × (1 + Kompendium)             Rekorde aller je gezüchteten Arten
 *           × Gelände                      Heimat-Biom ×1.3 (Schaden), Anhöhe ×1.2 (Reichweite)
 *
 *   Feuerrate und Reichweite folgen demselben Muster (ohne Mutations-Faktoren).
 *   Krit-Chance: additiv, gedeckelt. Krit-Multiplikator: additiv.
 *   Gold/XP: (1 + Art) × (1 + Ausrüstung).
 *
 * Boni einer Art bleiben bei der Evolution erhalten:
 *   eigener 100 %, Vorfahren 50 %, Geschwister 25 %, angrenzende Türme 25 %
 *   (sekundäre Stärke wird durch "Sekundäre Effekte" und "Erbgut" angehoben).
 */
import { BALANCE } from '../../config/balance';
import { scaleBonus, type BonusDef } from '../../data/bonuses';
import { baseStatsFor, getTowerDef, lineageOf, siblingsOf, type Targeting, type TowerId } from '../../data/towers';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { levelMultiplier } from './LevelSystem';
import { BIOME_BONUS, hasGlobalRange, speciesBiome } from '../../data/biomes';
import { metaValues, type MetaValues } from './MetaSystem';
import { globalModifiers, NO_MODIFIERS, type GlobalModifiers } from './ModifierSystem';
import { createInitialMeta } from '../MetaState';

export type BonusSource = 'eigen' | 'vorfahre' | 'geschwister' | 'nachbar';

export interface ResolvedBonus {
  from: TowerId;
  source: BonusSource;
  strength: number;
  /** Bereits auf `strength` skaliert. */
  bonus: BonusDef;
}

export interface StatusOnHit {
  slow?: { amount: number; duration: number };
  poison?: { dps: number; duration: number };
  antiHeal?: { percent: number; duration: number };
}

/** Aufschlüsselung eines Werts in seine Faktoren (für die UI). */
export interface Breakdown {
  base: number;
  art: number;
  ausruestung: number;
  mutation: number;
  synergie: number;
  prestige: number;
  level: number;
  meta: number;
  erfolge: number;
  kompendium: number;
  gelaende: number;
  result: number;
}

export interface EffectiveStats {
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed: number;
  critChance: number;
  critMultiplier: number;
  targets: number;
  splashRadius: number;
  shieldBreaker: number;
  goldMultiplier: number;
  xpMultiplier: number;
  onHit: StatusOnHit;
  targeting: Targeting;
  breakdown: { damage: Breakdown; fireRate: Breakdown; range: Breakdown };
}

/** Umfeld eines Turms, das seine Werte beeinflusst. */
export interface StatsEnvironment {
  neighbours: readonly TowerId[];
  modifiers: GlobalModifiers;
  meta: MetaValues;
  /** Gelände des Bauplatzes (Biom-Treffer, Anhöhe). */
  terrain?: { biomeMatch: boolean; highGround: boolean };
}

export const EMPTY_ENVIRONMENT: StatsEnvironment = {
  neighbours: [],
  modifiers: NO_MODIFIERS,
  meta: metaValues(createInitialMeta()),
};

const treeCache = new Map<TowerId, readonly ResolvedBonus[]>();

/** Boni aus dem Stammbaum (eigen, Vorfahren, Geschwister), unskaliert; gecacht. */
export function resolveTreeBonuses(id: TowerId): readonly ResolvedBonus[] {
  const cached = treeCache.get(id);
  if (cached) return cached;
  const s = BALANCE.bonuses;
  const result: ResolvedBonus[] = [{ from: id, source: 'eigen', strength: 1, bonus: getTowerDef(id).bonus }];
  for (const ancestor of lineageOf(id).slice(0, -1)) {
    result.push({ from: ancestor, source: 'vorfahre', strength: s.ancestorStrength, bonus: getTowerDef(ancestor).bonus });
  }
  for (const sibling of siblingsOf(id)) {
    result.push({ from: sibling, source: 'geschwister', strength: s.siblingStrength, bonus: getTowerDef(sibling).bonus });
  }
  treeCache.set(id, result);
  return result;
}

/** Alle Boni inkl. Nachbarn, fertig skaliert. */
export function resolveBonuses(id: TowerId, env: StatsEnvironment = EMPTY_ENVIRONMENT): ResolvedBonus[] {
  const secondaryMult = 1 + env.modifiers.secondary + env.meta.inheritance;
  const result: ResolvedBonus[] = [];
  for (const entry of resolveTreeBonuses(id)) {
    const strength = entry.source === 'eigen' ? 1 : entry.strength * secondaryMult;
    result.push({ ...entry, strength, bonus: scaleBonus(entry.bonus, strength) });
  }
  for (const neighbour of env.neighbours) {
    const strength = BALANCE.bonuses.neighbourStrength * secondaryMult;
    result.push({ from: neighbour, source: 'nachbar', strength, bonus: scaleBonus(getTowerDef(neighbour).bonus, strength) });
  }
  return result;
}

/** Arten der direkt angrenzenden Türme (Bauplätze in 4er- oder 8er-Nachbarschaft). */
export function neighbourDefIds(ctx: GameContext, tower: Pick<Tower, 'id' | 'slot'>): TowerId[] {
  const cell = ctx.map.buildSlots[tower.slot];
  if (!cell) return [];
  const result: TowerId[] = [];
  for (const other of ctx.state.towers) {
    if (other.id === tower.id) continue;
    const otherCell = ctx.map.buildSlots[other.slot];
    if (!otherCell) continue;
    const dx = Math.abs(otherCell.x - cell.x);
    const dy = Math.abs(otherCell.y - cell.y);
    const adjacent = BALANCE.bonuses.neighbourDiagonal ? Math.max(dx, dy) === 1 : dx + dy === 1;
    if (adjacent) result.push(other.defId);
  }
  return result;
}

export function environmentFor(ctx: GameContext, tower: Pick<Tower, 'id' | 'slot' | 'defId'>): StatsEnvironment {
  const slotBiome = ctx.map.slotBiome[tower.slot] ?? null;
  return {
    neighbours: neighbourDefIds(ctx, tower),
    modifiers: globalModifiers(ctx.state),
    meta: metaValues(ctx.meta),
    terrain: {
      biomeMatch: slotBiome !== null && slotBiome === speciesBiome(tower.defId),
      highGround: ctx.map.highGround.has(tower.slot),
    },
  };
}

export function statsFor(ctx: GameContext, tower: Tower): EffectiveStats {
  const cached = ctx.statsCache?.get(tower.id);
  if (cached) return cached;
  const stats = computeStats(tower, environmentFor(ctx, tower));
  if (ctx.power !== undefined && ctx.power !== 1) {
    stats.damage *= ctx.power;
    if (stats.onHit.poison) stats.onHit.poison = { ...stats.onHit.poison, dps: stats.onHit.poison.dps * ctx.power };
  }
  ctx.statsCache?.set(tower.id, stats);
  return stats;
}

function breakdown(parts: Omit<Breakdown, 'result'>): Breakdown {
  const { base, art, ausruestung, mutation, synergie, prestige, level, meta, erfolge, kompendium, gelaende } = parts;
  return { ...parts, result: base * art * ausruestung * mutation * synergie * prestige * level * meta * erfolge * kompendium * gelaende };
}

/** Anzahl direkt angrenzender Türme derselben Art. */
export function twinCount(defId: TowerId, env: StatsEnvironment): number {
  return env.neighbours.reduce((n, id) => n + (id === defId ? 1 : 0), 0);
}

export function computeStats(
  tower: Pick<Tower, 'defId' | 'level' | 'prestige'>,
  env: StatsEnvironment = EMPTY_ENVIRONMENT,
): EffectiveStats {
  const def = getTowerDef(tower.defId);
  const base = baseStatsFor(def.tier, def.archetype);
  const level = levelMultiplier(tower.level);
  const p = BALANCE.prestige;
  const m = env.modifiers;

  // Topf "Art" (additiv)
  let artDamage = 0;
  let artFireRate = 0;
  let artRange = 0;
  let artGold = 0;
  let artXp = 0;
  // reine Multiplikatoren
  let mutationDamage = 1;
  // Sonstiges
  let critChance = 0;
  let critMultiplier = 1;
  let critBonus = 0;
  let extraTargets = 0;
  let splashRadius = 0;
  let shieldBreaker = 0;
  let poisonPct = 0;
  let poisonDuration = 0;
  let slowAmount = 0;
  let slowDuration = 0;
  let antiHealPct = 0;
  let antiHealDuration = 0;

  for (const { bonus } of resolveBonuses(tower.defId, env)) {
    switch (bonus.kind) {
      case 'damage':
        artDamage += bonus.percent;
        break;
      case 'damageMult':
        mutationDamage *= bonus.factor;
        break;
      case 'fireRate':
        artFireRate += bonus.percent;
        break;
      case 'range':
        artRange += bonus.percent;
        break;
      case 'crit':
        critChance += bonus.chance;
        critMultiplier = Math.max(critMultiplier, bonus.multiplier);
        break;
      case 'critDamage':
        critBonus += bonus.bonus;
        break;
      case 'multi':
        extraTargets += bonus.extraTargets;
        break;
      case 'splash':
        splashRadius = Math.max(splashRadius, bonus.radius);
        break;
      case 'slow':
        slowAmount = Math.max(slowAmount, bonus.amount);
        slowDuration = Math.max(slowDuration, bonus.duration);
        break;
      case 'poison':
        poisonPct += bonus.percentOfDamage;
        poisonDuration = Math.max(poisonDuration, bonus.duration);
        break;
      case 'gold':
        artGold += bonus.percent;
        break;
      case 'xp':
        artXp += bonus.percent;
        break;
      case 'shieldBreaker':
        shieldBreaker += bonus.percent;
        break;
      case 'antiHeal':
        antiHealPct = Math.max(antiHealPct, bonus.percent);
        antiHealDuration = Math.max(antiHealDuration, bonus.duration);
        break;
    }
  }

  const comp = env.meta.compendium;
  const twins = twinCount(tower.defId, env);
  const syn = BALANCE.synergy;
  const damageB = breakdown({
    base: base.damage,
    art: 1 + artDamage,
    ausruestung: 1 + m.damage,
    mutation: mutationDamage,
    synergie: 1 + syn.damagePerTwin * twins,
    prestige: 1 + p.damagePerLevel * tower.prestige,
    level,
    meta: env.meta.damageMult,
    erfolge: env.meta.achievementDamageMult,
    kompendium: 1 + comp.damage,
    gelaende: env.terrain?.biomeMatch ? BIOME_BONUS.damage : 1,
  });
  const fireRateB = breakdown({
    base: 1 / base.cooldown,
    art: 1 + artFireRate,
    ausruestung: 1 + m.fireRate,
    mutation: 1,
    synergie: 1 + syn.fireRatePerTwin * twins,
    prestige: 1 + p.fireRatePerLevel * tower.prestige,
    level,
    meta: env.meta.fireRateMult,
    erfolge: env.meta.achievementFireRateMult,
    kompendium: 1 + comp.fireRate,
    gelaende: 1,
  });
  const rangeB = breakdown({
    base: base.range,
    art: 1 + artRange,
    ausruestung: 1 + m.range,
    mutation: 1,
    synergie: 1,
    prestige: 1 + p.rangePerLevel * tower.prestige,
    level: 1,
    meta: 1,
    erfolge: 1,
    kompendium: 1 + comp.range,
    gelaende: env.terrain?.highGround ? BIOME_BONUS.highGroundRange : 1,
  });

  const damage = damageB.result;
  const onHit: StatusOnHit = {};
  if (slowAmount > 0) onHit.slow = { amount: Math.min(0.9, slowAmount), duration: slowDuration };
  if (poisonPct > 0) onHit.poison = { dps: damage * poisonPct, duration: poisonDuration };
  if (antiHealPct > 0) onHit.antiHeal = { percent: Math.min(1, antiHealPct), duration: antiHealDuration };

  return {
    damage,
    cooldown: 1 / fireRateB.result,
    range: hasGlobalRange(tower.defId) ? Infinity : rangeB.result,
    projectileSpeed: base.projectileSpeed,
    critChance: Math.min(0.9, critChance + comp.critChance),
    critMultiplier: (critChance + comp.critChance > 0 ? Math.max(2, critMultiplier) : critMultiplier) + critBonus + comp.critDamage,
    targets: 1 + Math.round(extraTargets),
    splashRadius,
    shieldBreaker: shieldBreaker + comp.shieldBreaker,
    goldMultiplier: (1 + artGold) * (1 + m.passive) * (1 + comp.gold),
    xpMultiplier: (1 + artXp) * (1 + m.passive) * (1 + comp.xp),
    onHit,
    targeting: def.targeting,
    breakdown: { damage: damageB, fireRate: fireRateB, range: rangeB },
  };
}
