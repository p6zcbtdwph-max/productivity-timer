/** Garten: Töpfe, Samen, Bäume, Harz. */
import { COMPENDIUM_EFFECT_IDS, COMPENDIUM_EFFECTS } from '../data/compendium';
import { GARDEN, GARDEN_UPGRADES, hoursForNextLevel, RARITIES, resinPerHour, TREE_DEFS, TREE_IDS, treeBonus, type TreeId } from '../data/garden';
import type { Game } from '../game/Game';
import {
  buyGardenUpgrade,
  gardenTotals,
  gardenUpgradeLevel,
  gardenUpgradePrice,
  gardenUpgradeValues,
  plantSeed,
  potUnlockCost,
  unlockPot,
  uproot,
} from '../game/systems/GardenSystem';
import { $, el, formatNumber } from './dom';
import { askConfirm } from './Confirm';

function duration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export class GardenPanel {
  private readonly root = $('#garden-panel');
  private lastKey = '';

  constructor(
    private readonly game: Game,
    private readonly onChange: () => void,
  ) {}

  invalidate(): void {
    this.lastKey = '';
  }

  private act(action: () => unknown): () => void {
    return () => {
      action();
      this.onChange();
      this.invalidate();
    };
  }

  render(): void {
    const { meta } = this.game;
    const garden = meta.garden;
    const key = JSON.stringify([garden.resin, garden.seeds, garden.upgrades, garden.pots.map((p) => [p.tree, p.level, Math.floor(p.growth * 60)])]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const care = gardenUpgradeValues(meta);
    const resinRate = garden.pots.reduce((sum, p) => sum + (p.tree ? resinPerHour(p.tree, p.level) : 0), 0) * care.resinMult;

    // --- Gesamtbonus ---------------------------------------------------------
    const totals = gardenTotals(meta);
    const summary = el('ul', { className: 'bonus-list' });
    for (const e of COMPENDIUM_EFFECT_IDS) if (totals[e] > 0) summary.append(el('li', {}, [COMPENDIUM_EFFECTS[e].format(totals[e])]));
    if (summary.children.length === 0) summary.append(el('li', { className: 'muted' }, ['Noch keine Bäume gepflanzt.']));

    // --- Samen ---------------------------------------------------------------
    const owned = TREE_IDS.filter((id) => (garden.seeds[id] ?? 0) > 0);
    const seeds = el('p', {}, [
      owned.length === 0
        ? el('span', { className: 'muted' }, [`Keine Samen. Nach jeder aktiv geschafften Welle ab Welle ${GARDEN.seedFromWave} gibt es eine Chance von ${Math.round(GARDEN.seedChance * 100)} %, bei Bosswellen ${Math.round(GARDEN.bossSeedChance * 100)} %. In der Winterruhe gibt es keine Samen.`])
        : el('span', {}, owned.map((id) => el('span', { className: 'seed-chip', style: `border-color:${RARITIES[TREE_DEFS[id].rarity].color}` }, [`🌰 ${TREE_DEFS[id].name} ×${garden.seeds[id]}`]))),
    ]);

    // --- Töpfe ---------------------------------------------------------------
    const pots = el('ul', { className: 'shop-list' });
    garden.pots.forEach((pot, index) => {
      if (!pot.tree) {
        const buttons = owned.map((id) => {
          const b = el('button', { className: 'btn small' }, [`🌱 ${TREE_DEFS[id].name}`]);
          b.addEventListener('click', this.act(() => plantSeed(meta, index, id)));
          return b;
        });
        pots.append(
          el('li', {}, [
            el('span', { className: 'muted' }, [`Topf ${index + 1}: leer`]),
            el('span', {}, []),
            el('span', { className: 'desc actions' }, buttons.length ? buttons : [el('span', { className: 'muted small' }, ['Erst einen Samen finden.'])]),
          ]),
        );
        return;
      }
      const tree = TREE_DEFS[pot.tree as TreeId];
      const rarity = RARITIES[tree.rarity];
      const need = hoursForNextLevel(pot.level);
      const progress = pot.level >= GARDEN.maxLevel ? 'ausgewachsen' : `Level ${pot.level + 1} in ${duration((need - pot.growth) / care.growthMult)} (${Math.floor((pot.growth / need) * 100)} %)`;
      const dig = el('button', { className: 'btn small danger' }, ['Ausgraben']);
      dig.addEventListener('click', () => {
        void askConfirm(`${tree.name} (Level ${pot.level}) ausgraben? Der Baum ist dann verloren.`, 'Ausgraben').then((ok) => ok && this.act(() => uproot(meta, index))());
      });
      pots.append(
        el('li', {}, [
          el('span', {}, [
            el('span', { className: 'swatch', style: `background:${tree.color}` }),
            ` ${tree.name} `,
            el('span', { className: 'small', style: `color:${rarity.color}` }, [rarity.name]),
            el('strong', {}, [` Lvl ${pot.level}`]),
          ]),
          dig,
          el('span', { className: 'desc' }, [
            `${COMPENDIUM_EFFECTS[tree.effect].format(treeBonus(pot.tree as TreeId, pot.level) * care.bonusMult)} · ${(resinPerHour(pot.tree as TreeId, pot.level) * care.resinMult).toFixed(1)} Harz/h · ${progress}`,
          ]),
          el('span', { className: 'desc muted' }, [`${tree.lineage}. ${tree.description}`]),
        ]),
      );
    });
    const nextPot = potUnlockCost(meta);
    if (nextPot !== undefined) {
      const b = el('button', { className: 'btn small', disabled: garden.resin < nextPot }, [`${formatNumber(nextPot)} 🍯`]);
      b.addEventListener('click', this.act(() => unlockPot(meta)));
      pots.append(el('li', {}, [el('span', {}, [`🔒 Topf ${garden.pots.length + 1} freischalten`]), b]));
    }

    // --- Pflege (Harz) ---------------------------------------------------------
    const careList = (group: 'garten' | 'passiv'): HTMLUListElement => {
      const list = el('ul', { className: 'shop-list' });
      for (const def of GARDEN_UPGRADES.filter((u) => u.group === group)) {
        const level = gardenUpgradeLevel(meta, def.id);
        const price = gardenUpgradePrice(meta, def.id);
        const control =
          price === undefined
            ? el('span', { className: 'muted small' }, ['max'])
            : el('button', { className: 'btn small', disabled: garden.resin < price }, [`${formatNumber(price)} 🍯`]);
        if (price !== undefined) control.addEventListener('click', this.act(() => buyGardenUpgrade(meta, def.id)));
        list.append(
          el('li', {}, [
            el('span', {}, [`${def.name} `, el('span', { className: 'muted' }, [`${level}/${def.maxLevel}`])]),
            control,
            el('span', { className: 'desc' }, [def.description]),
          ]),
        );
      }
      return list;
    };

    this.root.replaceChildren(
      el('h2', {}, [`🌳 Garten · 🍯 ${formatNumber(garden.resin)} Harz`]),
      el('p', { className: 'muted small' }, [
        `+${resinRate.toFixed(1)} Harz/h. Mit Harz schaltest du Töpfe frei und verbesserst Garten und Passiv-Modus. `,
        'Bäume wachsen in Echtzeit, auch wenn das Spiel geschlossen ist, aber langsam: Level n → n+1 dauert n Stunden.',
      ]),
      el('h3', {}, ['Bonus aller Bäume']),
      summary,
      el('h3', {}, ['Samen']),
      seeds,
      el('h3', {}, ['Töpfe']),
      pots,
      el('h3', {}, ['Pflege: Garten']),
      careList('garten'),
      el('h3', {}, ['Pflege: Passiv-Modus']),
      careList('passiv'),
    );
  }
}
