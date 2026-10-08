/**
 * Items (global): seltene Funde, als Perks für alle Türme ausrüsten,
 * gleiche Items verschmelzen. Unter-Reiter: Ausrüstung | Inventar.
 */
import { categoryLabel, describeItem, ITEM_CATEGORY_IDS, ITEMS, itemLevel, QUALITY_DEFS, QUALITY_ORDER, type Item } from '../data/items';
import type { Game } from '../game/Game';
import { equipSlots, equippedModifiers, isEquipped, itemDropChance, mergePartner } from '../game/systems/ItemSystem';
import { metaValues } from '../game/systems/MetaSystem';
import { BALANCE } from '../config/balance';
import { $, el } from './dom';
import { askConfirm } from './Confirm';
import { pct, SubTabs } from './widgets';

type ItemsTab = 'ausruestung' | 'inventar';

export class ItemsPanel {
  private readonly root = $('#items-panel');
  private lastKey = '';
  private readonly sub = new SubTabs<ItemsTab>('items', [['ausruestung', 'Ausrüstung'], ['inventar', 'Inventar']], () => this.invalidate());

  constructor(private readonly game: Game) {}

  invalidate(): void {
    this.lastKey = '';
  }

  private act(action: () => unknown): () => void {
    return () => {
      action();
      this.invalidate();
    };
  }

  private row(item: Item, power: number): HTMLLIElement {
    const { meta } = this.game;
    const equipped = isEquipped(meta, item.id);
    const full = meta.items.equipped.length >= equipSlots(meta);
    const equip = el('button', { className: equipped ? 'btn small warn' : 'btn small', disabled: !equipped && full }, [equipped ? 'Ablegen' : 'Ausrüsten']);
    equip.addEventListener('click', this.act(() => this.game.toggleEquip(item.id)));
    const controls: HTMLElement[] = [equip];
    if (mergePartner(meta, item.id)) {
      const merge = el('button', { className: 'btn small' }, ['🦪 Verschmelzen']);
      merge.addEventListener('click', this.act(() => this.game.mergeItem(item.id)));
      controls.push(merge);
    }
    if (!equipped) {
      const discard = el('button', { className: 'btn small danger' }, ['Wegwerfen']);
      discard.addEventListener('click', () => {
        void askConfirm(`${describeItem(item, power)} wegwerfen?`, 'Wegwerfen').then((ok) => ok && this.act(() => this.game.discardItem(item.id))());
      });
      controls.push(discard);
    }
    return el('li', { className: equipped ? 'artifact owned' : '' }, [
      el('span', {}, [el('span', { className: 'swatch', style: `background:${QUALITY_DEFS[item.quality].color}` }), ` ${describeItem(item, power)}`]),
      el('span', { className: 'desc actions' }, controls),
    ]);
  }

  render(): void {
    const { meta } = this.game;
    const values = metaValues(meta);
    const key = JSON.stringify([meta.items, meta.upgrades.itemSlots, meta.upgrades.itemMerge, meta.upgrades.itemPower, meta.upgrades.itemFind, this.sub.active]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const slots = equipSlots(meta);
    const power = values.itemPowerMult;
    const inventory = [...meta.items.inventory].sort(
      (a, b) =>
        ITEM_CATEGORY_IDS.indexOf(a.category) - ITEM_CATEGORY_IDS.indexOf(b.category) ||
        QUALITY_ORDER.indexOf(b.quality) - QUALITY_ORDER.indexOf(a.quality) ||
        itemLevel(b) - itemLevel(a),
    );
    const content: Node[] = [];

    if (this.sub.active === 'ausruestung') {
      const equipped = inventory.filter((i) => isEquipped(meta, i.id));
      const list = el('ul', { className: 'shop-list' }, equipped.map((i) => this.row(i, power)));
      for (let s = equipped.length; s < slots; s++) {
        list.append(el('li', {}, [el('span', { className: 'muted' }, [inventory.length > equipped.length ? '– freier Platz: im Inventar ausrüsten –' : '– freier Platz –'])]));
      }
      const mods = equippedModifiers(meta);
      const summary = el(
        'ul',
        { className: 'bonus-list' },
        ITEM_CATEGORY_IDS.filter((k) => mods[k] > 0).map((k) => el('li', {}, [`+${(mods[k] * 100).toFixed(k === 'evolution' ? 2 : 0)} % ${categoryLabel(k)}`])),
      );
      if (summary.children.length === 0) summary.append(el('li', { className: 'muted' }, ['Noch nichts ausgerüstet.']));
      const boss = itemDropChance(meta, BALANCE.waves.bossEvery, true);
      content.push(
        el('p', { className: 'muted small' }, [
          `Items findest du sehr selten nach aktiv geschafften Wellen (ab Welle ${ITEMS.fromWave}): ${pct(itemDropChance(meta, ITEMS.fromWave, false))} je Welle, ${pct(boss)} bei Bosswellen. `,
          'Ausgerüstete Items wirken auf alle Türme, in jedem Run (Topf "Ausrüstung").',
        ]),
        el('h3', {}, [`Ausgerüstet (${equipped.length}/${slots})`]),
        list,
        el('h3', {}, ['Wirkung']),
        summary,
      );
    } else {
      const header: Node[] = [];
      if (values.itemMerge) {
        const canMerge = inventory.some((i) => mergePartner(meta, i.id));
        const all = el('button', { className: 'btn small', disabled: !canMerge }, ['🦪 Alles Gleiche verschmelzen']);
        all.addEventListener('click', this.act(() => this.game.mergeAllItems()));
        header.push(el('div', { className: 'actions' }, [all]));
      } else {
        header.push(el('p', { className: 'muted small' }, ['Gleiche Items verschmelzen schaltet das Artefakt "Perlmuschel" frei.']));
      }
      content.push(
        ...header,
        inventory.length === 0
          ? el('p', { className: 'muted' }, ['Noch keine Items gefunden.'])
          : el('ul', { className: 'shop-list' }, inventory.map((i) => this.row(i, power))),
      );
    }

    this.root.replaceChildren(
      el('h2', {}, [`🎒 Items · ${meta.items.inventory.length} im Inventar`]),
      this.sub.element({ ausruestung: `Ausrüstung ${meta.items.equipped.length}/${slots}`, inventar: `Inventar (${meta.items.inventory.length})` }),
      ...content,
    );
  }
}
