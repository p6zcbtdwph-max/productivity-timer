/** Shop: Run-Upgrades für alle Türme und der Auto-Kauf. Items kauft man direkt am Turm. */
import { UPGRADE_DEFS, UPGRADE_IDS } from '../data/upgrades';
import type { Game } from '../game/Game';
import { autoMode, AUTO_WEIGHTS } from '../game/systems/AutoSystem';
import { metaValues } from '../game/systems/MetaSystem';
import { upgradePrice } from '../game/systems/ShopSystem';
import { $, el, formatNumber } from './dom';

export class ShopPanel {
  private readonly root = $('#shop-panel');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  render(): void {
    const { state, meta } = this.game;
    const ctx = this.game.ctx;
    const unlocked = metaValues(meta).autoUpgrades;
    const mode = autoMode(ctx);
    const key = `${Math.floor(state.gold)}|${UPGRADE_IDS.map((k) => state.upgrades[k]).join(',')}|${unlocked}|${meta.autoUpgradeEnabled}|${mode}`;
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
      upgrades.append(
        el('li', {}, [
          el('span', {}, [`${def.name} `, el('span', { className: 'muted' }, [`Stufe ${level} (${value})`])]),
          button,
          el('span', { className: 'desc' }, [def.description]),
        ]),
      );
    }

    let auto: Node;
    if (!unlocked) {
      auto = el('p', { className: 'muted small' }, ['Auto-Kauf schaltet das Artefakt "Instinkt" frei.']);
    } else {
      const box = el('input', { type: 'checkbox', id: 'auto-upgrades', checked: meta.autoUpgradeEnabled });
      box.addEventListener('change', () => {
        this.game.setAutoUpgrades(box.checked);
        this.lastKey = '';
      });
      const top = [...UPGRADE_IDS].sort((a, b) => AUTO_WEIGHTS[mode][b] - AUTO_WEIGHTS[mode][a]).slice(0, 2);
      auto = el('div', {}, [
        el('label', { className: 'toggle' }, [box, ' Auto-Kauf (einmal pro Welle)']),
        el('p', { className: 'muted small' }, [
          'Kauft am Ende jeder Welle, wenn gerade kein neuer Turm möglich ist. ',
          mode === 'gefahr'
            ? 'Lage: Gefahr, die Roboter kamen weit. Priorität: '
            : 'Lage: ruhig. Priorität: ',
          el('strong', {}, [top.map((k) => UPGRADE_DEFS[k].name).join(' und ')]),
          ', der Rest gewichtet dahinter.',
        ]),
      ]);
    }

    this.root.replaceChildren(
      el('h2', {}, ['Upgrades für alle Türme']),
      el('p', { className: 'muted small' }, ['Wirken auf jeden Turm, jetzt und später. Items kaufst du direkt am Turm (Turm anklicken).']),
      auto,
      upgrades,
    );
  }
}
