/**
 * Fassade über Zustand und Systeme. Legt die Update-Reihenfolge fest und
 * bietet die Aktionen an, die UI/Eingabe auslösen dürfen.
 */
import { EventBus } from '../core/EventBus';
import { Rng } from '../core/Rng';
import type { MapDef } from '../data/map';
import type { TowerId } from '../data/towers';
import type { Tower } from './entities/Tower';
import type { EffectiveStats } from './systems/StatsSystem';
import type { GameEvents } from './events';
import type { GameContext } from './GameContext';
import { createInitialState, type GameState } from './GameState';
import { createInitialMeta, type MetaState } from './MetaState';
import { bestWaveOn, isMapUnlocked, buyMetaUpgrade, computeDna, metaValues, settleRun, unlockArtifact, type DnaReport } from './systems/MetaSystem';
import { recordSpecies } from './systems/CompendiumSystem';
import type { MetaUpgradeId } from '../data/meta';
import { fuseTowers, fusionCandidates, updateAutoFusion } from './systems/FusionSystem';
import { buildTower, canBuild, clearObstacle, currentTowerCost, obstacleAt, obstacleClearCost, updateAutoBuild } from './systems/BuildSystem';
import { MAPS, type ObstacleDef } from '../data/map';
import { cycleTargeting, updateCombat } from './systems/CombatSystem';
import { getTowerDef, type Targeting } from '../data/towers';
import { updateElements } from './systems/ElementSystem';
import { evolveTower, updateEvolution } from './systems/EvolutionSystem';
import { updateMovement } from './systems/MovementSystem';
import { updateProjectiles } from './systems/ProjectileSystem';
import { updateStatuses } from './systems/StatusSystem';
import { updateWaves } from './systems/WaveSystem';
import { canRelocate, relocateCharges, relocateCost, relocateTower } from './systems/RelocateSystem';
import { buyItemForTower, buyUpgrade } from './systems/ShopSystem';
import type { ItemQuality } from '../data/items';
import type { ModifierKind } from '../data/upgrades';

export class Game {
  readonly bus = new EventBus<GameEvents>();
  readonly rng: Rng;
  state: GameState;
  /** Kraftfaktor auf den Schaden; die Winterruhe setzt ihn offline herab. */
  private power = 1;
  /** Wahr, solange die Winterruhe nachrechnet (UI unterdrückt dann Effekte). */
  simulating = false;
  /**
   * Turmwerte über Schritte hinweg zwischengespeichert. Wird bei allem geleert,
   * was Werte ändern kann (Bau, Evolution, Level, Fusion, Verlegen, Käufe).
   */
  private readonly statsCache = new Map<number, EffectiveStats>();

  constructor(
    public map: MapDef,
    readonly meta: MetaState = createInitialMeta(),
    state?: GameState,
  ) {
    this.state = state ?? this.freshState();
    this.rng = new Rng(this.state.rngState);
    // Kompendium: Rekorde jeder Art mitschreiben (auch während der Winterruhe).
    const record = ({ tower }: { tower: Tower }): void => {
      recordSpecies(this.meta, tower.defId, tower.level, tower.prestige);
    };
    for (const event of ['towerBuilt', 'towerEvolved', 'towerLevelUp', 'towerFused'] as const) this.bus.on(event, record);
    for (const tower of this.state.towers) recordSpecies(this.meta, tower.defId, tower.level, tower.prestige);
    const clear = (): void => this.invalidateStats();
    for (const event of ['towerBuilt', 'towerEvolved', 'towerLevelUp', 'towerFused', 'towerRelocated', 'upgradeBought', 'itemObtained'] as const) {
      this.bus.on(event, clear);
    }
  }

  /** Muss gerufen werden, wenn etwas außerhalb der Spielsysteme Werte ändert (UI, Entwickler-Panel). */
  invalidateStats(): void {
    this.statsCache.clear();
  }

  setPower(power: number): void {
    if (power === this.power) return;
    this.power = power;
    this.invalidateStats();
  }

  private freshState(): GameState {
    const values = metaValues(this.meta);
    const state = createInitialState(Date.now() >>> 0, { gold: values.startGold, lives: values.startLives }, this.map.id);
    state.bestWaveAtStart = bestWaveOn(this.meta, this.map.id);
    return state;
  }

  get ctx(): GameContext {
    return { state: this.state, meta: this.meta, map: this.map, rng: this.rng, bus: this.bus, statsCache: this.statsCache, power: this.power, offline: this.simulating };
  }

  /** Ein Simulationsschritt. Reihenfolge ist bewusst gewählt (siehe Kommentare). */
  update(dt: number): void {
    if (this.state.gameOver) return;
    const ctx = this.ctx;
    this.state.time += dt;
    updateWaves(ctx, dt); //       1. neue Gegner erscheinen
    updateStatuses(ctx, dt); //    2. Gift tickt, Slow läuft ab
    updateElements(ctx, dt); //    3. Element-Wirkungen (Heilung)
    updateMovement(ctx, dt); //    4. Gegner laufen (mit aktuellem Slow)
    updateCombat(ctx, dt); //      5. Türme wählen Ziele und schießen
    updateProjectiles(ctx, dt); // 6. Projektile fliegen/treffen
    updateEvolution(ctx, dt); //   7. Evolution würfelt
    updateAutoBuild(ctx); //       8. Idle-Automatik baut nach
    updateAutoFusion(ctx); //      9. Idle-Automatik fusioniert (Artefakt)
    this.state.rngState = this.rng.getState();
  }

  // --- Aktionen für die UI --------------------------------------------------

  towerCost(): number {
    return currentTowerCost(this.ctx);
  }

  canBuildAt(slot: number): boolean {
    return canBuild(this.ctx, slot);
  }

  build(slot: number): Tower | undefined {
    return buildTower(this.ctx, slot);
  }

  toggleEvolutionLock(towerId: number): void {
    const tower = this.state.towers.find((t) => t.id === towerId);
    if (tower) tower.evolutionLocked = !tower.evolutionLocked;
  }

  /** Zielpriorität eines Turms weiterschalten; gibt die neue Priorität zurück. */
  cycleTargeting(towerId: number): Targeting | undefined {
    const tower = this.state.towers.find((t) => t.id === towerId);
    if (!tower) return undefined;
    return cycleTargeting(tower, getTowerDef(tower.defId).targeting);
  }

  /** Auto-Kauf der Run-Upgrades an/aus (wirkt nur mit Artefakt "Instinkt"). */
  setAutoUpgrades(enabled: boolean): void {
    this.meta.autoUpgradeEnabled = enabled;
  }

  setAutoBuild(enabled: boolean): void {
    this.state.autoBuild = enabled;
  }

  // Fusion ----------------------------------------------------------------

  fusionCandidatesFor(towerId: number): Tower[] {
    const tower = this.state.towers.find((t) => t.id === towerId);
    return tower ? fusionCandidates(this.ctx, tower) : [];
  }

  fuse(targetId: number, consumedId: number): boolean {
    const target = this.state.towers.find((t) => t.id === targetId);
    const consumed = this.state.towers.find((t) => t.id === consumedId);
    return !!target && !!consumed && fuseTowers(this.ctx, target, consumed);
  }

  // Verlegen --------------------------------------------------------------

  relocateCharges(): number {
    return relocateCharges(this.ctx);
  }

  relocateCost(): number {
    return relocateCost(this.ctx);
  }

  canRelocateTo(slot: number): boolean {
    return canRelocate(this.ctx, slot);
  }

  relocate(towerId: number, toSlot: number): boolean {
    const tower = this.state.towers.find((t) => t.id === towerId);
    return !!tower && relocateTower(this.ctx, tower, toSlot);
  }

  // Shop ------------------------------------------------------------------

  buyUpgrade(kind: ModifierKind): boolean {
    return buyUpgrade(this.ctx, kind);
  }

  /** Item direkt für einen Turm kaufen. */
  buyItemFor(towerId: number, quality: ItemQuality): boolean {
    const tower = this.state.towers.find((t) => t.id === towerId);
    return !!tower && buyItemForTower(this.ctx, tower, quality) !== undefined;
  }

  /** Debug/Test-Helfer: erzwingt eine Evolution. */
  forceEvolve(towerId: number, to: TowerId): void {
    const tower = this.state.towers.find((t) => t.id === towerId);
    if (tower) evolveTower(this.ctx, tower, to);
  }

  /** Startet einen neuen Run (ohne DNA-Abrechnung). */
  reset(): void {
    this.invalidateStats();
    this.state = this.freshState();
    this.rng.setState(this.state.rngState);
  }

  // Globaler Shop -----------------------------------------------------------

  /** DNA-Vorschau für den laufenden Run. */
  dnaPreview(): DnaReport {
    return computeDna(this.meta, this.map.id, this.state.wave.current);
  }

  /** Beendet den Run: DNA gutschreiben, Bestwelle aktualisieren, neuen Run starten. */
  endRun(): DnaReport {
    const report = settleRun(this.meta, this.map.id, this.state.wave.current);
    this.bus.emit('runEnded', { report });
    this.reset();
    return report;
  }

  /** Wechselt die Karte: der laufende Run wird abgerechnet (DNA), dann startet ein neuer Run dort. */
  switchMap(mapId: string): DnaReport | undefined {
    const target = MAPS.find((m) => m.id === mapId);
    if (!target || target.id === this.map.id || !isMapUnlocked(this.meta, target)) return undefined;
    const report = this.state.wave.current > 0 ? settleRun(this.meta, this.map.id, this.state.wave.current) : undefined;
    if (report) this.bus.emit('runEnded', { report });
    this.map = target;
    this.reset();
    return report;
  }

  clearObstacle(slot: number): boolean {
    return clearObstacle(this.ctx, slot);
  }

  obstacleAt(slot: number): ObstacleDef | undefined {
    return obstacleAt(this.ctx, slot);
  }

  obstacleClearCost(): number {
    return obstacleClearCost(this.ctx);
  }

  buyMetaUpgrade(id: MetaUpgradeId): boolean {
    this.invalidateStats();
    return buyMetaUpgrade(this.meta, id);
  }

  unlockArtifact(id: MetaUpgradeId): boolean {
    this.invalidateStats();
    return unlockArtifact(this.meta, id);
  }

  // Entwickler-Werkzeuge (nur für Tests) ------------------------------------

  /** Springt `waves` Wellen vor: laufende Gegner verschwinden, nächste Welle startet sofort. */
  devSkipWaves(waves: number): void {
    this.state.enemies = [];
    this.state.projectiles = [];
    this.state.wave.spawnQueue = [];
    this.state.wave.aliveFromCurrent = 0;
    this.state.wave.current += Math.max(0, waves - 1);
    this.state.wave.countdown = 0;
  }

  setAutoFusion(enabled: boolean): void {
    this.meta.autoFusionEnabled = enabled && metaValues(this.meta).autoFusion;
  }

  /** Lädt einen gespeicherten Zustand (ersetzt den aktuellen). */
  load(state: GameState): void {
    this.invalidateStats();
    this.state = state;
    this.rng.setState(state.rngState);
  }
}
