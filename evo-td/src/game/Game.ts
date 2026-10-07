/**
 * Fassade über Zustand und Systeme. Legt die Update-Reihenfolge fest und
 * bietet die Aktionen an, die UI/Eingabe auslösen dürfen.
 */
import { EventBus } from '../core/EventBus';
import { Rng } from '../core/Rng';
import type { MapDef } from '../data/map';
import type { TowerId } from '../data/towers';
import type { Tower } from './entities/Tower';
import type { GameEvents } from './events';
import type { GameContext } from './GameContext';
import { createInitialState, type GameState } from './GameState';
import { buildTower, canBuild, currentTowerCost, updateAutoBuild } from './systems/BuildSystem';
import { updateCombat } from './systems/CombatSystem';
import { updateElements } from './systems/ElementSystem';
import { evolveTower, updateEvolution } from './systems/EvolutionSystem';
import { updateMovement } from './systems/MovementSystem';
import { updateProjectiles } from './systems/ProjectileSystem';
import { updateStatuses } from './systems/StatusSystem';
import { updateWaves } from './systems/WaveSystem';
import { fuseTowers, fusionCandidates } from './systems/FusionSystem';
import { canRelocate, relocateCharges, relocateCost, relocateTower } from './systems/RelocateSystem';
import { buyItem, buyUpgrade, toggleEquip } from './systems/ShopSystem';
import type { ItemQuality } from '../data/items';
import type { ModifierKind } from '../data/upgrades';

export class Game {
  readonly bus = new EventBus<GameEvents>();
  readonly rng: Rng;
  state: GameState;

  constructor(
    readonly map: MapDef,
    state?: GameState,
  ) {
    this.state = state ?? createInitialState(Date.now() >>> 0);
    this.rng = new Rng(this.state.rngState);
  }

  get ctx(): GameContext {
    return { state: this.state, map: this.map, rng: this.rng, bus: this.bus };
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

  buyItem(quality: ItemQuality): boolean {
    return buyItem(this.ctx, quality) !== undefined;
  }

  toggleEquip(itemId: number): boolean {
    return toggleEquip(this.ctx, itemId);
  }

  /** Debug/Test-Helfer: erzwingt eine Evolution. */
  forceEvolve(towerId: number, to: TowerId): void {
    const tower = this.state.towers.find((t) => t.id === towerId);
    if (tower) evolveTower(this.ctx, tower, to);
  }

  reset(): void {
    this.state = createInitialState(Date.now() >>> 0);
    this.rng.setState(this.state.rngState);
  }

  /** Lädt einen gespeicherten Zustand (ersetzt den aktuellen). */
  load(state: GameState): void {
    this.state = state;
    this.rng.setState(state.rngState);
  }
}
