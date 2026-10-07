/** Seitenleiste: Details zum ausgewählten Turm, Evolutions-Sperre. */
import { xpForLevel } from '../config/balance';
import { getTowerDef, lineageOf } from '../data/towers';
import type { Game } from '../game/Game';
import { effectiveCooldown, effectiveDamage } from '../game/systems/CombatSystem';
import { canEvolve, countSameType, evolutionChance } from '../game/systems/EvolutionSystem';
import { $, el, formatNumber } from './dom';

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

    const lockButton = el(
      'button',
      { className: tower.evolutionLocked ? 'btn warn' : 'btn' },
      [tower.evolutionLocked ? '🔒 Evolution gestoppt – freigeben' : '🧬 Evolution stoppen'],
    );
    lockButton.addEventListener('click', () => {
      this.game.toggleEvolutionLock(tower.id);
      this.lastRenderedKey = '';
    });

    const evolutionInfo = canEvolve(tower)
      ? el('p', {}, [
          `Evolutionschance: ${(chance * 100).toFixed(1)} % alle paar Sekunden. `,
          `Mögliche Nachfahren: ${def.evolvesTo.map((id) => getTowerDef(id).name).join(', ')}.`,
        ])
      : el('p', { className: 'muted' }, [
          tower.evolutionLocked ? 'Evolution ist angehalten.' : 'Ende dieser Entwicklungslinie erreicht.',
        ]);

    this.root.replaceChildren(
      el('h2', {}, [el('span', { className: 'swatch', style: `background:${def.color}` }), ` ${def.name}`]),
      el('p', { className: 'muted' }, [`${def.lineage} · Tier ${def.tier}`]),
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
        el('dd', {}, [formatNumber(effectiveDamage(tower, def))]),
        el('dt', {}, ['Feuerrate']),
        el('dd', {}, [`${(1 / effectiveCooldown(tower, def)).toFixed(2)}/s`]),
        el('dt', {}, ['Reichweite']),
        el('dd', {}, [`${def.stats.range.toFixed(1)} Zellen`]),
        el('dt', {}, ['Angriff']),
        el('dd', {}, [describeAttack(def)]),
        el('dt', {}, ['Kills']),
        el('dd', {}, [`${tower.kills} · ${formatNumber(tower.damageDealt)} Schaden`]),
        el('dt', {}, ['Gleiche Art']),
        el('dd', {}, [`${sameType} auf dem Feld`]),
      ]),
      evolutionInfo,
      lockButton,
    );
  }
}

function describeAttack(def: ReturnType<typeof getTowerDef>): string {
  const parts: string[] = [];
  switch (def.attack.kind) {
    case 'single':
      parts.push('Einzelziel');
      break;
    case 'splash':
      parts.push(`Fläche (r=${def.attack.radius})`);
      break;
    case 'multi':
      parts.push(`${def.attack.targets} Ziele`);
      break;
  }
  for (const effect of def.onHit) {
    if (effect.kind === 'slow') parts.push(`Slow ${Math.round((1 - effect.factor) * 100)} %`);
    if (effect.kind === 'poison') parts.push(`Gift ${effect.dps}/s`);
  }
  if (def.stats.critChance > 0) parts.push(`Krit ${Math.round(def.stats.critChance * 100)} %`);
  parts.push(`Ziel: ${def.targeting}`);
  return parts.join(' · ');
}
