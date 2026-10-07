/**
 * Rechnet aus Art, Stammbaum, Nachbarn, Prestige, Level und globalen
 * Modifikatoren die effektiven Kampfwerte eines Turms.
 *
 * Boni einer Art bleiben bei der Evolution erhalten:
 *   - eigener Bonus:                   volle Stärke
 *   - Boni aller Vorfahren:            halbe Stärke
 *   - Boni der Geschwister:            viertel Stärke   (die "umliegenden" Eigenschaften im Baum)
 *   - eigene Boni angrenzender Türme:  viertel Stärke   (die "umliegenden" Türme auf dem Feld)
 * Das Upgrade/Item "Sekundäre Effekte" verstärkt alles außer dem eigenen Bonus.
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
import type { GameContext } from '../GameContext';
import { levelMultiplier } from './LevelSystem';
import { globalModifiers, NO_MODIFIERS, type GlobalModifiers } from './ModifierSystem';

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

/** Umfeld eines Turms, das seine Werte beeinflusst. */
export interface StatsEnvironment {
  /** Arten der direkt angrenzenden Türme. */
  neighbours: readonly TowerId[];
  modifiers: GlobalModifiers;
}

export const EMPTY_ENVIRONMENT: StatsEnvironment = { neighbours: [], modifiers: NO_MODIFIERS };

const treeCache = new Map<TowerId, readonly ResolvedBonus[]>();

/** Boni aus dem Stammbaum (eigen, Vorfahren, Geschwister); gecacht. */
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

/** Alle Boni inkl. Nachbarn, fertig skaliert (sekundäre durch Modifikator verstärkt). */
export function resolveBonuses(id: TowerId, env: StatsEnvironment = EMPTY_ENVIRONMENT): ResolvedBonus[] {
  const secondaryMult = 1 + env.modifiers.secondary;
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

/** Umfeld eines Turms aus dem aktuellen Spielzustand. */
export function environmentFor(ctx: GameContext, tower: Pick<Tower, 'id' | 'slot'>): StatsEnvironment {
  return { neighbours: neighbourDefIds(ctx, tower), modifiers: globalModifiers(ctx.state) };
}

/** Bequemer Einstieg für Systeme: Werte eines Turms im Spielkontext. */
export function statsFor(ctx: GameContext, tower: Tower): EffectiveStats {
  return computeStats(tower, environmentFor(ctx, tower));
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

  let damagePct = m.damage + p.damagePerLevel * tower.prestige;
  let fireRatePct = m.fireRate + p.fireRatePerLevel * tower.prestige;
  let rangePct = m.range + p.rangePerLevel * tower.prestige;
  let critChance = 0;
  let critMultiplier = 1;
  let extraTargets = 0;
  let splashRadius = 0;
  let shieldBreaker = 0;
  let goldPct = m.passive;
  let xpPct = m.passive;
  let poisonPct = 0;
  let poisonDuration = 0;
  let slowAmount = 0;
  let slowDuration = 0;
  let antiHealPct = 0;
  let antiHealDuration = 0;

  for (const { bonus } of resolveBonuses(tower.defId, env)) {
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
