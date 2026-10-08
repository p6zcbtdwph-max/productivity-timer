/**
 * Passiv-Modus: Evolutionskammern und Reviere. Läuft in Echtzeit, auch
 * während das Spiel geschlossen ist (bis zur Offline-Obergrenze).
 *
 * - In einer Kammer lebt ein gekauftes Tier und entwickelt sich zufällig zu
 *   freigeschalteten Nachfahren. Höhere Tiers brauchen länger.
 * - Im Revier einer Karte legt ein Tier Eier: ×2 je Tier und
 *   ×(1 + Bestwelle der Karte / 50).
 * Kammern und Ausbrüten kosten Eier.
 */
import { BALANCE } from '../../config/balance';
import { NEST } from '../../data/nest';
import { Rng } from '../../core/Rng';
import { MAPS } from '../../data/map';
import { getTowerDef, ROOT_TOWER, type TowerId } from '../../data/towers';
import type { MetaState, PassiveAnimal } from '../MetaState';
import { bestWaveOn, isMapUnlocked, isUnlocked, metaValues } from './MetaSystem';
import { childrenOf } from '../../data/towers';
import { recordSpecies } from './CompendiumSystem';
import { tickGarden, type GardenReport } from './GardenSystem';

const P = BALANCE.passive;

// --- Kammern ----------------------------------------------------------------

export function chamberUnlockCost(meta: MetaState): number | undefined {
  const n = meta.passive.chambersUnlocked;
  if (n >= NEST.maxChambers) return undefined;
  return Math.round(NEST.chamberBaseCost * NEST.chamberGrowth ** Math.max(0, n - NEST.startChambers));
}

export function unlockChamber(meta: MetaState): boolean {
  const cost = chamberUnlockCost(meta);
  if (cost === undefined || meta.eggs < cost) return false;
  meta.eggs -= cost;
  meta.passive.chambersUnlocked++;
  return true;
}

export function animalInChamber(meta: MetaState, chamber: number): PassiveAnimal | undefined {
  return meta.passive.animals.find((a) => a.chamber === chamber);
}

export function freeChamber(meta: MetaState): number | undefined {
  for (let c = 0; c < meta.passive.chambersUnlocked; c++) if (!animalInChamber(meta, c)) return c;
  return undefined;
}

/** Eier, die das Ausbrüten des nächsten Einzellers kostet. */
export function animalCost(meta: MetaState): number {
  return Math.round(NEST.hatchBaseCost * NEST.hatchGrowth ** meta.passive.animalsBought);
}

/** Brütet ein Ei in einer freien Kammer aus: ein Einzeller schlüpft. */
export function buyAnimal(meta: MetaState, chamber: number): PassiveAnimal | undefined {
  const cost = animalCost(meta);
  if (chamber >= meta.passive.chambersUnlocked || animalInChamber(meta, chamber) || meta.eggs < cost) return undefined;
  meta.eggs -= cost;
  meta.passive.animalsBought++;
  const animal: PassiveAnimal = { id: meta.passive.nextAnimalId++, defId: ROOT_TOWER, chamber, mapId: null, evolutionLocked: false };
  meta.passive.animals.push(animal);
  recordSpecies(meta, animal.defId, 1, 0);
  return animal;
}

export function releaseAnimal(meta: MetaState, animalId: number): boolean {
  const index = meta.passive.animals.findIndex((a) => a.id === animalId);
  if (index < 0) return false;
  meta.passive.animals.splice(index, 1);
  return true;
}

export function toggleChamberLock(meta: MetaState, animalId: number): void {
  const animal = meta.passive.animals.find((a) => a.id === animalId);
  if (animal) animal.evolutionLocked = !animal.evolutionLocked;
}

/** Evolutionen pro Stunde für ein Tier in der Kammer (0 = keine möglich). */
export function chamberEvolutionRate(meta: MetaState, animal: PassiveAnimal): number {
  if (animal.chamber === null || animal.evolutionLocked) return 0;
  if (unlockedChildrenOf(meta, animal.defId).length === 0) return 0;
  const tier = getTowerDef(animal.defId).tier;
  return P.evolutionsPerHour * 0.5 ** tier * metaValues(meta).chamberSpeedMult;
}

function unlockedChildrenOf(meta: MetaState, id: TowerId): TowerId[] {
  return childrenOf(id).filter((c) => isUnlocked(meta, c));
}

// --- Reviere ----------------------------------------------------------------

export function mapSlotsUsed(meta: MetaState, mapId: string): number {
  return meta.passive.animals.filter((a) => a.mapId === mapId).length;
}

export function assignToMap(meta: MetaState, animalId: number, mapId: string): boolean {
  const animal = meta.passive.animals.find((a) => a.id === animalId);
  if (!animal || animal.mapId === mapId) return false;
  const map = MAPS.find((m) => m.id === mapId);
  if (!map || !isMapUnlocked(meta, map)) return false;
  if (mapSlotsUsed(meta, mapId) >= metaValues(meta).mapSlots) return false;
  animal.chamber = null;
  animal.mapId = mapId;
  return true;
}

export function returnToChamber(meta: MetaState, animalId: number): boolean {
  const animal = meta.passive.animals.find((a) => a.id === animalId);
  const chamber = freeChamber(meta);
  if (!animal || animal.chamber !== null || chamber === undefined) return false;
  animal.mapId = null;
  animal.chamber = chamber;
  return true;
}

/** Eier pro Stunde eines Tiers im Revier. */
export function animalEggsPerHour(meta: MetaState, animal: PassiveAnimal): number {
  if (!animal.mapId) return 0;
  const tier = getTowerDef(animal.defId).tier;
  const mapFactor = 1 + bestWaveOn(meta, animal.mapId) / 50;
  return NEST.eggsPerHour * 2 ** tier * mapFactor * metaValues(meta).passiveEggMult;
}

export function totalEggsPerHour(meta: MetaState): number {
  return meta.passive.animals.reduce((sum, a) => sum + animalEggsPerHour(meta, a), 0);
}

// --- Echtzeit-Abrechnung -------------------------------------------------------

export interface PassiveReport {
  seconds: number;
  /** Abgeschnittene Zeit über der Offline-Obergrenze. */
  cappedSeconds: number;
  eggs: number;
  evolutions: { animalId: number; from: TowerId; to: TowerId }[];
  garden: GardenReport;
}

/**
 * Rechnet die Zeit seit der letzten Abrechnung ab (gedeckelt). Evolutionen
 * werden exakt als Poisson-Prozess gezogen: auch nach 8 Stunden Abwesenheit
 * können mehrere Stufen hintereinander passieren.
 */
export function tickPassive(meta: MetaState, nowMs: number): PassiveReport {
  const passive = meta.passive;
  const raw = Math.max(0, (nowMs - passive.lastTick) / 1000);
  passive.lastTick = nowMs;
  const cap = metaValues(meta).offlineCapSeconds;
  const seconds = Math.min(raw, cap);
  const report: PassiveReport = { seconds, cappedSeconds: raw - seconds, eggs: 0, evolutions: [], garden: { resin: 0, levelUps: [] } };
  if (seconds <= 0) return report;
  report.garden = tickGarden(meta, seconds);

  // Eier aus Revieren (mit den Werten vom Beginn des Zeitraums)
  const earned = (totalEggsPerHour(meta) * seconds) / 3600 + (passive.eggFraction ?? 0);
  const whole = Math.floor(earned);
  passive.eggFraction = earned - whole;
  meta.eggs += whole;
  passive.eggsEarned = (passive.eggsEarned ?? 0) + whole;
  report.eggs = whole;

  // Evolutionen in den Kammern
  const rng = new Rng(passive.rngState);
  for (const animal of passive.animals) {
    let remaining = seconds / 3600;
    for (let guard = 0; guard < 32; guard++) {
      const rate = chamberEvolutionRate(meta, animal);
      if (rate <= 0) break;
      const wait = -Math.log(1 - rng.next()) / rate;
      if (wait > remaining) break;
      remaining -= wait;
      const from = animal.defId;
      animal.defId = rng.pick(unlockedChildrenOf(meta, from));
      report.evolutions.push({ animalId: animal.id, from, to: animal.defId });
      recordSpecies(meta, animal.defId, 1, 0);
    }
  }
  passive.rngState = rng.getState();
  return report;
}
