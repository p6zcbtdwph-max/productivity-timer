/**
 * Stammbaum: entdeckte Arten, Anzahl auf dem Feld und Freischaltung
 * (DNA) für alle Arten ab Tier 2. Mutationen erscheinen erst, wenn der
 * Elternknoten freigeschaltet ist.
 */
import { childrenOf, getTowerDef, ROOT_TOWER, unlockCost, type TowerId } from '../data/towers';
import type { Game } from '../game/Game';
import { canUnlock, isUnlocked } from '../game/systems/MetaSystem';
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
    const key = `${discovered.join(',')}|${[...counts.entries()].map(([k, v]) => `${k}:${v}`).join(',')}|${meta.unlockedTowers.length}|${meta.dna}`;
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
        const cost = unlockCost(id);
        const button = el('button', { className: 'btn small', disabled: !canUnlock(meta, id) }, [`${formatNumber(cost)} 🧬`]);
        button.addEventListener('click', () => {
          this.game.unlock(id);
          this.invalidate();
        });
        children.push(' ', button);
      }
      list.append(el('li', { className: unlocked ? (known ? 'known' : 'unlocked') : 'locked', style: `--depth:${depth}` }, children));

      // Nachfahren nur zeigen, wenn dieser Knoten frei ist (hält Mutationen überschaubar).
      if (unlocked) for (const child of childrenOf(id)) append(child, depth + 1);
    };
    append(ROOT_TOWER, 0);

    this.root.replaceChildren(
      el('h2', {}, [`Stammbaum · ${unlockedCount}/${shownCount} frei`]),
      el('p', { className: 'muted small' }, [
        `🧬 ${formatNumber(meta.dna)} DNA. Ab Tier 2 muss jede Art freigeschaltet werden; ab Tier 5 teilt sich jede Endform in Mutationen.`,
      ]),
      list,
    );
  }
}
