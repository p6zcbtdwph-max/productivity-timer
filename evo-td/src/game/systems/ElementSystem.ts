/** Tickt die laufenden Wirkungen von Gegner-Elementen (z.B. Nanobot-Heilung). */
import { getElementDef } from '../../data/elements';
import type { GameContext } from '../GameContext';

export function updateElements(ctx: GameContext, dt: number): void {
  for (const enemy of ctx.state.enemies) {
    if (!enemy.element) continue;
    getElementDef(enemy.element).update?.(enemy, dt);
  }
}
