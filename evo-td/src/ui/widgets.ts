/**
 * Kleine wiederverwendbare Bausteine: Unter-Reiter innerhalb eines Panels und
 * die Mengenwahl (×1/×10/×100/Max), die alle Shops teilen.
 */
import type { MetaState } from '../game/MetaState';
import { amountLabel, BUY_AMOUNTS, planBulk } from '../game/systems/BulkBuy';
import { el, formatNumber } from './dom';

/** Unter-Reiter eines Panels. Merkt sich die Auswahl pro Browser. */
export class SubTabs<T extends string> {
  active: T;

  constructor(
    private readonly id: string,
    private readonly tabs: readonly (readonly [T, string])[],
    private readonly onChange: () => void,
  ) {
    this.active = tabs[0]?.[0] as T;
    try {
      const stored = localStorage.getItem(`evo-td-sub-${id}`);
      if (stored && tabs.some(([key]) => key === stored)) this.active = stored as T;
    } catch {
      /* ignorieren */
    }
  }

  show(key: T): void {
    this.active = key;
    try {
      localStorage.setItem(`evo-td-sub-${this.id}`, key);
    } catch {
      /* ignorieren */
    }
    this.onChange();
  }

  /** Baut die Reiterleiste neu (Panels rendern sich komplett neu). */
  element(labels: Partial<Record<T, string>> = {}): HTMLElement {
    return el(
      'nav',
      { className: 'subtabs' },
      this.tabs.map(([key, label]) => {
        const b = el('button', { className: key === this.active ? 'subtab active' : 'subtab' }, [labels[key] ?? label]);
        b.dataset['sub'] = key;
        b.addEventListener('click', () => this.show(key));
        return b;
      }),
    );
  }
}

/** Mengenwahl für Mehrfachkäufe; der Wert gilt für alle Shops. */
export function buyAmountBar(meta: MetaState, onChange: () => void): HTMLElement {
  return el('div', { className: 'amount-bar' }, [
    el('span', { className: 'muted small' }, ['Kaufen: ']),
    ...BUY_AMOUNTS.map((amount) => {
      const b = el('button', { className: amount === meta.buyAmount ? 'subtab active' : 'subtab' }, [amountLabel(amount)]);
      b.dataset['amount'] = String(amount);
      b.addEventListener('click', () => {
        meta.buyAmount = amount;
        onChange();
      });
      return b;
    }),
  ]);
}

/**
 * Kauf-Knopf für eine Stufen-Verbesserung nach der Mengenwahl.
 * Gibt "max" zurück, wenn die Höchststufe erreicht ist.
 */
export function bulkButton(options: {
  meta: MetaState;
  level: number;
  maxLevel: number;
  cost: (level: number) => number;
  budget: number;
  currency: string;
  onBuy: () => void;
}): HTMLElement {
  const { meta, level, maxLevel, cost, budget, currency, onBuy } = options;
  if (level >= maxLevel) return el('span', { className: 'muted small' }, ['max']);
  const plan = planBulk(meta.buyAmount, level, maxLevel, cost, budget);
  const label = plan.count > 1 || meta.buyAmount !== 1 ? `+${plan.count}: ${formatNumber(plan.total)} ${currency}` : `${formatNumber(plan.total)} ${currency}`;
  const button = el('button', { className: 'btn small', disabled: !plan.affordable }, [label]);
  button.addEventListener('click', onBuy);
  return button;
}

/** Stufenanzeige: "Stufe 12" bei unendlichen, "12/15" bei begrenzten. */
export function levelLabel(level: number, maxLevel: number): string {
  return Number.isFinite(maxLevel) ? `${level}/${maxLevel}` : `Stufe ${level}`;
}

/** Prozent mit sinnvoller Genauigkeit auch für sehr kleine Chancen. */
export function pct(value: number): string {
  const p = value * 100;
  const digits = p < 0.1 ? 2 : p < 1 ? 1 : 0;
  return `${p.toFixed(digits).replace('.', ',')} %`;
}
