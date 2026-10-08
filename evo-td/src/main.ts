/**
 * Einstiegspunkt: verdrahtet Spiel, Loop, Renderer, UI und Speicherung.
 */
import { BALANCE } from './config/balance';
import { GameLoop } from './core/GameLoop';
import { getMap } from './data/map';
import { Game } from './game/Game';
import type { GameState } from './game/GameState';
import { normalizeMeta, type MetaState } from './game/MetaState';
import { getTowerDef } from './data/towers';
import { formatNumber } from './ui/dom';
import { SaveManager } from './persistence/SaveManager';
import { CloudSave, newer } from './persistence/CloudSave';
import { CanvasRenderer } from './render/CanvasRenderer';
import { $ } from './ui/dom';
import { DevPanel } from './ui/DevPanel';
import { ElementLegend } from './ui/ElementLegend';
import { EventLog } from './ui/EventLog';
import { GlobalPanel } from './ui/GlobalPanel';
import { ChambersPanel } from './ui/ChambersPanel';
import { CompendiumPanel } from './ui/CompendiumPanel';
import { GardenPanel } from './ui/GardenPanel';
import { TREE_DEFS } from './data/garden';
import { OfflineReport } from './ui/OfflineReport';
import { tickPassive } from './game/systems/PassiveSystem';
import { CATEGORY_NAMES } from './game/systems/AdaptationSystem';
import { Hud } from './ui/Hud';
import { ShopPanel } from './ui/ShopPanel';
import { Tabs } from './ui/Tabs';
import { TowerPanel, type TowerAction } from './ui/TowerPanel';
import { TreeView } from './ui/TreeView';

const runSaves = new SaveManager<GameState>(BALANCE.persistence.runKey, BALANCE.persistence.runVersion);
const metaSaves = new SaveManager<MetaState>(BALANCE.persistence.metaKey, BALANCE.persistence.metaVersion);
const savedRun = runSaves.load();
// Cloud-Stand (nur als claude.ai-Artefakt): der neuere von lokal und Cloud gewinnt.
const cloud = await CloudSave.connect();
const [cloudRun, cloudMeta] = cloud
  ? await Promise.all([
      cloud.load<GameState>('run', BALANCE.persistence.runVersion),
      cloud.load<MetaState>('meta', BALANCE.persistence.metaVersion),
    ])
  : [undefined, undefined];
const startRun = newer(runSaves.loadFile(), cloudRun)?.data;
const startMeta = newer(metaSaves.loadFile(), cloudMeta)?.data;
const game = new Game(getMap(savedRun?.mapId), normalizeMeta(metaSaves.load()), savedRun);

const canvas = $<HTMLCanvasElement>('#game-canvas');
const renderer = new CanvasRenderer(canvas, game.map);
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
      for (const g of report.garden.levelUps) eventLog.push(`🌳 ${TREE_DEFS[g.tree].name} ist auf Level ${g.level} gewachsen`, 'evo');
      if (report.garden.levelUps.length > 0) game.invalidateStats();
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
      case 'garden':
        gardenPanel.render();
        break;
    }
  },
);

const afterNewRun = (): void => {
  runSaves.clear();
  metaSaves.save(game.meta);
  cloud?.save('meta', BALANCE.persistence.metaVersion, game.meta, { force: true });
  cloud?.save('run', BALANCE.persistence.runVersion, game.state, { force: true });
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

/** Karte wechseln: laufenden Run abrechnen, neuen Run auf der Karte starten. */
const switchMap = (mapId: string): void => {
  game.switchMap(mapId);
  renderer.setMap(game.map);
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
  // Cloud-Stand mit frischen Ständen überschreiben, dann neu laden.
  const freshMeta = normalizeMeta(undefined);
  cloud?.save('meta', BALANCE.persistence.metaVersion, freshMeta, { force: true });
  game.reset();
  cloud?.save('run', BALANCE.persistence.runVersion, game.state, { force: true });
  setTimeout(() => location.reload(), 800);
};

const tabs = new Tabs();
const hud = new Hud(game, loop, resetGame);
const towerPanel = new TowerPanel(game, {
  onAction: (action) => setAction(activeAction === action ? undefined : action),
});
const shopPanel = new ShopPanel(game);
const treeView = new TreeView(game);
const globalPanel = new GlobalPanel(game, endRun, switchMap);
const chambersPanel = new ChambersPanel(game);
const compendiumPanel = new CompendiumPanel(game);
const gardenPanel = new GardenPanel(game, () => game.invalidateStats());
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
game.bus.on('speciesUnlocked', ({ id }) => {
  renderer.float(game.map.cols / 2, 2.5, `🔓 ${getTowerDef(id).name} freigeschaltet`, '#9be7a0', 2.5);
  treeView.invalidate();
});
game.bus.on('seedFound', ({ tree }) => {
  renderer.float(game.map.cols / 2, 1.5, `🌰 ${TREE_DEFS[tree].name}-Samen!`, '#9be7a0', 2.5);
  gardenPanel.invalidate();
});
game.bus.on('robotsAdapted', ({ category, resist }) => {
  renderer.float(game.map.cols / 2, 1, `🤖 ${CATEGORY_NAMES[category]} −${Math.round(resist * 100)} %`, '#ff5252', 3);
});
game.bus.on('obstacleCleared', ({ slot, cost }) => {
  const cell = game.map.buildSlots[slot];
  if (cell) renderer.float(cell.x + 0.5, cell.y + 0.5, `−${cost}`, '#ffd54f');
});
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
  if (game.obstacleAt(slot)) {
    game.clearObstacle(slot);
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
  if (e.key === 't') {
    game.cycleTargeting(selectedTowerId);
    towerPanel.invalidate();
  }
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

/** Felder, die sich ständig ändern, lösen allein keinen Cloud-Schreibvorgang aus. */
const metaVolatile = (m: MetaState): unknown => ({ ...m, lastSeen: 0, passive: { ...m.passive, lastTick: 0 } });

let autosaves = 0;
const saveAll = (force = false): void => {
  if (!game.state.gameOver) runSaves.save(game.state);
  metaSaves.save(game.meta);
  // Cloud: höchstens alle 3 Autosaves (30 s), sofort beim Verlassen der Seite.
  if (cloud && (force || ++autosaves % 3 === 0)) {
    if (!game.state.gameOver) cloud.save('run', BALANCE.persistence.runVersion, game.state, { force });
    cloud.save('meta', BALANCE.persistence.metaVersion, game.meta, { volatile: metaVolatile, force });
  }
};
setInterval(() => saveAll(), BALANCE.persistence.autosaveSeconds * 1000);
window.addEventListener('beforeunload', () => saveAll(true));

// --- Winterruhe: Abwesenheit beim Start und beim Zurückkehren in den Tab ------

const offlineReport = new OfflineReport(game, loop, () => {
  towerPanel.invalidate();
  chambersPanel.invalidate();
  globalPanel.invalidate();
});
const startedAwayFrom = game.meta.lastSeen;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void offlineReport.resume(game.meta.lastSeen);
  else saveAll(true);
});

loop.start();
void offlineReport.resume(startedAwayFrom);

// Für Tests und Debugging in der Browser-Konsole: window.evoTd.game
(window as unknown as { evoTd: unknown }).evoTd = { game, loop };
