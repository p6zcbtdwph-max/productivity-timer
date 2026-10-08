/**
 * Nest: Eierfunde nach Wellen (nur aktiv) und die Nest-Pflege, die man mit
 * Eiern kauft. Kammern und Ausbrüten stehen im PassiveSystem.
 */
import { NEST, NEST_UPGRADE_DEFS, nestUpgradeCost, type NestUpgradeId } from '../../data/nest';
import type { GameContext } from '../GameContext';
import type { MetaState } from '../MetaState';

export function nestUpgradeLevel(meta: MetaState, id: NestUpgradeId): number {
  return meta.nest.upgrades[id] ?? 0;
}

/** Preis der nächsten Stufe (undefined = Höchststufe erreicht). */
export function nestUpgradePrice(meta: MetaState, id: NestUpgradeId): number | undefined {
  const def = NEST_UPGRADE_DEFS[id];
  const level = nestUpgradeLevel(meta, id);
  if (level >= def.maxLevel) return undefined;
  return nestUpgradeCost(def, level);
}

export function buyNestUpgrade(meta: MetaState, id: NestUpgradeId): boolean {
  const price = nestUpgradePrice(meta, id);
  if (price === undefined || meta.eggs < price) return false;
  meta.eggs -= price;
  meta.nest.upgrades[id] = nestUpgradeLevel(meta, id) + 1;
  return true;
}

export interface NestUpgradeValues {
  chamberSpeedMult: number;
  territoryEggMult: number;
  eggChanceMult: number;
  offlineHours: number;
}

export function nestUpgradeValues(meta: MetaState): NestUpgradeValues {
  const v = (id: NestUpgradeId): number => NEST_UPGRADE_DEFS[id].perLevel * nestUpgradeLevel(meta, id);
  return {
    chamberSpeedMult: 1 + v('nistmaterial'),
    territoryEggMult: 1 + v('wildwechsel'),
    eggChanceMult: 1 + v('brutpflege'),
    offlineHours: v('laubdecke'),
  };
}

export function eggChance(meta: MetaState, wave: number, boss: boolean): number {
  if (wave < NEST.fromWave) return 0;
  return Math.min(1, (boss ? NEST.bossEggChance : NEST.eggChance) * nestUpgradeValues(meta).eggChanceMult);
}

/** Nach einer geschafften Welle: vielleicht ein Ei finden. Nie in der Winterruhe. */
export function maybeDropEgg(ctx: GameContext, wave: number, boss: boolean): boolean {
  if (ctx.offline || !ctx.rng.chance(eggChance(ctx.meta, wave, boss))) return false;
  ctx.meta.eggs++;
  ctx.meta.eggsFound++;
  ctx.bus.emit('eggFound', { wave });
  return true;
}
