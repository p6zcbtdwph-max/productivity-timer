/**
 * Prestige durch Fusion: zwei Türme derselben Art und Prestige-Stufe
 * verschmelzen zu einem Turm mit Prestige + 1. Der Zielturm bleibt auf seinem
 * Platz, der andere Platz wird frei. Kostet kein Gold.
 */
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';

export function canFuse(a: Tower, b: Tower): boolean {
  return a.id !== b.id && a.defId === b.defId && a.prestige === b.prestige;
}

/** Türme, mit denen `tower` fusionieren könnte. */
export function fusionCandidates(ctx: GameContext, tower: Tower): Tower[] {
  return ctx.state.towers.filter((other) => canFuse(tower, other));
}

/** Verschmilzt `consumed` in `target`. Gibt false zurück, wenn nicht erlaubt. */
export function fuseTowers(ctx: GameContext, target: Tower, consumed: Tower): boolean {
  if (ctx.state.gameOver || !canFuse(target, consumed)) return false;
  const index = ctx.state.towers.indexOf(consumed);
  if (index < 0) return false;
  ctx.state.towers.splice(index, 1);

  target.prestige++;
  if (consumed.level > target.level || (consumed.level === target.level && consumed.xp > target.xp)) {
    target.level = consumed.level;
    target.xp = consumed.xp;
  }
  target.kills += consumed.kills;
  target.damageDealt += consumed.damageDealt;
  target.cooldown = 0;
  ctx.state.stats.fusions++;
  ctx.bus.emit('towerFused', { tower: target, consumedId: consumed.id });
  return true;
}
