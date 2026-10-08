/**
 * Kompendium mit Unter-Reitern:
 * - Boni: Gesamtwirkung aller je gezüchteten Arten.
 * - Arten: Übersicht als Karten, nach Tier. Unbekannte Arten bleiben verdeckt,
 *   Mutationen erscheinen erst, wenn man sie hatte.
 */
import { COMPENDIUM_EFFECT_IDS, COMPENDIUM_EFFECTS, POINTS_PER_PRESTIGE, tierWeight } from '../data/compendium';
import { childrenOf, getTowerDef, ROOT_TOWER, type TowerId } from '../data/towers';
import type { Game } from '../game/Game';
import { compendiumTotals, speciesBonus, speciesEffect } from '../game/systems/CompendiumSystem';
import { $, el, formatNumber } from './dom';
import { SubTabs } from './widgets';
import { isMutation, MAX_TIER, BASE_MAX_TIER } from '../data/towers';

type CompendiumTab = 'boni' | 'arten';

export class CompendiumPanel {
  private readonly root = $('#compendium-panel');
  private lastKey = '';
  private readonly sub = new SubTabs<CompendiumTab>('compendium', [['boni', 'Boni'], ['arten', 'Arten']], () => this.invalidate());

  constructor(private readonly game: Game) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { meta } = this.game;
    const key = JSON.stringify([this.sub.active, Object.entries(meta.compendium).map(([id, r]) => [id, r.maxLevel, r.maxPrestige, Math.floor((r.xp ?? 0) / 10)])]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const known = Object.keys(meta.compendium).length;
    const content = this.sub.active === 'boni' ? this.bonuses() : this.species();
    this.root.replaceChildren(el('h2', {}, [`📖 Kompendium · ${known} Arten`]), this.sub.element(), ...content);
  }

  private bonuses(): Node[] {
    const { meta } = this.game;
    const totals = compendiumTotals(meta);
    const summary = el('ul', { className: 'bonus-list' });
    for (const e of COMPENDIUM_EFFECT_IDS) {
      if (totals[e] <= 0) continue;
      const def = COMPENDIUM_EFFECTS[e];
      summary.append(el('li', {}, [def.format(totals[e]), def.cap !== undefined && totals[e] >= def.cap ? el('span', { className: 'muted small' }, [' (Maximum)']) : '']));
    }
    if (summary.children.length === 0) summary.append(el('li', { className: 'muted' }, ['Noch keine Einträge. Jeder Turm, den du baust, landet hier.']));
    return [
      el('p', { className: 'muted small' }, [
        `Jede Art, die du je hattest, gibt dauerhaft einen kleinen Bonus. Die Art des Bonus folgt aus ihrer Eigenschaft, die Stärke aus Rekord-Level + ${POINTS_PER_PRESTIGE} je Prestige, mal (1 + 0,5 × Tier). Ein Tier-4-Turm zählt also ×${tierWeight(4)}. Rekorde zählen aus Runs, Winterruhe und Kammern.`,
      ]),
      el('h3', {}, ['Gesamtbonus']),
      summary,
    ];
  }

  /** Übersicht aller Arten als Karten je Tier; Unbekanntes bleibt verdeckt. */
  private species(): Node[] {
    const { meta } = this.game;
    const byTier = new Map<number, TowerId[]>();
    const visit = (id: TowerId): void => {
      if (isMutation(id) && !meta.compendium[id]) return;
      const tier = getTowerDef(id).tier;
      byTier.set(tier, [...(byTier.get(tier) ?? []), id]);
      for (const child of childrenOf(id)) visit(child);
    };
    visit(ROOT_TOWER);
    const knownMutations = Object.keys(meta.compendium).filter((id) => isMutation(id)).length;

    const rows: Node[] = [];
    for (let tier = 0; tier <= MAX_TIER; tier++) {
      const ids = byTier.get(tier);
      if (!ids) continue;
      const knownHere = ids.filter((id) => meta.compendium[id]).length;
      rows.push(
        el('h3', {}, [`Tier ${tier}${tier > BASE_MAX_TIER ? ' · Mutationen' : ''} `, el('span', { className: 'muted small' }, [`${knownHere}/${ids.length}`])]),
        el('div', { className: 'species-grid' }, ids.map((id) => this.card(id))),
      );
    }
    return [
      el('p', { className: 'muted small' }, [
        `Verdeckte Karten sind Arten, die du noch nie hattest. Mutationen (ab Tier ${BASE_MAX_TIER + 1}) erscheinen erst, wenn du sie gezüchtet hast (${knownMutations} bisher).`,
      ]),
      ...rows,
    ];
  }

  private card(id: TowerId): HTMLElement {
    const record = this.game.meta.compendium[id];
    const def = getTowerDef(id);
    const effect = COMPENDIUM_EFFECTS[speciesEffect(id)];
    if (!record) {
      return el('div', { className: 'species-card hidden-card', title: `Unbekannte Art (Tier ${def.tier}), bringt ${effect.name}` }, [
        el('span', { className: 'species-name' }, ['?']),
        el('span', { className: 'muted small' }, [effect.name]),
      ]);
    }
    return el('div', { className: 'species-card', style: `border-color:${def.color}`, title: `${def.name}: ${effect.format(speciesBonus(this.game.meta, id))}` }, [
      el('span', { className: 'species-name' }, [el('span', { className: 'swatch', style: `background:${def.color}` }), ` ${def.name}`]),
      el('span', { className: 'small' }, [`Lvl ${record.maxLevel}${record.maxPrestige > 0 ? ` ★${record.maxPrestige}` : ''}`]),
      el('span', { className: 'muted small' }, [`${formatNumber(record.xp ?? 0)} XP`]),
      el('strong', { className: 'small' }, [effect.format(speciesBonus(this.game.meta, id))]),
    ]);
  }
}
