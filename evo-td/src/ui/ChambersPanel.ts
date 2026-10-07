/** Evolutionskammern und Reviere (Passiv-Modus). */
import { MAPS } from '../data/map';
import { getTowerDef } from '../data/towers';
import type { Game } from '../game/Game';
import type { PassiveAnimal } from '../game/MetaState';
import { bestWaveOn, metaValues } from '../game/systems/MetaSystem';
import {
  animalCost,
  animalDnaPerHour,
  animalInChamber,
  assignToMap,
  buyAnimal,
  chamberEvolutionRate,
  chamberUnlockCost,
  mapSlotsUsed,
  releaseAnimal,
  returnToChamber,
  toggleChamberLock,
  totalDnaPerHour,
  unlockChamber,
} from '../game/systems/PassiveSystem';
import { childrenOf } from '../data/towers';
import { $, el, formatNumber } from './dom';

function hours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(h < 10 ? 1 : 0)} h`;
}

export class ChambersPanel {
  private readonly root = $('#chambers-panel');
  private lastKey = '';

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
    const key = JSON.stringify([meta.dna, meta.passive.animals, meta.passive.chambersUnlocked, meta.upgrades, meta.bestWaveByMap, meta.unlockedTowers.length]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const values = metaValues(meta);

    // --- Kammern -------------------------------------------------------------
    const chambers = el('ul', { className: 'shop-list' });
    for (let c = 0; c < meta.passive.chambersUnlocked; c++) {
      const animal = animalInChamber(meta, c);
      if (!animal) {
        const cost = animalCost(meta);
        const buy = el('button', { className: 'btn small', disabled: meta.dna < cost }, [`Einzeller kaufen: ${formatNumber(cost)} 🧬`]);
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
      const moves = MAPS.map((map) => {
        const full = mapSlotsUsed(meta, map.id) >= values.mapSlots;
        const b = el('button', { className: 'btn small', disabled: full }, [`→ Revier ${map.name}`]);
        b.addEventListener('click', this.act(() => assignToMap(meta, animal.id, map.id)));
        return b;
      });
      const release = el('button', { className: 'btn small danger' }, ['Freilassen']);
      release.addEventListener('click', () => {
        if (confirm(`${getTowerDef(animal.defId).name} freilassen? Das Tier ist dann weg.`)) this.act(() => releaseAnimal(meta, animal.id))();
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
      const b = el('button', { className: 'btn small', disabled: meta.dna < nextChamber }, [`${formatNumber(nextChamber)} 🧬`]);
      b.addEventListener('click', this.act(() => unlockChamber(meta)));
      chambers.append(el('li', {}, [el('span', {}, [`🔒 Kammer ${meta.passive.chambersUnlocked + 1} freischalten`]), b]));
    }

    // --- Reviere -------------------------------------------------------------
    const territories = el('ul', { className: 'shop-list' });
    for (const map of MAPS) {
      const residents = meta.passive.animals.filter((a) => a.mapId === map.id);
      territories.append(
        el('li', {}, [
          el('strong', {}, [`🗺 ${map.name}`]),
          el('span', { className: 'muted small' }, [`${residents.length}/${values.mapSlots} Plätze`]),
          el('span', { className: 'desc' }, [`Bestwelle ${bestWaveOn(meta, map.id)}: Tiere hier bringen ×${(1 + bestWaveOn(meta, map.id) / 50).toFixed(2)} DNA.`]),
        ]),
      );
      for (const animal of residents) {
        const back = el('button', { className: 'btn small' }, ['↩ Kammer']);
        back.addEventListener('click', this.act(() => returnToChamber(meta, animal.id)));
        territories.append(
          el('li', {}, [
            el('span', {}, [...this.animalLabel(animal), el('span', { className: 'muted small' }, [` ${animalDnaPerHour(meta, animal).toFixed(1)} DNA/h`])]),
            back,
          ]),
        );
      }
    }

    this.root.replaceChildren(
      el('h2', {}, [`🥚 Evolutionskammern`]),
      el('p', { className: 'muted small' }, [
        `🧬 ${formatNumber(meta.dna)} DNA · ${totalDnaPerHour(meta).toFixed(1)} DNA/h aus Revieren · `,
        `offline bis ${Math.round(values.offlineCapSeconds / 3600)} h, Winterruhe mit ${Math.round(values.offlinePower * 100)} % Kraft.`,
      ]),
      el('p', { className: 'muted small' }, [
        'Tiere in Kammern entwickeln sich in Echtzeit, auch wenn das Spiel geschlossen ist, aber nur zu freigeschalteten Arten. Im Revier einer Karte bringen sie DNA: ×2 je Tier, mehr je höher deine Bestwelle dort.',
      ]),
      chambers,
      el('h2', { style: 'margin-top:14px' }, ['Reviere']),
      territories,
    );
  }
}
