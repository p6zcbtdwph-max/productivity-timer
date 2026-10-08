/**
 * Kompendium: alle Arten mit Rekord-Level, Rekord-Prestige und ihrem passiven
 * Bonus. Basisarten werden immer gezeigt, Mutationen erst, wenn man sie hatte.
 */
import { COMPENDIUM_EFFECT_IDS, COMPENDIUM_EFFECTS, POINTS_PER_PRESTIGE, tierWeight } from '../data/compendium';
import { BASE_TOWER_IDS, childrenOf, getTowerDef, ROOT_TOWER, type TowerId } from '../data/towers';
import type { Game } from '../game/Game';
import { compendiumTotals, speciesBonus, speciesEffect } from '../game/systems/CompendiumSystem';
import { $, el, formatNumber } from './dom';

export class CompendiumPanel {
  private readonly root = $('#compendium-panel');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { meta } = this.game;
    const key = JSON.stringify(Object.entries(meta.compendium).map(([id, r]) => [id, r.maxLevel, r.maxPrestige, Math.floor((r.xp ?? 0) / 10)]));
    if (key === this.lastKey) return;
    this.lastKey = key;

    const totals = compendiumTotals(meta);
    const summary = el('ul', { className: 'bonus-list' });
    for (const e of COMPENDIUM_EFFECT_IDS) {
      if (totals[e] <= 0) continue;
      const def = COMPENDIUM_EFFECTS[e];
      summary.append(el('li', {}, [def.format(totals[e]), def.cap !== undefined && totals[e] >= def.cap ? el('span', { className: 'muted small' }, [' (Maximum)']) : '']));
    }
    if (summary.children.length === 0) summary.append(el('li', { className: 'muted' }, ['Noch keine Einträge. Jeder Turm, den du baust, landet hier.']));

    const list = el('ul', { className: 'tree compendium' });
    let known = 0;
    const visit = (id: TowerId, depth: number): void => {
      const def = getTowerDef(id);
      const record = meta.compendium[id];
      const effect = COMPENDIUM_EFFECTS[speciesEffect(id)];
      if (record) known++;
      list.append(
        el('li', { className: record ? 'known' : 'locked', style: `--depth:${depth}` }, [
          el('span', { className: 'swatch', style: `background:${record ? def.color : '#333'}` }),
          ` ${record ? def.name : '???'} `,
          el('span', { className: 'muted small' }, [`T${def.tier} `]),
          record
            ? el('span', { className: 'small' }, [`Lvl ${record.maxLevel}${record.maxPrestige > 0 ? ` ★${record.maxPrestige}` : ''} · ${formatNumber(record.xp ?? 0)} XP · `, el('strong', {}, [effect.format(speciesBonus(meta, id))])])
            : el('span', { className: 'muted small' }, [`bringt ${effect.name}`]),
        ]),
      );
      for (const child of childrenOf(id)) {
        if (BASE_TOWER_IDS.includes(child as never) || meta.compendium[child]) visit(child, depth + 1);
      }
    };
    visit(ROOT_TOWER, 0);

    this.root.replaceChildren(
      el('h2', {}, [`📖 Kompendium · ${known} Arten`]),
      el('p', { className: 'muted small' }, [
        `Jede Art, die du je hattest, gibt dauerhaft einen kleinen Bonus. Die Art des Bonus folgt aus ihrer Eigenschaft, die Stärke aus Rekord-Level + ${POINTS_PER_PRESTIGE} je Prestige, mal (1 + 0,5 × Tier). Ein Tier-4-Turm zählt also ×${tierWeight(4)}. Rekorde zählen aus Runs, Winterruhe und Kammern.`,
      ]),
      el('h3', {}, ['Gesamt']),
      summary,
      el('h3', {}, ['Arten']),
      list,
    );
  }
}
