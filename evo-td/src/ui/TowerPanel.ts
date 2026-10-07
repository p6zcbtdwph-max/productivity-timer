/** Seitenleiste: Details zum ausgewählten Turm, Boni, Evolutions-Sperre. */
import { xpForLevel } from '../config/balance';
import { describeBonus } from '../data/bonuses';
import { childrenOf, getTowerDef, lineageOf } from '../data/towers';
import type { Game } from '../game/Game';
import { canEvolve, countSameType, evolutionChance } from '../game/systems/EvolutionSystem';
import { computeStats, resolveBonuses, type BonusSource, type EffectiveStats } from '../game/systems/StatsSystem';
import { $, el, formatNumber } from './dom';

const SOURCE_LABEL: Record<BonusSource, string> = {
  eigen: 'eigen',
  vorfahre: 'Vorfahre',
  geschwister: 'Geschwister',
};

export class TowerPanel {
  private readonly root = $('#tower-panel');
  private lastRenderedKey = '';

  constructor(private readonly game: Game) {}

  render(selectedTowerId: number | undefined): void {
    const tower = this.game.state.towers.find((t) => t.id === selectedTowerId);
    if (!tower) {
      if (this.lastRenderedKey !== 'none') {
        this.root.replaceChildren(
          el('p', { className: 'muted' }, [
            'Klicke auf einen freien Bauplatz, um einen Einzeller zu setzen. Klicke auf einen Turm für Details.',
          ]),
        );
        this.lastRenderedKey = 'none';
      }
      return;
    }

    const def = getTowerDef(tower.defId);
    const sameType = countSameType(this.game.state.towers, tower.defId);
    const chance = evolutionChance(tower.level, sameType);
    const key = `${tower.id}|${tower.defId}|${tower.level}|${Math.floor(tower.xp)}|${tower.evolutionLocked}|${sameType}|${tower.kills}`;
    if (key === this.lastRenderedKey) return;
    this.lastRenderedKey = key;

    const stats = computeStats(tower);

    const lockButton = el('button', { className: tower.evolutionLocked ? 'btn warn' : 'btn' }, [
      tower.evolutionLocked ? '🔒 Evolution gestoppt – freigeben' : '🧬 Evolution stoppen',
    ]);
    lockButton.addEventListener('click', () => {
      this.game.toggleEvolutionLock(tower.id);
      this.lastRenderedKey = '';
    });

    const children = childrenOf(tower.defId);
    const evolutionInfo = canEvolve(tower)
      ? el('p', {}, [
          `Evolutionschance ${(chance * 100).toFixed(1)} % alle paar Sekunden. `,
          `Mögliche Nachfahren: ${children.map((id) => getTowerDef(id).name).join(', ')}.`,
        ])
      : el('p', { className: 'muted' }, [
          tower.evolutionLocked ? 'Evolution ist angehalten.' : 'Endform dieser Linie erreicht.',
        ]);

    const bonusList = el('ul', { className: 'bonus-list' });
    for (const resolved of resolveBonuses(tower.defId)) {
      const from = getTowerDef(resolved.from);
      bonusList.append(
        el('li', { className: resolved.source }, [
          el('span', { className: 'swatch', style: `background:${from.color}` }),
          ` ${describeBonus(resolved.bonus)} `,
          el('span', { className: 'muted small' }, [`(${from.name}, ${SOURCE_LABEL[resolved.source]})`]),
        ]),
      );
    }

    this.root.replaceChildren(
      el('h2', {}, [el('span', { className: 'swatch', style: `background:${def.color}` }), ` ${def.name}`]),
      el('p', { className: 'muted' }, [`${def.lineage} · Tier ${def.tier} · ${def.archetype}`]),
      el('p', {}, [def.description]),
      el('p', { className: 'muted small' }, [
        'Abstammung: ',
        lineageOf(tower.defId)
          .map((id) => getTowerDef(id).name)
          .join(' → '),
      ]),
      el('dl', { className: 'stats' }, [
        el('dt', {}, ['Level']),
        el('dd', {}, [`${tower.level}  (${Math.floor(tower.xp)} / ${xpForLevel(tower.level)} XP)`]),
        el('dt', {}, ['Schaden']),
        el('dd', {}, [formatNumber(stats.damage)]),
        el('dt', {}, ['Feuerrate']),
        el('dd', {}, [`${(1 / stats.cooldown).toFixed(2)}/s`]),
        el('dt', {}, ['Reichweite']),
        el('dd', {}, [`${stats.range.toFixed(1)} Zellen`]),
        el('dt', {}, ['Angriff']),
        el('dd', {}, [describeAttack(stats)]),
        el('dt', {}, ['Kills']),
        el('dd', {}, [`${tower.kills} · ${formatNumber(tower.damageDealt)} Schaden`]),
        el('dt', {}, ['Gleiche Art']),
        el('dd', {}, [`${sameType} auf dem Feld`]),
      ]),
      el('h3', {}, ['Eigenschaften']),
      bonusList,
      evolutionInfo,
      lockButton,
    );
  }
}

function describeAttack(stats: EffectiveStats): string {
  const parts: string[] = [];
  parts.push(stats.targets > 1 ? `${stats.targets} Ziele` : 'Einzelziel');
  if (stats.splashRadius > 0) parts.push(`Fläche r=${stats.splashRadius.toFixed(1)}`);
  if (stats.critChance > 0) parts.push(`Krit ${Math.round(stats.critChance * 100)} % ×${stats.critMultiplier}`);
  if (stats.onHit.slow) parts.push(`Slow ${Math.round(stats.onHit.slow.amount * 100)} %`);
  if (stats.onHit.poison) parts.push(`Gift ${formatNumber(stats.onHit.poison.dps)}/s`);
  if (stats.onHit.antiHeal) parts.push(`Anti-Heilung ${Math.round(stats.onHit.antiHeal.percent * 100)} %`);
  if (stats.shieldBreaker > 0) parts.push(`+${Math.round(stats.shieldBreaker * 100)} % vs Schild`);
  if (stats.goldMultiplier > 1) parts.push(`Gold ×${stats.goldMultiplier.toFixed(2)}`);
  parts.push(`Ziel: ${stats.targeting}`);
  return parts.join(' · ');
}
