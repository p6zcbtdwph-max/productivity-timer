/**
 * Entwickler-Panel für Tests (Taste D). Greift bewusst direkt in den Zustand
 * ein; nicht Teil des Spieldesigns.
 */
import { BALANCE } from '../config/balance';
import { ARTIFACT_ORDER } from '../data/meta';
import { MAPS } from '../data/map';
import { Rng } from '../core/Rng';
import { rollTree, tickGarden } from '../game/systems/GardenSystem';
import { BASE_TOWER_IDS, childrenOf, getTowerDef, type TowerId } from '../data/towers';
import type { GameLoop } from '../core/GameLoop';
import type { Game } from '../game/Game';
import { $, el } from './dom';

export class DevPanel {
  private readonly root = $('#dev-panel');

  constructor(
    private readonly game: Game,
    private readonly loop: GameLoop,
    private readonly onChange: () => void,
    private readonly onWipe: () => void,
  ) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' && !(e.target instanceof HTMLInputElement)) this.toggle();
    });
    this.build();
  }

  toggle(): void {
    this.root.classList.toggle('hidden');
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const b = el('button', { className: 'btn small' }, [label]);
    b.addEventListener('click', () => {
      action();
      this.onChange();
    });
    return b;
  }

  private build(): void {
    const g = this.game;
    const unlockTowersUpTo = (maxTier: number): void => {
      const stack: TowerId[] = [...BASE_TOWER_IDS];
      while (stack.length) {
        const id = stack.pop() as TowerId;
        if (getTowerDef(id).tier > maxTier) continue;
        if (!g.meta.unlockedTowers.includes(id)) g.meta.unlockedTowers.push(id);
        if (getTowerDef(id).tier >= 4) stack.push(...childrenOf(id));
      }
    };

    this.root.replaceChildren(
      el('h2', {}, ['🛠 Entwickler (D)']),
      el('div', { className: 'actions' }, [
        this.button('+10K Gold', () => (g.state.gold += 10_000)),
        this.button('Gold ×100', () => (g.state.gold = Math.max(1000, g.state.gold) * 100)),
        this.button('+1K DNA', () => (g.meta.dna += 1000)),
        this.button('+100K DNA', () => (g.meta.dna += 100_000)),
      ]),
      el('div', { className: 'actions' }, [
        this.button('+10 Wellen', () => g.devSkipWaves(10)),
        this.button('+50 Wellen', () => g.devSkipWaves(50)),
        this.button('+10 Leben', () => (g.state.lives += 10)),
        this.button('Alle Türme Lvl +10', () => g.state.towers.forEach((t) => (t.level += 10))),
      ]),
      el('div', { className: 'actions' }, [
        this.button('Arten bis T4 frei', () => unlockTowersUpTo(4)),
        this.button('Arten bis T6 frei', () => unlockTowersUpTo(6)),
        this.button('Alle Artefakte', () => {
          for (const a of ARTIFACT_ORDER) if (g.meta.upgrades[a.id] === 0) g.meta.upgrades[a.id] = 1;
        }),
        this.button('+5 Samen', () => {
          const rng = new Rng(Date.now() >>> 0);
          for (let i = 0; i < 5; i++) {
            const tree = rollTree(rng);
            g.meta.garden.seeds[tree] = (g.meta.garden.seeds[tree] ?? 0) + 1;
          }
        }),
        this.button('Garten +24 h', () => tickGarden(g.meta, 24 * 3600)),
        this.button('Alle Karten frei', () => {
          for (const map of MAPS) {
            if (map.unlock) g.meta.bestWaveByMap[map.unlock.mapId] = Math.max(g.meta.bestWaveByMap[map.unlock.mapId] ?? 0, map.unlock.wave);
          }
        }),
        this.button('Kompendium füllen', () => {
          for (const id of BASE_TOWER_IDS) g.meta.compendium[id] = { maxLevel: 50, maxPrestige: 1 };
        }),
        this.button('Bestwelle +50', () => {
          g.meta.bestWaveByMap[g.map.id] = (g.meta.bestWaveByMap[g.map.id] ?? 0) + 50;
        }),
      ]),
      el('div', { className: 'actions' }, [
        this.button('8×', () => {
          this.loop.speed = 8;
          this.loop.paused = false;
        }),
        this.button('16×', () => {
          this.loop.speed = 16;
          this.loop.paused = false;
        }),
        this.button('Zeit +1 h (Winterruhe testen)', () => {
          g.meta.lastSeen -= 3600_000;
          g.meta.passive.lastTick -= 3600_000;
          document.dispatchEvent(new Event('visibilitychange'));
        }),
        this.button('Alles löschen', () => {
          if (confirm('Run UND globalen Fortschritt (DNA, Artefakte, Freischaltungen) löschen?')) this.onWipe();
        }),
      ]),
      el('p', { className: 'muted small' }, [`Speicher-Keys: ${BALANCE.persistence.runKey}, ${BALANCE.persistence.metaKey}`]),
    );
  }
}
