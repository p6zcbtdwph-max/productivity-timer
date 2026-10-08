/**
 * Mehrfachkauf für alle Shops (×1, ×10, ×100, Max). Ein Shop beschreibt nur
 * Stufe, Höchststufe und Preisformel; der Rest ist hier gleich für alle.
 */
import type { BuyAmount } from '../MetaState';

export const BUY_AMOUNTS: readonly BuyAmount[] = [1, 10, 100, 'max'];

export interface BulkPlan {
  /** Wie viele Stufen gekauft würden (0 = nichts möglich). */
  count: number;
  total: number;
  /** Reicht das Geld für den ganzen Plan? */
  affordable: boolean;
}

/**
 * Plant einen Kauf ab `level`. Bei einer festen Menge zählt der volle Preis
 * (gekappt an der Höchststufe); bei 'max' so viele, wie das Geld hergibt.
 */
export function planBulk(amount: BuyAmount, level: number, maxLevel: number, cost: (level: number) => number, budget: number): BulkPlan {
  const room = Math.max(0, maxLevel - level);
  if (amount === 'max') {
    let count = 0;
    let total = 0;
    while (count < room && count < 10_000) {
      const next = cost(level + count);
      if (total + next > budget) break;
      total += next;
      count++;
    }
    // Nichts leistbar: den Preis der nächsten Stufe zeigen.
    if (count === 0 && room > 0) return { count: 1, total: cost(level), affordable: false };
    return { count, total, affordable: count > 0 };
  }
  const count = Math.min(amount, room);
  let total = 0;
  for (let i = 0; i < count; i++) total += cost(level + i);
  return { count, total, affordable: count > 0 && total <= budget };
}

/** Führt `buyOne` bis zu `count`-mal aus; gibt die Zahl erfolgreicher Käufe zurück. */
export function repeatBuy(count: number, buyOne: () => boolean): number {
  let bought = 0;
  while (bought < count && buyOne()) bought++;
  return bought;
}

export function amountLabel(amount: BuyAmount): string {
  return amount === 'max' ? 'Max' : `×${amount}`;
}

/** Plant und kauft in einem Schritt; gibt die Zahl gekaufter Stufen zurück (0 = nicht leistbar). */
export function executeBulk(
  amount: BuyAmount,
  level: number,
  maxLevel: number,
  cost: (level: number) => number,
  budget: number,
  buyOne: () => boolean,
): number {
  const plan = planBulk(amount, level, maxLevel, cost, budget);
  return plan.affordable ? repeatBuy(plan.count, buyOne) : 0;
}
