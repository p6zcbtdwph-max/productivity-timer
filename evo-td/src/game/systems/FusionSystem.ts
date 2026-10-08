/**
 * Prestige durch Fusion: zwei Türme derselben Art und Prestige-Stufe
 * verschmelzen zu einem Turm mit Prestige + 1. Der Zielturm bleibt auf seinem
 * Platz, der andere Platz wird frei. Kostet kein Gold.
 */
import type { Tower } from '../entities/Tower';
import type { GameContext } from '../GameContext';
import { metaValues } from './MetaSystem';

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
  // Items des verschmolzenen Turms wandern mit, soweit Platz ist.
  const slots = metaValues(ctx.meta).itemSlots;
  for (const item of consumed.items ?? []) {
    if ((target.items?.length ?? 0) < slots) (target.items ??= []).push(item);
  }
  target.kills += consumed.kills;
  target.damageDealt += consumed.damageDealt;
  target.cooldown = 0;
  ctx.state.stats.fusions++;
  ctx.bus.emit('towerFused', { tower: target, consumedId: consumed.id });
  return true;
}

/** Idle-Komfort (Meta-Freischaltung): fusioniert automatisch passende Paare. */
export function updateAutoFusion(ctx: GameContext): void {
  if (!ctx.meta.autoFusionEnabled || ctx.state.gameOver) return;
  const towers = ctx.state.towers;
  for (let i = 0; i < towers.length; i++) {
    const a = towers[i] as Tower;
    for (let j = i + 1; j < towers.length; j++) {
      const b = towers[j] as Tower;
      if (canFuse(a, b)) {
        fuseTowers(ctx, a, b);
        return; // höchstens eine Fusion pro Schritt
      }
    }
  }
}
