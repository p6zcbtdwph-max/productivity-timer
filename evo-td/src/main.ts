/**
 * Einstiegspunkt: verdrahtet Spiel, Loop, Renderer, UI und Speicherung.
 */
import { BALANCE } from './config/balance';
import { GameLoop } from './core/GameLoop';
import { START_MAP } from './data/map';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import { createInitialMeta, type MetaState } from './game/MetaState';
import { SaveManager } from './persistence/SaveManager';
import { CanvasRenderer } from './render/CanvasRenderer';
import { $ } from './ui/dom';
import { ElementLegend } from './ui/ElementLegend';
import { EventLog } from './ui/EventLog';
import { GlobalPanel } from './ui/GlobalPanel';
import { Hud } from './ui/Hud';
import { ItemsPanel } from './ui/ItemsPanel';
import { ShopPanel } from './ui/ShopPanel';
import { Tabs } from './ui/Tabs';
import { TowerPanel, type TowerAction } from './ui/TowerPanel';
import { TreeView } from './ui/TreeView';

const runSaves = new SaveManager<GameState>(BALANCE.persistence.runKey, BALANCE.persistence.runVersion);
const metaSaves = new SaveManager<MetaState>(BALANCE.persistence.metaKey, BALANCE.persistence.metaVersion);
const game = new Game(START_MAP, metaSaves.load() ?? createInitialMeta(), runSaves.load());

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

const loop = new GameLoop(
  BALANCE.stepSeconds,
  (dt) => game.update(dt),
  () => {
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

const tabs = new Tabs();
const hud = new Hud(game, loop, resetGame);
const towerPanel = new TowerPanel(game, {
  onAction: (action) => setAction(activeAction === action ? undefined : action),
});
const shopPanel = new ShopPanel(game);
const itemsPanel = new ItemsPanel(game);
const treeView = new TreeView(game);
const globalPanel = new GlobalPanel(game, endRun);
const eventLog = new EventLog(game);
new ElementLegend();

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

loop.start();
