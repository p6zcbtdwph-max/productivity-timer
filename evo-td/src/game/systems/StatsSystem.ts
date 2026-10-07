/**
 * Rechnet aus Art, Stammbaum und Level die effektiven Kampfwerte eines Turms.
 *
 * Boni einer Art bleiben bei der Evolution erhalten:
 *   - eigener Bonus:          volle Stärke
 *   - Boni aller Vorfahren:   halbe Stärke
 *   - Boni der Geschwister:   viertel Stärke   (die "umliegenden" Eigenschaften)
 */
import { BALANCE } from '../../config/balance';
import { scaleBonus, type BonusDef } from '../../data/bonuses';
import {
  baseStatsFor,
  getTowerDef,
  lineageOf,
  siblingsOf,
  type Targeting,
  type TowerId,
} from '../../data/towers';
import type { Tower } from '../entities/Tower';
import { levelMultiplier } from './LevelSystem';

export type BonusSource = 'eigen' | 'vorfahre' | 'geschwister';

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

export interface EffectiveStats {
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed: number;
  critChance: number;
  critMultiplier: number;
  /** Anzahl gleichzeitiger Ziele (mindestens 1). */
  targets: number;
  /** 0 = kein Flächenschaden. */
  splashRadius: number;
  shieldBreaker: number;
  goldMultiplier: number;
  xpMultiplier: number;
  onHit: StatusOnHit;
  targeting: Targeting;
}

const resolvedCache = new Map<TowerId, readonly ResolvedBonus[]>();

/** Alle Boni, die für eine Art gelten (gecacht, da rein vom Baum abhängig). */
export function resolveBonuses(id: TowerId): readonly ResolvedBonus[] {
  const cached = resolvedCache.get(id);
  if (cached) return cached;

  const s = BALANCE.bonuses;
  const result: ResolvedBonus[] = [];
  const push = (from: TowerId, source: BonusSource, strength: number): void => {
    result.push({ from, source, strength, bonus: scaleBonus(getTowerDef(from).bonus, strength) });
  };

  push(id, 'eigen', 1);
  const lineage = lineageOf(id);
  for (const ancestor of lineage.slice(0, -1)) push(ancestor, 'vorfahre', s.ancestorStrength);
  for (const sibling of siblingsOf(id)) push(sibling, 'geschwister', s.siblingStrength);

  resolvedCache.set(id, result);
  return result;
}

export function computeStats(tower: Pick<Tower, 'defId' | 'level'>): EffectiveStats {
  const def = getTowerDef(tower.defId);
  const base = baseStatsFor(def.tier, def.archetype);
  const level = levelMultiplier(tower.level);

  let damagePct = 0;
  let fireRatePct = 0;
  let rangePct = 0;
  let critChance = 0;
  let critMultiplier = 1;
  let extraTargets = 0;
  let splashRadius = 0;
  let shieldBreaker = 0;
  let goldPct = 0;
  let xpPct = 0;
  let poisonPct = 0;
  let poisonDuration = 0;
  let slowAmount = 0;
  let slowDuration = 0;
  let antiHealPct = 0;
  let antiHealDuration = 0;

  for (const { bonus } of resolveBonuses(tower.defId)) {
    switch (bonus.kind) {
      case 'damage':
        damagePct += bonus.percent;
        break;
      case 'fireRate':
        fireRatePct += bonus.percent;
        break;
      case 'range':
        rangePct += bonus.percent;
        break;
      case 'crit':
        critChance += bonus.chance;
        critMultiplier = Math.max(critMultiplier, bonus.multiplier);
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
        goldPct += bonus.percent;
        break;
      case 'xp':
        xpPct += bonus.percent;
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

  const damage = base.damage * (1 + damagePct) * level;
  const onHit: StatusOnHit = {};
  if (slowAmount > 0) onHit.slow = { amount: Math.min(0.9, slowAmount), duration: slowDuration };
  if (poisonPct > 0) onHit.poison = { dps: damage * poisonPct, duration: poisonDuration };
  if (antiHealPct > 0) onHit.antiHeal = { percent: Math.min(1, antiHealPct), duration: antiHealDuration };

  return {
    damage,
    cooldown: base.cooldown / ((1 + fireRatePct) * level),
    range: base.range * (1 + rangePct),
    projectileSpeed: base.projectileSpeed,
    critChance: Math.min(0.9, critChance),
    critMultiplier,
    targets: 1 + Math.round(extraTargets),
    splashRadius,
    shieldBreaker,
    goldMultiplier: 1 + goldPct,
    xpMultiplier: 1 + xpPct,
    onHit,
    targeting: def.targeting,
  };
}
