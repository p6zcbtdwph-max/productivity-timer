/**
 * Einstiegspunkt: verdrahtet Spiel, Loop, Renderer, UI und Speicherung.
 */
import { BALANCE } from './config/balance';
import { GameLoop } from './core/GameLoop';
import { START_MAP } from './data/map';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import { normalizeMeta, type MetaState } from './game/MetaState';
import { getTowerDef } from './data/towers';
import { formatNumber } from './ui/dom';
import { SaveManager } from './persistence/SaveManager';
import { CanvasRenderer } from './render/CanvasRenderer';
import { $ } from './ui/dom';
import { DevPanel } from './ui/DevPanel';
import { ElementLegend } from './ui/ElementLegend';
import { EventLog } from './ui/EventLog';
import { GlobalPanel } from './ui/GlobalPanel';
import { ChambersPanel } from './ui/ChambersPanel';
import { CompendiumPanel } from './ui/CompendiumPanel';
import { OfflineReport } from './ui/OfflineReport';
import { tickPassive } from './game/systems/PassiveSystem';
import { Hud } from './ui/Hud';
import { ItemsPanel } from './ui/ItemsPanel';
import { ShopPanel } from './ui/ShopPanel';
import { Tabs } from './ui/Tabs';
import { TowerPanel, type TowerAction } from './ui/TowerPanel';
import { TreeView } from './ui/TreeView';

const runSaves = new SaveManager<GameState>(BALANCE.persistence.runKey, BALANCE.persistence.runVersion);
const metaSaves = new SaveManager<MetaState>(BALANCE.persistence.metaKey, BALANCE.persistence.metaVersion);
const game = new Game(START_MAP, normalizeMeta(metaSaves.load()), runSaves.load());

const canvas = $<HTMLCanvasElement>('#game-canvas');
const renderer = new CanvasRenderer(canvas, START_MAP);
const modeHint = $('#mode-hint');

// --- UI-Zustand (nicht Teil des Spielzustands) ----------------------------

let hoveredSlot: number | undefined;
let selectedTowerId: number | undefined;
/** Laufende Mehrschritt-Aktion: Fusion oder Verlegen des ausgewählten Turms. */
let activeAction: TowerAction | undefined;

function setAction(action: TowerAction | undefined): void {
  activeAction = action;
  towerPanel.invalidate();
  if (!action) {
    modeHint.classList.add('hidden');
    return;
  }
  modeHint.textContent =
    action === 'fuse'
      ? 'Fusion: Klicke auf einen gleichen Turm (gelb markiert). Esc bricht ab.'
      : 'Verlegen: Klicke auf einen freien Bauplatz. Esc bricht ab.';
  modeHint.classList.remove('hidden');
}

let passiveTimer = 0;
const loop = new GameLoop(
  BALANCE.stepSeconds,
  (dt) => game.update(dt),
  () => {
    // Echtzeit: Kammern und Reviere einmal pro Sekunde abrechnen, solange die Seite sichtbar ist.
    const now = Date.now();
    game.meta.lastSeen = now;
    renderer.muted = game.simulating;
    if (now - passiveTimer >= 1000) {
      passiveTimer = now;
      const report = tickPassive(game.meta, now);
      for (const e of report.evolutions) eventLog.push(`🥚 Kammer: ${getTowerDef(e.from).name} → ${getTowerDef(e.to).name}`, 'evo');
      if (report.evolutions.length > 0) {
        chambersPanel.invalidate();
        game.invalidateStats();
      }
    }
    const highlightTowerIds = activeAction === 'fuse' && selectedTowerId !== undefined
      ? game.fusionCandidatesFor(selectedTowerId).map((t) => t.id)
      : [];
    renderer.render(game, {
      hoveredSlot,
      selectedTowerId,
      highlightTowerIds,
      highlightFreeSlots: activeAction === 'relocate',
    });
    hud.render();
    switch (tabs.active) {
      case 'tower':
        towerPanel.render(selectedTowerId, activeAction);
        break;
      case 'shop':
        shopPanel.render();
        break;
      case 'items':
        itemsPanel.render();
        break;
      case 'tree':
        treeView.render();
        break;
      case 'global':
        globalPanel.render();
        break;
      case 'chambers':
        chambersPanel.render();
        break;
      case 'compendium':
        compendiumPanel.render();
        break;
    }
  },
);

const afterNewRun = (): void => {
  runSaves.clear();
  metaSaves.save(game.meta);
  selectedTowerId = undefined;
  setAction(undefined);
  eventLog.clear();
  treeView.invalidate();
  globalPanel.invalidate();
  $('#game-over').classList.add('hidden');
  loop.paused = false;
};

/** Run abbrechen ohne DNA. */
const resetGame = (): void => {
  game.reset();
  afterNewRun();
};

/** Run abschließen: DNA kassieren, neuen Run starten. */
const endRun = (): void => {
  game.endRun();
  afterNewRun();
};

/** Alles löschen (Entwickler): Run und globaler Fortschritt. */
const wipeAll = (): void => {
  runSaves.clear();
  metaSaves.clear();
  location.reload();
};

const tabs = new Tabs();
const hud = new Hud(game, loop, resetGame);
const towerPanel = new TowerPanel(game, {
  onAction: (action) => setAction(activeAction === action ? undefined : action),
});
const shopPanel = new ShopPanel(game);
const itemsPanel = new ItemsPanel(game);
const treeView = new TreeView(game);
const globalPanel = new GlobalPanel(game, endRun);
const chambersPanel = new ChambersPanel(game);
const compendiumPanel = new CompendiumPanel(game);
const eventLog = new EventLog(game);
new ElementLegend();
new DevPanel(game, loop, () => {
  game.invalidateStats();
  towerPanel.invalidate();
  treeView.invalidate();
  globalPanel.invalidate();
}, wipeAll);

// --- Schwebende Texte (rein optisch) -----------------------------------------

game.bus.on('enemyKilled', ({ enemy, reward }) => {
  if (enemy.defId === 'boss' || reward >= game.towerCost() * 0.25) {
    renderer.float(enemy.x, enemy.y, `+${formatNumber(reward)}`, '#ffd54f');
  }
});
game.bus.on('towerEvolved', ({ tower, to }) => renderer.float(tower.x, tower.y - 0.4, getTowerDef(to).name, '#9be7a0', 2));
game.bus.on('towerFused', ({ tower }) => renderer.float(tower.x, tower.y - 0.4, `★${tower.prestige}`, '#ffffff', 2));
game.bus.on('towerLevelUp', ({ tower }) => {
  if (tower.level % 10 === 0) renderer.float(tower.x, tower.y - 0.4, `Lvl ${tower.level}`, '#80deea', 1.5);
});
game.bus.on('enemyRevived', ({ enemy }) => renderer.float(enemy.x, enemy.y, 'Titan!', '#ffffff'));
game.bus.on('enemyLeaked', ({ enemy }) => renderer.float(enemy.x - 0.5, enemy.y, enemy.defId === 'boss' ? '-3 ❤' : '-1 ❤', '#ff5252', 1.5));

// --- Eingabe ----------------------------------------------------------------

canvas.addEventListener('mousemove', (e) => {
  hoveredSlot = renderer.slotAt(e.clientX, e.clientY);
});
canvas.addEventListener('mouseleave', () => {
  hoveredSlot = undefined;
});
canvas.addEventListener('click', (e) => {
  const slot = renderer.slotAt(e.clientX, e.clientY);
  if (slot === undefined) {
    selectedTowerId = undefined;
    setAction(undefined);
    return;
  }
  const existing = game.state.towers.find((t) => t.slot === slot);

  if (activeAction === 'fuse' && selectedTowerId !== undefined) {
    if (existing && game.fuse(selectedTowerId, existing.id)) setAction(undefined);
    return;
  }
  if (activeAction === 'relocate' && selectedTowerId !== undefined) {
    if (!existing && game.relocate(selectedTowerId, slot)) setAction(undefined);
    return;
  }

  if (existing) {
    selectedTowerId = existing.id;
    tabs.show('tower');
    return;
  }
  const built = game.build(slot);
  if (built) selectedTowerId = built.id;
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault();
    loop.paused = !loop.paused;
  }
  if (e.key === 'Escape') setAction(undefined);
  if (selectedTowerId === undefined) return;
  if (e.key === 'l') game.toggleEvolutionLock(selectedTowerId);
  if (e.key === 'f') setAction(activeAction === 'fuse' ? undefined : 'fuse');
  if (e.key === 'v') setAction(activeAction === 'relocate' ? undefined : 'relocate');
});

// --- Game Over --------------------------------------------------------------

game.bus.on('gameOver', ({ wave }) => {
  const report = game.dnaPreview();
  $('#game-over-text').textContent = `Du hast ${wave} Wellen überstanden, ${game.state.stats.evolutions} Evolutionen und ${game.state.stats.fusions} Fusionen erlebt und ${game.state.stats.kills} Roboter zerlegt.`;
  $('#game-over-dna').textContent =
    report.fromNewWaves > 0
      ? `+${report.total} DNA (davon ${report.fromNewWaves} für neue Bestwellen über ${report.bestWaveBefore}).`
      : `+${report.total} DNA. Keine neue Bestwelle (${report.bestWaveBefore}), daher nur der kleine Wiederholungs-Anteil.`;
  if (report.newMilestones > 0) {
    $('#game-over-dna').textContent += ` 🏆 ${report.newMilestones} neuer Karten-Erfolg: +${report.newMilestones * 10} % Schaden für immer.`;
  }
  $('#game-over').classList.remove('hidden');
});
$('#game-over-restart').addEventListener('click', endRun);
$('#game-over-shop').addEventListener('click', () => {
  endRun();
  tabs.show('global');
});
game.bus.on('towerFused', ({ consumedId }) => {
  if (selectedTowerId === consumedId) selectedTowerId = undefined;
});

// --- Speichern --------------------------------------------------------------

const saveAll = (): void => {
  if (!game.state.gameOver) runSaves.save(game.state);
  metaSaves.save(game.meta);
};
setInterval(saveAll, BALANCE.persistence.autosaveSeconds * 1000);
window.addEventListener('beforeunload', saveAll);

// --- Winterruhe: Abwesenheit beim Start und beim Zurückkehren in den Tab ------

const offlineReport = new OfflineReport(game, loop, () => {
  towerPanel.invalidate();
  chambersPanel.invalidate();
  globalPanel.invalidate();
});
const startedAwayFrom = game.meta.lastSeen;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void offlineReport.resume(game.meta.lastSeen);
  else saveAll();
});

loop.start();
void offlineReport.resume(startedAwayFrom);

// Für Tests und Debugging in der Browser-Konsole: window.evoTd.game
(window as unknown as { evoTd: unknown }).evoTd = { game, loop };
