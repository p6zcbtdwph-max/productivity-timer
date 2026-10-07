/** Globaler Shop: DNA-Stand, Run-Abrechnung, permanente Upgrades. */
import { META_UPGRADE_DEFS, META_UPGRADE_IDS } from '../data/meta';
import type { Game } from '../game/Game';
import { metaLevel, metaUpgradePrice, metaValues } from '../game/systems/MetaSystem';
import { $, el, formatNumber } from './dom';

export class GlobalPanel {
  private readonly root = $('#global-panel');
  private lastKey = '';

  constructor(
    private readonly game: Game,
    private readonly onEndRun: () => void,
  ) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { meta } = this.game;
    const preview = this.game.dnaPreview();
    const key = `${meta.dna}|${meta.bestWave}|${META_UPGRADE_IDS.map((id) => metaLevel(meta, id)).join(',')}|${preview.total}|${meta.autoFusionEnabled}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const endButton = el('button', { className: 'btn warn' }, [`Run beenden: +${formatNumber(preview.total)} DNA`]);
    endButton.addEventListener('click', () => {
      if (confirm(`Run jetzt beenden und ${preview.total} DNA kassieren? Der Run-Fortschritt geht verloren.`)) this.onEndRun();
    });

    const list = el('ul', { className: 'shop-list' });
    for (const id of META_UPGRADE_IDS) {
      const def = META_UPGRADE_DEFS[id];
      const level = metaLevel(meta, id);
      const price = metaUpgradePrice(meta, id);
      const button =
        price === undefined
          ? el('span', { className: 'muted small' }, ['max'])
          : el('button', { className: 'btn small', disabled: meta.dna < price }, [`${formatNumber(price)} 🧬`]);
      if (price !== undefined) {
        button.addEventListener('click', () => {
          this.game.buyMetaUpgrade(id);
          this.invalidate();
        });
      }
      list.append(
        el('li', {}, [
          el('span', {}, [`${def.name} `, el('span', { className: 'muted' }, [`${level}/${def.maxLevel}`])]),
          button,
          el('span', { className: 'desc' }, [def.description]),
        ]),
      );
    }

    const values = metaValues(meta);
    const autoFusion = el('label', { className: 'toggle' }, [
      Object.assign(el('input', { type: 'checkbox' }), { checked: meta.autoFusionEnabled, disabled: !values.autoFusion }),
      values.autoFusion ? ' Auto-Fusion aktiv' : ' Auto-Fusion (erst "Symbiose" kaufen)',
    ]);
    autoFusion.querySelector('input')?.addEventListener('change', (e) => {
      this.game.setAutoFusion((e.target as HTMLInputElement).checked);
      this.invalidate();
    });

    this.root.replaceChildren(
      el('h2', {}, [`🧬 ${formatNumber(meta.dna)} DNA`]),
      el('p', { className: 'muted small' }, [
        `Bestwelle ${meta.bestWave} · ${meta.runs} Runs · ${formatNumber(meta.totalDnaEarned)} DNA insgesamt`,
      ]),
      el('p', {}, [
        `Dieser Run: Welle ${preview.wave}. Neue Wellen bringen ${formatNumber(preview.fromNewWaves)} DNA, `,
        `bereits erreichte nur ${formatNumber(preview.fromRepeatedWaves)}.`,
      ]),
      endButton,
      el('h2', { style: 'margin-top:14px' }, ['Permanente Upgrades']),
      el('p', { className: 'muted small' }, ['Gelten für jeden Run, sofort und für immer. Evolutionen schaltest du im Stammbaum frei.']),
      list,
      el('div', { className: 'actions' }, [autoFusion]),
    );
  }
}
