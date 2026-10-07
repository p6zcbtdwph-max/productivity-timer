/**
 * Winterruhe: rechnet nach einer Abwesenheit den laufenden Run nach.
 *
 * - Die Türme kämpfen mit verminderter Kraft (Artefakt "Winterfell" hebt sie an).
 * - Bricht ein Gegner durch, wird auf den Stand zu Beginn dieser Welle
 *   zurückgesetzt und angehalten: offline stirbt der Run nie, er wartet an der Wand.
 * - Gerechnet wird mit gröberem Zeitschritt; Leerlauf zwischen Wellen wird übersprungen.
 *   Die Rechnung läuft in Häppchen, damit die Seite bedienbar bleibt.
 */
import type { Game } from './Game';
import type { GameState } from './GameState';
import { metaValues } from './systems/MetaSystem';

const COMBAT_DT = 0.1;
const IDLE_DT = 2;
const STEPS_PER_CHUNK = 2000;

export interface OfflineRunReport {
  requestedSeconds: number;
  simulatedSeconds: number;
  power: number;
  waveBefore: number;
  waveAfter: number;
  stoppedAtWall: boolean;
  goldGained: number;
  kills: number;
  evolutions: number;
  fusions: number;
  aborted: boolean;
}

export interface OfflineRunOptions {
  onProgress?: (fraction: number, report: OfflineRunReport) => void;
  shouldAbort?: () => boolean;
  /** Für Tests: synchron ohne Häppchen. */
  sync?: boolean;
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

export async function simulateOfflineRun(game: Game, seconds: number, options: OfflineRunOptions = {}): Promise<OfflineRunReport> {
  const state = game.state;
  const power = metaValues(game.meta).offlinePower;
  const report: OfflineRunReport = {
    requestedSeconds: seconds,
    simulatedSeconds: 0,
    power,
    waveBefore: state.wave.current,
    waveAfter: state.wave.current,
    stoppedAtWall: false,
    goldGained: 0,
    kills: 0,
    evolutions: 0,
    fusions: 0,
    aborted: false,
  };
  if (seconds <= 0 || state.gameOver || state.towers.length === 0) return report;

  const goldEarnedBefore = state.stats.goldEarned;
  const killsBefore = state.stats.kills;
  const evolutionsBefore = state.stats.evolutions;
  const fusionsBefore = state.stats.fusions;

  let snapshot = clone(game.state);
  let leaked = false;
  const offWave = game.bus.on('waveStarted', () => {
    if (!leaked) snapshot = clone(game.state);
  });
  const offLeak = game.bus.on('enemyLeaked', () => {
    leaked = true;
  });

  game.setPower(power);
  game.simulating = true;
  try {
    let steps = 0;
    while (report.simulatedSeconds < seconds && !leaked) {
      const s = game.state;
      const idle = s.enemies.length === 0 && s.projectiles.length === 0 && s.wave.spawnQueue.length === 0;
      const remaining = seconds - report.simulatedSeconds;
      const dt = idle ? Math.min(IDLE_DT, Math.max(COMBAT_DT, s.wave.countdown + 0.001), remaining) : Math.min(COMBAT_DT, remaining);
      game.update(dt);
      report.simulatedSeconds += dt;
      if (++steps % STEPS_PER_CHUNK === 0 && !options.sync) {
        options.onProgress?.(report.simulatedSeconds / seconds, report);
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (options.shouldAbort?.()) {
          report.aborted = true;
          break;
        }
      }
    }
  } finally {
    offWave();
    offLeak();
    game.setPower(1);
    game.simulating = false;
  }

  if (leaked) {
    // Zurück an den Anfang der Welle, an der die Wand steht.
    game.load(snapshot);
    report.stoppedAtWall = true;
  }
  const s = game.state;
  report.waveAfter = s.wave.current;
  report.goldGained = s.stats.goldEarned - goldEarnedBefore;
  report.kills = s.stats.kills - killsBefore;
  report.evolutions = s.stats.evolutions - evolutionsBefore;
  report.fusions = s.stats.fusions - fusionsBefore;
  options.onProgress?.(1, report);
  return report;
}
