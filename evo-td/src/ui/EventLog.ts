/** Kurzes Protokoll der wichtigsten Ereignisse (Evolutionen, Wellen, Verluste). */
import { getTowerDef } from '../data/towers';
import type { Game } from '../game/Game';
import { $, el } from './dom';

const MAX_ENTRIES = 12;

export class EventLog {
  private readonly root = $('#event-log');

  constructor(game: Game) {
    game.bus.on('towerEvolved', ({ from, to }) => {
      this.push(`🧬 ${getTowerDef(from).name} → ${getTowerDef(to).name}`, 'evo');
    });
    game.bus.on('waveStarted', ({ wave, tier }) => {
      this.push(`Welle ${wave} startet (Tier ${tier}, Gegner ×${2 ** tier})`);
    });
    game.bus.on('waveCleared', ({ wave, bonus }) => {
      this.push(`Welle ${wave} geschafft, +${bonus} Gold`);
    });
    game.bus.on('enemyRevived', () => this.push('Titan-Kern: ein Roboter steht wieder auf.', 'bad'));
    game.bus.on('enemyLeaked', () => this.push('Ein Roboter ist durchgebrochen!', 'bad'));
    game.bus.on('gameOver', ({ wave }) => this.push(`Game Over in Welle ${wave}.`, 'bad'));
  }

  push(text: string, className = ''): void {
    this.root.prepend(el('li', { className }, [text]));
    while (this.root.children.length > MAX_ENTRIES) this.root.lastElementChild?.remove();
  }

  clear(): void {
    this.root.replaceChildren();
  }
}
