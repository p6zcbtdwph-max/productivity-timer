/**
 * Einstiegspunkt: verdrahtet Spiel, Loop, Renderer, UI und Speicherung.
 */
import { BALANCE } from './config/balance';
import { GameLoop } from './core/GameLoop';
import { START_MAP } from './data/map';
import { Game } from './game/Game';
import { SaveManager } from './persistence/SaveManager';
import { CanvasRenderer } from './render/CanvasRenderer';
import { $ } from './ui/dom';
import { ElementLegend } from './ui/ElementLegend';
import { EventLog } from './ui/EventLog';
import { Hud } from './ui/Hud';
import { TowerPanel } from './ui/TowerPanel';
import { TreeView } from './ui/TreeView';

const saves = new SaveManager();
const game = new Game(START_MAP, saves.load());

const canvas = $<HTMLCanvasElement>('#game-canvas');
const renderer = new CanvasRenderer(canvas, START_MAP);

let hoveredSlot: number | undefined;
let selectedTowerId: number | undefined;

const loop = new GameLoop(
  BALANCE.stepSeconds,
  (dt) => game.update(dt),
  () => {
    renderer.render(game, { hoveredSlot, selectedTowerId });
    hud.render();
    towerPanel.render(selectedTowerId);
    treeView.render();
  },
);

const resetGame = (): void => {
  saves.clear();
  game.reset();
  selectedTowerId = undefined;
  eventLog.clear();
  $('#game-over').classList.add('hidden');
  loop.paused = false;
};

const hud = new Hud(game, loop, resetGame);
const towerPanel = new TowerPanel(game);
const treeView = new TreeView(game);
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
    return;
  }
  const existing = game.state.towers.find((t) => t.slot === slot);
  if (existing) {
    selectedTowerId = existing.id;
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
  if (e.key === 'l' && selectedTowerId !== undefined) game.toggleEvolutionLock(selectedTowerId);
});

// --- Game Over --------------------------------------------------------------

game.bus.on('gameOver', ({ wave }) => {
  $('#game-over-text').textContent = `Du hast ${wave} Wellen überstanden, ${game.state.stats.evolutions} Evolutionen erlebt und ${game.state.stats.kills} Roboter zerlegt.`;
  $('#game-over').classList.remove('hidden');
});
$('#game-over-restart').addEventListener('click', resetGame);

// --- Speichern --------------------------------------------------------------

setInterval(() => {
  if (!game.state.gameOver) saves.save(game.state);
}, BALANCE.persistence.autosaveSeconds * 1000);
window.addEventListener('beforeunload', () => {
  if (!game.state.gameOver) saves.save(game.state);
});

loop.start();
