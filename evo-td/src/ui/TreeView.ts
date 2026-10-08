/**
 * Stammbaum: entdeckte Arten, Anzahl auf dem Feld und Freischaltung.
 * Ab Tier 2 wird eine Art frei, sobald ihre Elternart genug XP im
 * Kompendium gesammelt hat (über alle Runs). Mutationen erscheinen erst,
 * wenn der Elternknoten frei ist.
 */
import { childrenOf, getTowerDef, ROOT_TOWER, type TowerId } from '../data/towers';
import type { Game } from '../game/Game';
import { isUnlocked, unlockProgress } from '../game/systems/MetaSystem';
import { $, el, formatNumber } from './dom';

export class TreeView {
  private readonly root = $('#tree-view');
  private lastKey = '';

  constructor(private readonly game: Game) {}

  invalidate(): void {
    this.lastKey = '';
  }

  render(): void {
    const { discovered, towers } = this.game.state;
    const { meta } = this.game;
    const counts = new Map<TowerId, number>();
    for (const t of towers) counts.set(t.defId, (counts.get(t.defId) ?? 0) + 1);
    const xpKey = Object.entries(meta.compendium).map(([id, r]) => `${id}:${Math.floor((r.xp ?? 0) / 10)}`).join(',');
    const key = `${discovered.join(',')}|${[...counts.entries()].map(([k, v]) => `${k}:${v}`).join(',')}|${meta.unlockedTowers.length}|${xpKey}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const list = el('ul', { className: 'tree' });
    let unlockedCount = 0;
    let shownCount = 0;
    const append = (id: TowerId, depth: number): void => {
      const def = getTowerDef(id);
      const unlocked = isUnlocked(meta, id);
      const known = discovered.includes(id);
      const count = counts.get(id) ?? 0;
      shownCount++;
      if (unlocked) unlockedCount++;

      const children: (Node | string)[] = [
        el('span', { className: 'swatch', style: `background:${unlocked ? def.color : '#333'}` }),
        ` ${def.name}`,
        el('span', { className: 'muted small' }, [` T${def.tier}`]),
        count > 0 ? el('span', { className: 'count' }, [` ×${count}`]) : '',
      ];
      if (!unlocked) {
        const p = unlockProgress(meta, id);
        const parentName = p.parent ? getTowerDef(p.parent).name : '';
        const pct = Math.min(100, Math.floor((p.xp / p.need) * 100));
        children.push(
          ' ',
          el('span', { className: 'unlock-progress', title: `${parentName} braucht ${formatNumber(p.need)} XP im Kompendium` }, [
            el('span', { className: 'unlock-bar', style: `width:${pct}%` }),
            el('span', { className: 'unlock-label' }, [`🔒 ${parentName}-XP ${formatNumber(p.xp)}/${formatNumber(p.need)}`]),
          ]),
        );
      }
      list.append(el('li', { className: unlocked ? (known ? 'known' : 'unlocked') : 'locked', style: `--depth:${depth}` }, children));

      // Nachfahren nur zeigen, wenn dieser Knoten frei ist (hält Mutationen überschaubar).
      if (unlocked) for (const child of childrenOf(id)) append(child, depth + 1);
    };
    append(ROOT_TOWER, 0);

    this.root.replaceChildren(
      el('h2', {}, [`Stammbaum · ${unlockedCount}/${shownCount} frei`]),
      el('p', { className: 'muted small' }, [
        'Ab Tier 2 schaltet sich eine Art frei, sobald ihre Elternart genug XP gesammelt hat. Die XP aller Türme einer Art zählen im Kompendium über alle Runs, auch in der Winterruhe.',
      ]),
      list,
    );
  }
}
