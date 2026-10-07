/** Shop: globale Upgrades und Item-Kauf nach Qualitätsstufe. */
import { QUALITY_DEFS, QUALITY_ORDER } from '../data/items';
import { UPGRADE_DEFS, UPGRADE_IDS } from '../data/upgrades';
import type { Game } from '../game/Game';
import { itemPrice, upgradePrice } from '../game/systems/ShopSystem';
import { metaValues } from '../game/systems/MetaSystem';
import { $, el, formatNumber } from './dom';

export class ShopPanel {
  private readonly root = $('#shop-panel');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  render(): void {
    const { state } = this.game;
    const ctx = this.game.ctx;
    const auto = metaValues(this.game.meta).autoUpgrades;
    const key = `${Math.floor(state.gold)}|${UPGRADE_IDS.map((k) => state.upgrades[k]).join(',')}|${state.itemPurchases}|${state.wave.current}|${auto}|${JSON.stringify(this.game.meta.autoUpgrades)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const upgrades = el('ul', { className: 'shop-list' });
    for (const kind of UPGRADE_IDS) {
      const def = UPGRADE_DEFS[kind];
      const level = state.upgrades[kind];
      const price = upgradePrice(ctx, kind);
      const button = el('button', { className: 'btn small', disabled: state.gold < price }, [`${formatNumber(price)} 💰`]);
      button.addEventListener('click', () => {
        this.game.buyUpgrade(kind);
        this.lastKey = '';
      });
      const value = kind === 'evolution' ? `+${(def.perLevel * level * 100).toFixed(1)} %` : `+${Math.round(def.perLevel * level * 100)} %`;
      const row: (Node | string)[] = [
        el('span', {}, [`${def.name} `, el('span', { className: 'muted' }, [`Stufe ${level} (${value})`])]),
        button,
        el('span', { className: 'desc' }, [def.description]),
      ];
      if (auto) {
        const box = el('input', { type: 'checkbox', checked: this.game.meta.autoUpgrades[kind] });
        box.addEventListener('change', () => {
          this.game.meta.autoUpgrades[kind] = box.checked;
          this.lastKey = '';
        });
        row.push(el('label', { className: 'toggle desc' }, [box, ' Auto-Kauf']));
      }
      upgrades.append(el('li', {}, row));
    }

    const items = el('ul', { className: 'shop-list' });
    for (const quality of QUALITY_ORDER) {
      const def = QUALITY_DEFS[quality];
      const price = itemPrice(ctx, quality);
      if (price === undefined) continue;
      const button = el('button', { className: 'btn small', disabled: state.gold < price }, [`${formatNumber(price)} 💰`]);
      button.addEventListener('click', () => {
        this.game.buyItem(quality);
        this.lastKey = '';
      });
      items.append(
        el('li', {}, [
          el('span', { className: 'quality', style: `color:${def.color}` }, [`${def.name}-Item`]),
          button,
          el('span', { className: 'desc' }, [
            `Zufällige Kategorie, Wirkung ×${def.power}. Chance auf Aufwertung: ${Math.round(def.upgradeChance * 100)} %.`,
          ]),
        ]),
      );
    }

    this.root.replaceChildren(
      el('h2', {}, ['Upgrades für alle Türme']),
      el('p', { className: 'muted small' }, [
        'Gold fließt nie in einzelne Türme. Upgrades wirken auf jeden Turm, jetzt und später.',
        auto ? ' Auto-Kauf kauft jede Sekunde das billigste gewählte Upgrade und hält bei Auto-Bau Gold für den nächsten Turm zurück.' : ' Auto-Kauf schaltet das Artefakt "Instinkt" frei.',
      ]),
      upgrades,
      el('h2', { style: 'margin-top:14px' }, ['Items kaufen']),
      el('p', { className: 'muted small' }, [
        `Jeder Kauf kann mit Glück eine höhere Stufe liefern (verkettet). Legendär gibt es nur so. Preise steigen mit Gegner-Tier und Kaufanzahl. ${metaValues(this.game.meta).itemSlots} Items gleichzeitig ausrüstbar.`,
      ]),
      items,
    );
  }
}
