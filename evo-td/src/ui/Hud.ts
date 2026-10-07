/** Kopfzeile: Ressourcen, Welle, Geschwindigkeit, Idle-Schalter. */
import { tierForWave } from '../config/balance';
import type { Game } from '../game/Game';
import type { GameLoop } from '../core/GameLoop';
import { $, formatNumber } from './dom';

export class Hud {
  private readonly gold = $('#hud-gold');
  private readonly lives = $('#hud-lives');
  private readonly wave = $('#hud-wave');
  private readonly countdown = $('#hud-countdown');
  private readonly cost = $('#hud-cost');
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
      if (confirm('Spielstand wirklich löschen und neu starten?')) onReset();
    });
  }

  render(): void {
    const { state } = this.game;
    this.gold.textContent = formatNumber(state.gold);
    this.lives.textContent = String(state.lives);
    this.wave.textContent = state.wave.current === 0 ? '–' : `${state.wave.current} (Tier ${tierForWave(state.wave.current)})`;
    this.countdown.textContent = `${Math.max(0, state.wave.countdown).toFixed(0)}s`;
    this.cost.textContent = formatNumber(this.game.towerCost());
    this.autoBuild.checked = state.autoBuild;
    for (const button of this.speedButtons) {
      button.classList.toggle('active', !this.loop.paused && Number(button.dataset['speed']) === this.loop.speed);
    }
    this.pauseButton.classList.toggle('active', this.loop.paused);
    this.pauseButton.textContent = this.loop.paused ? '▶' : '⏸';
  }
}
