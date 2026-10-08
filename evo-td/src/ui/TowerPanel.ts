/** Seitenleiste: Details zum ausgewählten Turm, Boni, Aktionen. */
import { xpForLevel } from '../config/balance';
import { describeBonus } from '../data/bonuses';
import { childrenOf, getTowerDef, lineageOf, TARGETING_NAMES } from '../data/towers';
import type { Game } from '../game/Game';
import { canEvolve, countSameType, evolutionChanceFor, unlockedChildren } from '../game/systems/EvolutionSystem';
import { environmentFor, computeStats, resolveBonuses, type BonusSource, type Breakdown, type EffectiveStats } from '../game/systems/StatsSystem';
import { $, el, formatNumber } from './dom';
import { BIOME_BONUS, BIOME_NAMES, speciesBiome } from '../data/biomes';

const SOURCE_LABEL: Record<BonusSource, string> = {
  eigen: 'eigen',
  vorfahre: 'Vorfahre',
  geschwister: 'Geschwister',
  nachbar: 'Nachbar',
};

export type TowerAction = 'fuse' | 'relocate';

export interface TowerPanelCallbacks {
  onAction: (action: TowerAction) => void;
  /** Panel schließen (Auswahl aufheben). */
  onClose: () => void;
}

export class TowerPanel {
  private readonly root = $('#tower-panel');
  private lastRenderedKey = '';

  constructor(
    private readonly game: Game,
    private readonly callbacks: TowerPanelCallbacks,
  ) {}

  invalidate(): void {
    this.lastRenderedKey = '';
  }

  render(selectedTowerId: number | undefined, activeAction: TowerAction | undefined): void {
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

    const ctx = this.game.ctx;
    const def = getTowerDef(tower.defId);
    const env = environmentFor(ctx, tower);
    const sameType = countSameType(this.game.state.towers, tower.defId);
    const chance = evolutionChanceFor(ctx, tower);
    const unlockedKids = unlockedChildren(ctx, tower.defId);
    const candidates = this.game.fusionCandidatesFor(tower.id);
    const charges = this.game.relocateCharges();
    const key = [
      tower.id, tower.slot, tower.targeting ?? '', tower.defId, tower.level, tower.prestige, Math.floor(tower.xp), tower.evolutionLocked, sameType,
      tower.kills, env.neighbours.join(','), chance.toFixed(4), candidates.length, charges, activeAction ?? '',
      Math.floor(this.game.state.gold) >= this.game.relocateCost(), unlockedKids.length,
      // globale Einflüsse: Run-Upgrades, Items, Artefakte, Erfolge
      JSON.stringify([this.game.state.upgrades, this.game.meta.items.equipped, this.game.meta.upgrades, this.game.meta.bestWaveByMap, Object.keys(this.game.meta.compendium).length, this.game.meta.garden.pots]),
    ].join('|');
    if (key === this.lastRenderedKey) return;
    this.lastRenderedKey = key;

    const stats = computeStats(tower, env);

    const lockButton = el('button', { className: tower.evolutionLocked ? 'btn warn' : 'btn' }, [
      tower.evolutionLocked ? '🔒 Evolution gestoppt – freigeben' : '🧬 Evolution stoppen',
    ]);
    lockButton.addEventListener('click', () => {
      this.game.toggleEvolutionLock(tower.id);
      this.invalidate();
    });

    const targeting = tower.targeting ?? def.targeting;
    const targetButton = el('button', { className: tower.targeting ? 'btn active' : 'btn', title: 'Zielpriorität wechseln (Taste T)' }, [
      `🎯 Ziel: ${TARGETING_NAMES[targeting]}${tower.targeting ? '' : ' (Standard)'}`,
    ]);
    targetButton.addEventListener('click', () => {
      this.game.cycleTargeting(tower.id);
      this.invalidate();
    });

    const fuseButton = el(
      'button',
      { className: activeAction === 'fuse' ? 'btn active' : 'btn', disabled: candidates.length === 0 },
      [`⭐ Fusionieren (${candidates.length} gleiche)`],
    );
    fuseButton.addEventListener('click', () => this.callbacks.onAction('fuse'));

    const relocateCost = this.game.relocateCost();
    const relocateButton = el(
      'button',
      { className: activeAction === 'relocate' ? 'btn active' : 'btn', disabled: charges === 0 || this.game.state.gold < relocateCost },
      [`🚚 Verlegen (${formatNumber(relocateCost)} 💰, ${charges} übrig)`],
    );
    relocateButton.addEventListener('click', () => this.callbacks.onAction('relocate'));

    const children = childrenOf(tower.defId);
    const lockedKids = children.filter((id) => !unlockedKids.includes(id));
    const evolutionInfo = canEvolve(ctx, tower)
      ? el('p', {}, [
          `Evolutionschance ${(chance * 100).toFixed(1)} % alle paar Sekunden. `,
          `Mögliche Nachfahren: ${unlockedKids.map((id) => getTowerDef(id).name).join(', ')}.`,
          lockedKids.length ? ` Gesperrt: ${lockedKids.map((id) => getTowerDef(id).name).join(', ')}.` : '',
        ])
      : el('p', { className: 'muted' }, [
          tower.evolutionLocked
            ? 'Evolution ist angehalten.'
            : children.length === 0
              ? 'Endform dieser Linie erreicht.'
              : `Keine Nachfahren freigeschaltet (${lockedKids.map((id) => getTowerDef(id).name).join(', ')}). Im Stammbaum mit DNA freischalten.`,
        ]);

    const bonusList = el('ul', { className: 'bonus-list' });
    for (const resolved of resolveBonuses(tower.defId, env)) {
      const from = getTowerDef(resolved.from);
      bonusList.append(
        el('li', { className: resolved.source }, [
          el('span', { className: 'swatch', style: `background:${from.color}` }),
          ` ${describeBonus(resolved.bonus)} `,
          el('span', { className: 'muted small' }, [`(${from.name}, ${SOURCE_LABEL[resolved.source]})`]),
        ]),
      );
    }

    const close = el('button', { className: 'btn small close', title: 'Schließen (Esc)' }, ['✕']);
    close.addEventListener('click', () => this.callbacks.onClose());
    this.root.replaceChildren(
      el('h2', { className: 'with-close' }, [
        el('span', {}, [el('span', { className: 'swatch', style: `background:${def.color}` }), ` ${def.name}${tower.prestige > 0 ? ` ★${tower.prestige}` : ''}`]),
        close,
      ]),
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
        el('dt', {}, ['Prestige']),
        el('dd', {}, [tower.prestige > 0 ? `★${tower.prestige}` : '–']),
        el('dt', {}, ['Schaden']),
        el('dd', {}, [formatNumber(stats.damage)]),
        el('dt', {}, ['Feuerrate']),
        el('dd', {}, [`${(1 / stats.cooldown).toFixed(2)}/s`]),
        el('dt', {}, ['Reichweite']),
        el('dd', {}, [Number.isFinite(stats.range) ? `${stats.range.toFixed(1)} Zellen` : 'global (fliegt)']),
        el('dt', {}, ['Angriff']),
        el('dd', {}, [describeAttack(stats)]),
        el('dt', {}, ['Kills']),
        el('dd', {}, [`${tower.kills} · ${formatNumber(tower.damageDealt)} Schaden`]),
        el('dt', {}, ['Gleiche Art']),
        el('dd', {}, [`${sameType} auf dem Feld`]),
        el('dt', {}, ['Gelände']),
        el('dd', {}, [describeTerrain(this.game, tower.slot, tower.defId)]),
        el('dt', {}, ['Nachbarn']),
        el('dd', {}, [env.neighbours.length ? env.neighbours.map((id) => getTowerDef(id).name).join(', ') : '–']),
      ]),
      el('h3', {}, ['Verrechnung']),
      el('p', { className: 'muted small' }, [`Schaden: ${describeBreakdown(stats.breakdown.damage)}`]),
      el('p', { className: 'muted small' }, [`Feuerrate: ${describeBreakdown(stats.breakdown.fireRate)}`]),
      el('h3', {}, ['Eigenschaften']),
      bonusList,
      evolutionInfo,
      el('div', { className: 'actions' }, [targetButton, lockButton, fuseButton, relocateButton]),
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
  return parts.join(' · ');
}

/** "64 × 1.45 (Art) × 1.20 (Ausrüstung) × 1.25 (Mutation) × 1.75 (Prestige) × 1.14 (Level) × 1.08 (Meta)" */
function describeBreakdown(b: Breakdown): string {
  const num = (n: number): string => (Math.abs(n) < 100 ? n.toFixed(2) : formatNumber(n));
  const parts = [num(b.base)];
  const factor = (value: number, label: string): void => {
    if (Math.abs(value - 1) >= 0.005) parts.push(`× ${value.toFixed(2)} (${label})`);
  };
  factor(b.art, 'Art');
  factor(b.ausruestung, 'Ausrüstung');
  factor(b.mutation, 'Mutation');
  factor(b.synergie, 'Synergie');
  factor(b.prestige, 'Prestige');
  factor(b.level, 'Level');
  factor(b.meta, 'Artefakte');
  factor(b.erfolge, 'Erfolge');
  factor(b.kompendium, 'Kompendium');
  factor(b.gelaende, 'Gelände');
  factor(b.flug, 'Flug');
  factor(b.garten, 'Garten');
  return `${parts.join(' ')} = ${num(b.result)}`;
}

function describeTerrain(game: Game, slot: number, defId: string): string {
  const parts: string[] = [];
  const biome = game.map.slotBiome[slot];
  const home = speciesBiome(defId);
  if (biome) {
    parts.push(biome === home ? `${BIOME_NAMES[biome]} (Heimat, ×${BIOME_BONUS.damage} Schaden)` : `${BIOME_NAMES[biome]} (Heimat wäre ${BIOME_NAMES[home]})`);
  } else {
    parts.push(`kein Biom · Heimat: ${BIOME_NAMES[home]}`);
  }
  if (game.map.highGround.has(slot)) parts.push(`Anhöhe ×${BIOME_BONUS.highGroundRange} Reichweite`);
  return parts.join(' · ');
}
