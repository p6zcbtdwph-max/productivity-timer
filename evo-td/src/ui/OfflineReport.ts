/**
 * Winterruhe beim Zurückkommen: Kammern und Reviere abrechnen, dann den Run
 * mit verminderter Kraft nachrechnen und einen Bericht zeigen.
 */
import { BALANCE } from '../config/balance';
import type { GameLoop } from '../core/GameLoop';
import { getTowerDef } from '../data/towers';
import type { Game } from '../game/Game';
import { simulateOfflineRun, type OfflineRunReport } from '../game/OfflineRun';
import { metaValues } from '../game/systems/MetaSystem';
import { tickPassive, type PassiveReport } from '../game/systems/PassiveSystem';
import { $, el, formatNumber } from './dom';

function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export class OfflineReport {
  private readonly root = $('#offline-report');
  private readonly body = $('#offline-body');
  private readonly bar = $('#offline-bar');
  private readonly skip = $<HTMLButtonElement>('#offline-skip');
  private readonly ok = $<HTMLButtonElement>('#offline-ok');
  private running = false;
  private abort = false;

  constructor(
    private readonly game: Game,
    private readonly loop: GameLoop,
    private readonly onDone: () => void,
  ) {
    this.skip.addEventListener('click', () => {
      this.abort = true;
    });
    this.ok.addEventListener('click', () => {
      this.root.classList.add('hidden');
      this.loop.paused = false;
      this.onDone();
    });
  }

  /** Abwesenheit seit `sinceMs` abrechnen. */
  async resume(sinceMs: number): Promise<void> {
    if (this.running) return;
    const now = Date.now();
    const away = Math.max(0, (now - sinceMs) / 1000);
    const passive = tickPassive(this.game.meta, now);
    this.game.meta.lastSeen = now;
    if (away < BALANCE.passive.reportAfterSeconds) return;

    this.running = true;
    this.abort = false;
    const wasPaused = this.loop.paused;
    this.loop.paused = true;
    this.root.classList.remove('hidden');
    this.ok.classList.add('hidden');
    this.skip.classList.remove('hidden');

    const cap = metaValues(this.game.meta).offlineCapSeconds;
    const seconds = Math.min(away, cap);
    this.show(away, cap, passive, undefined);
    const run = await simulateOfflineRun(this.game, seconds, {
      onProgress: (fraction, partial) => {
        this.bar.style.width = `${Math.round(fraction * 100)}%`;
        this.show(away, cap, passive, partial, true);
      },
      shouldAbort: () => this.abort,
    });
    this.bar.style.width = '100%';
    this.show(away, cap, passive, run);
    this.skip.classList.add('hidden');
    this.ok.classList.remove('hidden');
    this.running = false;
    if (wasPaused) this.loop.paused = true;
  }

  private show(away: number, cap: number, passive: PassiveReport, run: OfflineRunReport | undefined, inProgress = false): void {
    const items: (Node | string)[] = [];
    items.push(el('p', { className: 'muted' }, [`${duration(away)} abwesend${away > cap ? `, angerechnet ${duration(cap)} (Obergrenze)` : ''}.`]));

    const list = el('ul');
    if (passive.dna > 0) list.append(el('li', {}, [`🗺 Reviere: +${formatNumber(passive.dna)} DNA`]));
    for (const e of passive.evolutions) {
      list.append(el('li', {}, [`🥚 Kammer: ${getTowerDef(e.from).name} → ${getTowerDef(e.to).name}`]));
    }
    if (run && this.game.state.towers.length > 0) {
      list.append(
        el('li', {}, [
          `❄️ Winterruhe (${Math.round(run.power * 100)} % Kraft): Welle ${run.waveBefore} → ${run.waveAfter}`,
          inProgress ? ' …' : '',
        ]),
      );
      if (run.goldGained > 0) list.append(el('li', {}, [`💰 +${formatNumber(run.goldGained)} Gold, ${formatNumber(run.kills)} Roboter zerlegt`]));
      if (run.evolutions > 0) list.append(el('li', {}, [`🧬 ${run.evolutions} Evolutionen im Run`]));
      if (run.fusions > 0) list.append(el('li', {}, [`⭐ ${run.fusions} Fusionen`]));
      if (!inProgress && run.stoppedAtWall) list.append(el('li', {}, [`🧱 Angehalten vor Welle ${run.waveAfter}: dort kamen die Roboter durch. Ab jetzt kämpfst du wieder mit voller Kraft.`]));
      if (!inProgress && run.aborted) list.append(el('li', {}, ['⏭ Rest übersprungen.']));
    }
    if (list.children.length === 0) list.append(el('li', {}, ['Nichts Neues. Kauf Tiere für die Evolutionskammern oder baue Türme, damit die Zeit für dich arbeitet.']));
    items.push(list);
    this.body.replaceChildren(...items);
  }
}
