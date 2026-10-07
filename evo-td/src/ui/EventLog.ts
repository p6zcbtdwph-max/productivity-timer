/** Kurzes Protokoll der wichtigsten Ereignisse (Evolutionen, Wellen, Verluste). */
import { describeItem, QUALITY_DEFS } from '../data/items';
import { getTowerDef } from '../data/towers';
import { UPGRADE_DEFS } from '../data/upgrades';
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
    game.bus.on('towerFused', ({ tower }) => {
      this.push(`⭐ Fusion: ${getTowerDef(tower.defId).name} ist jetzt Prestige ${tower.prestige}`, 'evo');
    });
    game.bus.on('towerRelocated', ({ tower }) => this.push(`🚚 ${getTowerDef(tower.defId).name} verlegt`));
    game.bus.on('upgradeBought', ({ kind, level }) => this.push(`Upgrade ${UPGRADE_DEFS[kind].name} auf Stufe ${level}`));
    game.bus.on('itemObtained', ({ item, boughtQuality }) => {
      const lucky = item.quality !== boughtQuality ? ' (Glück: aufgewertet!)' : '';
      this.push(`🎁 ${describeItem(item)}${lucky}`, item.quality === 'legendaer' ? 'evo' : '');
      void QUALITY_DEFS;
    });
    game.bus.on('runEnded', ({ report }) => {
      this.push(`🧬 Run beendet in Welle ${report.wave}: +${report.total} DNA`, 'evo');
      if (report.newMilestones > 0) this.push(`🏆 Neuer Karten-Erfolg: +${report.newMilestones * 10} % Schaden`, 'evo');
      if (report.autoBought.length > 0) this.push(`📜 Auto-Kauf: ${report.autoBought.length} Artefakt-Stufen`);
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
