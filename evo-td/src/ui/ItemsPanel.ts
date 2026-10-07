/** Inventar: Items ausrüsten/ablegen. */
import { metaValues } from '../game/systems/MetaSystem';
import { describeItem, QUALITY_DEFS, QUALITY_ORDER } from '../data/items';
import type { Game } from '../game/Game';
import { $, el } from './dom';

export class ItemsPanel {
  private readonly root = $('#items-panel');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  render(): void {
    const { state } = this.game;
    const key = `${state.items.map((i) => i.id).join(',')}|${state.equippedItemIds.join(',')}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const list = el('ul', { className: 'shop-list' });
    const sorted = [...state.items].sort(
      (a, b) => QUALITY_ORDER.indexOf(b.quality) - QUALITY_ORDER.indexOf(a.quality) || a.category.localeCompare(b.category),
    );
    for (const item of sorted) {
      const equipped = state.equippedItemIds.includes(item.id);
      const full = !equipped && state.equippedItemIds.length >= metaValues(this.game.meta).itemSlots;
      const button = el('button', { className: equipped ? 'btn small active' : 'btn small', disabled: full }, [
        equipped ? 'Ablegen' : 'Ausrüsten',
      ]);
      button.addEventListener('click', () => {
        this.game.toggleEquip(item.id);
        this.lastKey = '';
      });
      list.append(
        el('li', {}, [
          el('span', {}, [
            el('span', { className: 'swatch', style: `background:${QUALITY_DEFS[item.quality].color}` }),
            ` ${describeItem(item)}`,
          ]),
          button,
        ]),
      );
    }

    this.root.replaceChildren(
      el('h2', {}, [`Items (${state.equippedItemIds.length}/${metaValues(this.game.meta).itemSlots} ausgerüstet)`]),
      state.items.length === 0
        ? el('p', { className: 'muted' }, ['Noch keine Items. Im Shop kaufen.'])
        : list,
    );
  }
}
