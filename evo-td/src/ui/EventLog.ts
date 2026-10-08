/** Kurzes Protokoll der wichtigsten Ereignisse (Evolutionen, Wellen, Verluste). */
import { describeItem } from '../data/items';
import { getTowerDef } from '../data/towers';
import { UPGRADE_DEFS } from '../data/upgrades';
import { RARITIES, TREE_DEFS } from '../data/garden';
import { CATEGORY_NAMES } from '../game/systems/AdaptationSystem';
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
    game.bus.on('itemObtained', ({ item, boughtQuality, tower }) => {
      const lucky = item.quality !== boughtQuality ? ' (Glück: aufgewertet!)' : '';
      this.push(`🎁 ${getTowerDef(tower.defId).name}: ${describeItem(item)}${lucky}`, item.quality === 'legendaer' ? 'evo' : '');
    });
    game.bus.on('runEnded', ({ report }) => {
      this.push(`🧬 Run beendet in Welle ${report.wave}: +${report.total} DNA`, 'evo');
      if (report.newMilestones > 0) this.push(`🏆 Neuer Karten-Erfolg: +${report.newMilestones * 10} % Schaden`, 'evo');
      if (report.autoBought.length > 0) this.push(`📜 Auto-Kauf: ${report.autoBought.length} Artefakt-Stufen`);
    });
    game.bus.on('robotsAdapted', ({ category, resist }) => {
      this.push(`🤖 Die Roboter passen sich an: ${CATEGORY_NAMES[category]}-Schaden −${Math.round(resist * 100)} %`, 'bad');
    });
    game.bus.on('obstacleCleared', ({ cost }) => this.push(`🪓 Hindernis geräumt (−${cost} Gold)`));
    game.bus.on('autoUpgraded', ({ kinds, mode }) => {
      const names = [...new Set(kinds)].map((k) => `${UPGRADE_DEFS[k].name} ×${kinds.filter((x) => x === k).length}`);
      this.push(`🧠 Auto-Kauf (${mode === 'gefahr' ? 'Gefahr' : 'ruhig'}): ${names.join(', ')}`);
    });
    game.bus.on('speciesUnlocked', ({ id, by }) => {
      this.push(`🔓 ${getTowerDef(id).name} freigeschaltet (${getTowerDef(by).name} hat genug XP gesammelt)`, 'evo');
    });
    game.bus.on('seedFound', ({ tree, wave }) => {
      const def = TREE_DEFS[tree];
      this.push(`🌰 Samen gefunden (Welle ${wave}): ${def.name}, ${RARITIES[def.rarity].name}`, 'evo');
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
