/** XP und Level der Türme. Level erhöht Stats und die Evolutionschance. */
import { BALANCE, xpForLevel } from '../../config/balance';
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';

export function grantXp(ctx: GameContext, tower: Tower, amount: number): void {
  tower.xp += amount;
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
