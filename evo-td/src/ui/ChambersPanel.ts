/** Evolutionskammern, Reviere und Nest-Shop (Passiv-Modus, Währung Eier). */
import { MAPS } from '../data/map';
import { getTowerDef } from '../data/towers';
import type { Game } from '../game/Game';
import type { PassiveAnimal } from '../game/MetaState';
import { bestWaveOn, isMapUnlocked, metaValues } from '../game/systems/MetaSystem';
import {
  animalCost,
  animalEggsPerHour,
  animalInChamber,
  assignToMap,
  buyAnimal,
  chamberEvolutionRate,
  chamberUnlockCost,
  mapSlotsUsed,
  releaseAnimal,
  returnToChamber,
  toggleChamberLock,
  totalEggsPerHour,
  unlockChamber,
} from '../game/systems/PassiveSystem';
import { childrenOf } from '../data/towers';
import { $, el, formatNumber } from './dom';
import { askConfirm } from './Confirm';
import { NEST, NEST_UPGRADES, nestUpgradeCost } from '../data/nest';
import { buyNestUpgrade, eggChance, nestUpgradeLevel } from '../game/systems/NestSystem';
import { executeBulk } from '../game/systems/BulkBuy';
import { bulkButton, buyAmountBar, levelLabel, pct, SubTabs } from './widgets';

type ChambersTab = 'kammern' | 'reviere' | 'nest';

function hours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(h < 10 ? 1 : 0)} h`;
}

export class ChambersPanel {
  private readonly root = $('#chambers-panel');
  private lastKey = '';
  private readonly sub = new SubTabs<ChambersTab>('chambers', [['kammern', 'Kammern'], ['reviere', 'Reviere'], ['nest', 'Nest-Shop']], () => this.invalidate());

  constructor(private readonly game: Game) {}

  invalidate(): void {
    this.lastKey = '';
  }

  private act(action: () => unknown): () => void {
    return () => {
      action();
      this.game.invalidateStats();
      this.invalidate();
    };
  }

  private animalLabel(animal: PassiveAnimal): (Node | string)[] {
    const def = getTowerDef(animal.defId);
    return [el('span', { className: 'swatch', style: `background:${def.color}` }), ` ${def.name} `, el('span', { className: 'muted small' }, [`T${def.tier}`])];
  }

  render(): void {
    const { meta } = this.game;
    const key = JSON.stringify([this.sub.active, meta.eggs, meta.nest, meta.buyAmount, meta.passive.animals, meta.passive.chambersUnlocked, meta.upgrades, meta.bestWaveByMap, meta.unlockedTowers.length]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const values = metaValues(meta);

    // --- Kammern -------------------------------------------------------------
    const chambers = el('ul', { className: 'shop-list' });
    for (let c = 0; c < meta.passive.chambersUnlocked; c++) {
      const animal = animalInChamber(meta, c);
      if (!animal) {
        const cost = animalCost(meta);
        const buy = el('button', { className: 'btn small', disabled: meta.eggs < cost }, [`Ei ausbrüten: ${formatNumber(cost)} 🥚`]);
        buy.addEventListener('click', this.act(() => buyAnimal(meta, c)));
        chambers.append(el('li', {}, [el('span', { className: 'muted' }, [`Kammer ${c + 1}: leer`]), buy]));
        continue;
      }
      const rate = chamberEvolutionRate(meta, animal);
      const kids = childrenOf(animal.defId);
      const status =
        animal.evolutionLocked ? 'Evolution gestoppt.'
        : kids.length === 0 ? 'Endform erreicht.'
        : rate === 0 ? `Keine Nachfahren freigeschaltet (${kids.map((k) => getTowerDef(k).name).join(', ')}).`
        : `Im Schnitt eine Evolution alle ${hours(1 / rate)}.`;
      const lock = el('button', { className: animal.evolutionLocked ? 'btn small warn' : 'btn small' }, [animal.evolutionLocked ? '▶ Weiter' : '⏸ Stopp']);
      lock.addEventListener('click', this.act(() => toggleChamberLock(meta, animal.id)));
      const moves = MAPS.filter((map) => isMapUnlocked(meta, map)).map((map) => {
        const full = mapSlotsUsed(meta, map.id) >= values.mapSlots;
        const b = el('button', { className: 'btn small', disabled: full }, [`→ Revier ${map.name}`]);
        b.addEventListener('click', this.act(() => assignToMap(meta, animal.id, map.id)));
        return b;
      });
      const release = el('button', { className: 'btn small danger' }, ['Freilassen']);
      release.addEventListener('click', () => {
        void askConfirm(`${getTowerDef(animal.defId).name} freilassen? Das Tier ist dann weg.`, 'Freilassen').then((ok) => ok && this.act(() => releaseAnimal(meta, animal.id))());
      });
      chambers.append(
        el('li', {}, [
          el('span', {}, [`Kammer ${c + 1}: `, ...this.animalLabel(animal)]),
          el('span', { className: 'row-controls' }, [lock]),
          el('span', { className: 'desc' }, [status]),
          el('span', { className: 'desc actions' }, [...moves, release]),
        ]),
      );
    }
    const nextChamber = chamberUnlockCost(meta);
    if (nextChamber !== undefined) {
      const b = el('button', { className: 'btn small', disabled: meta.eggs < nextChamber }, [`${formatNumber(nextChamber)} 🥚`]);
      b.addEventListener('click', this.act(() => unlockChamber(meta)));
      chambers.append(el('li', {}, [el('span', {}, [`🔒 Kammer ${meta.passive.chambersUnlocked + 1} freischalten`]), b]));
    }

    // --- Reviere -------------------------------------------------------------
    const territories = el('ul', { className: 'shop-list' });
    for (const map of MAPS) {
      if (!isMapUnlocked(meta, map)) {
        territories.append(el('li', { className: 'artifact locked' }, [el('span', { className: 'muted' }, [`🔒 ${map.name}`])]));
        continue;
      }
      const residents = meta.passive.animals.filter((a) => a.mapId === map.id);
      territories.append(
        el('li', {}, [
          el('strong', {}, [`🗺 ${map.name}`]),
          el('span', { className: 'muted small' }, [`${residents.length}/${values.mapSlots} Plätze`]),
          el('span', { className: 'desc' }, [`Bestwelle ${bestWaveOn(meta, map.id)}: Tiere hier legen ×${(1 + bestWaveOn(meta, map.id) / 50).toFixed(2)} Eier.`]),
        ]),
      );
      for (const animal of residents) {
        const back = el('button', { className: 'btn small' }, ['↩ Kammer']);
        back.addEventListener('click', this.act(() => returnToChamber(meta, animal.id)));
        territories.append(
          el('li', {}, [
            el('span', {}, [...this.animalLabel(animal), el('span', { className: 'muted small' }, [` ${animalEggsPerHour(meta, animal).toFixed(2)} 🥚/h`])]),
            back,
          ]),
        );
      }
    }

    // --- Nest-Shop ------------------------------------------------------------
    const shop = el('ul', { className: 'shop-list' });
    for (const def of NEST_UPGRADES) {
      const level = nestUpgradeLevel(meta, def.id);
      const control = bulkButton({
        meta,
        level,
        maxLevel: def.maxLevel,
        cost: (l) => nestUpgradeCost(def, l),
        budget: meta.eggs,
        currency: '🥚',
        onBuy: this.act(() => executeBulk(meta.buyAmount, level, def.maxLevel, (l) => nestUpgradeCost(def, l), meta.eggs, () => buyNestUpgrade(meta, def.id))),
      });
      shop.append(
        el('li', {}, [
          el('span', {}, [`${def.name} `, el('span', { className: 'muted' }, [levelLabel(level, def.maxLevel)])]),
          control,
          el('span', { className: 'desc' }, [def.description]),
        ]),
      );
    }

    const content: Node[] =
      this.sub.active === 'kammern'
        ? [
            el('p', { className: 'muted small' }, [
              'Brüte Eier in Kammern aus. Die Tiere entwickeln sich in Echtzeit, auch wenn das Spiel geschlossen ist, aber nur zu freigeschalteten Arten.',
            ]),
            chambers,
          ]
        : this.sub.active === 'reviere'
          ? [
              el('p', { className: 'muted small' }, [
                `Im Revier einer Karte legen Tiere Eier: ×2 je Tier, mehr je höher deine Bestwelle dort. Zusammen ${totalEggsPerHour(meta).toFixed(2)} 🥚/h.`,
              ]),
              territories,
            ]
          : [
              el('p', { className: 'muted small' }, ['Verbesserungen für den Passiv-Modus, bezahlt mit Eiern.']),
              buyAmountBar(meta, () => this.invalidate()),
              shop,
            ];

    this.root.replaceChildren(
      el('h2', {}, [`🥚 ${formatNumber(meta.eggs)} Eier · Evolutionskammern`]),
      el('p', { className: 'muted small' }, [
        `Eier findest du sehr selten nach aktiv geschafften Wellen (ab Welle ${NEST.fromWave}: ${pct(eggChance(meta, NEST.fromWave, false))}, Bosswellen ${pct(eggChance(meta, 10, true))}) und von Tieren in Revieren. `,
        `Offline bis ${Math.round(values.offlineCapSeconds / 3600)} h, Winterruhe mit ${Math.round(values.offlinePower * 100)} % Kraft.`,
      ]),
      this.sub.element(),
      ...content,
    );
  }
}
