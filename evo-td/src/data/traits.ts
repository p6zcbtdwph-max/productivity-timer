/**
 * Spezial-Eigenschaften für Gegner (Schilde, Teilung, Tarnung, ...).
 *
 * Bewusst noch leer: der Prototyp skaliert Gegner nur über 2er-Potenzen.
 * Die Schnittstelle existiert bereits, damit Traits später eingehängt werden
 * können, ohne die Systeme umzubauen.
 */
import type { Enemy } from '../game/entities/Enemy';

export type TraitId = never;

export interface TraitDef {
  id: TraitId;
  name: string;
  /** Wird beim Spawn angewandt (z.B. Schild-HP hinzufügen). */
  onSpawn?: (enemy: Enemy) => void;
  /** Darf den eingehenden Schaden verändern (z.B. Rüstung). */
  modifyIncomingDamage?: (enemy: Enemy, damage: number) => number;
}

export const TRAIT_DEFS: Readonly<Record<TraitId, TraitDef>> = {};

/** Sichere Suche; solange die Registry leer ist, gibt es keine Treffer. */
export function getTrait(id: TraitId): TraitDef | undefined {
  return (TRAIT_DEFS as Readonly<Record<string, TraitDef | undefined>>)[id];
}
