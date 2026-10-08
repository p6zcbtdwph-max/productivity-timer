/** Kopfzeile: Ressourcen, Welle, Geschwindigkeit, Idle-Schalter. */
import { tierForWave } from '../config/balance';
import type { Game } from '../game/Game';
import type { GameLoop } from '../core/GameLoop';
import { $, formatNumber } from './dom';
import { askConfirm } from './Confirm';
import { DAMAGE_CATEGORIES } from '../game/GameState';
import { CATEGORY_NAMES } from '../game/systems/AdaptationSystem';

export class Hud {
  private readonly gold = $('#hud-gold');
  private readonly lives = $('#hud-lives');
  private readonly wave = $('#hud-wave');
  private readonly countdown = $('#hud-countdown');
  private readonly cost = $('#hud-cost');
  private readonly costBox = $('#hud-cost-box');
  private readonly relocates = $('#hud-relocates');
  private readonly dna = $('#hud-dna');
  private readonly mapName = $('#hud-map');
  private readonly resin = $('#hud-resin');
  private readonly adapt = $('#hud-adapt');
  private readonly autoBuild = $<HTMLInputElement>('#hud-autobuild');
  private readonly speedButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-speed]'));
  private readonly pauseButton = $<HTMLButtonElement>('#hud-pause');

  constructor(
    private readonly game: Game,
    private readonly loop: GameLoop,
    onReset: () => void,
  ) {
    this.autoBuild.addEventListener('change', () => game.setAutoBuild(this.autoBuild.checked));
    for (const button of this.speedButtons) {
      button.addEventListener('click', () => {
        loop.speed = Number(button.dataset['speed']);
        loop.paused = false;
      });
    }
    this.pauseButton.addEventListener('click', () => {
      loop.paused = !loop.paused;
    });
    $('#hud-reset').addEventListener('click', () => {
      void askConfirm('Run wirklich abbrechen? Es gibt dafür keine DNA.', 'Run abbrechen').then((ok) => ok && onReset());
    });
  }

  render(): void {
    const { state } = this.game;
    this.gold.textContent = formatNumber(state.gold);
    this.lives.textContent = String(state.lives);
    this.wave.textContent = state.wave.current === 0 ? '–' : `${state.wave.current} (Tier ${tierForWave(state.wave.current)})`;
    this.countdown.textContent = `${Math.max(0, state.wave.countdown).toFixed(0)}s`;
    const towerCost = this.game.towerCost();
    this.cost.textContent = formatNumber(towerCost);
    this.costBox.classList.toggle('affordable', state.gold >= towerCost);
    this.costBox.classList.toggle('expensive', state.gold < towerCost);
    this.relocates.textContent = String(this.game.relocateCharges());
    this.dna.textContent = formatNumber(this.game.meta.dna);
    this.mapName.textContent = this.game.map.name;
    this.resin.textContent = formatNumber(this.game.meta.garden.resin);
    const mode = this.game.map.adaptive;
    this.adapt.classList.toggle('hidden', !mode);
    if (mode) {
      const resist = state.adaptation?.resist;
      const parts = DAMAGE_CATEGORIES.filter((c) => (resist?.[c] ?? 0) > 0).map((c) => `${CATEGORY_NAMES[c]} −${Math.round((resist?.[c] ?? 0) * 100)} %`);
      const next = mode.every - (state.wave.current % mode.every);
      this.adapt.textContent = `🤖 ${parts.length ? parts.join(', ') : 'keine Resistenz'} · Anpassung in ${next} W.`;
    }
    this.autoBuild.checked = state.autoBuild;
    for (const button of this.speedButtons) {
      button.classList.toggle('active', !this.loop.paused && Number(button.dataset['speed']) === this.loop.speed);
    }
    this.pauseButton.classList.toggle('active', this.loop.paused);
    this.pauseButton.textContent = this.loop.paused ? '▶' : '⏸';
  }
}
