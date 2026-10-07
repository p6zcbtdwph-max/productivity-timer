/** Stammbaum-Übersicht: welche der 16 Arten wurden schon entdeckt? */
import { getTowerDef, ROOT_TOWER, TOWER_IDS, type TowerId } from '../data/towers';
import type { Game } from '../game/Game';
import { $, el } from './dom';

export class TreeView {
  private readonly root = $('#tree-view');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  render(): void {
    const { discovered, towers } = this.game.state;
    const counts = new Map<TowerId, number>();
    for (const t of towers) counts.set(t.defId, (counts.get(t.defId) ?? 0) + 1);
    const key = `${discovered.join(',')}|${[...counts.entries()].map(([k, v]) => `${k}:${v}`).join(',')}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const list = el('ul', { className: 'tree' });
    const append = (id: TowerId, depth: number): void => {
      const def = getTowerDef(id);
      const known = discovered.includes(id);
      const count = counts.get(id) ?? 0;
      const item = el('li', { className: known ? 'known' : 'unknown', style: `--depth:${depth}` }, [
        el('span', { className: 'swatch', style: `background:${known ? def.color : '#333'}` }),
        ` ${known ? def.name : '???'}`,
        count > 0 ? el('span', { className: 'count' }, [` ×${count}`]) : '',
      ]);
      list.append(item);
      for (const child of def.evolvesTo) append(child, depth + 1);
    };
    append(ROOT_TOWER, 0);

    this.root.replaceChildren(
      el('h2', {}, [`Stammbaum ${discovered.length}/${TOWER_IDS.length}`]),
      list,
    );
  }
}
