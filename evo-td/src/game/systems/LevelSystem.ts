/** XP und Level der Türme. Level erhöht Stats und die Evolutionschance. */
import { BALANCE, xpForLevel } from '../../config/balance';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { addSpeciesXp } from './CompendiumSystem';

export function grantXp(ctx: GameContext, tower: Tower, amount: number): void {
  tower.xp += amount;
  // Kompendium: XP der Art sammeln sich über alle Runs und schalten Nachfahren frei.
  for (const id of addSpeciesXp(ctx.meta, tower.defId, amount)) ctx.bus.emit('speciesUnlocked', { id, by: tower.defId });
  let needed = xpForLevel(tower.level);
  while (tower.xp >= needed) {
    tower.xp -= needed;
    tower.level++;
    ctx.bus.emit('towerLevelUp', { tower });
    needed = xpForLevel(tower.level);
  }
}

/** Multiplikator auf Schaden und Feuerrate durch das Level. */
export function levelMultiplier(level: number): number {
  return 1 + BALANCE.xp.statPerLevel * (level - 1);
}
