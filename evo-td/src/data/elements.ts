/**
 * Elemente: Spezial-Eigenschaften der Roboter. Ein Gegner trägt höchstens
 * ein Element. Jedes Element hat genau eine Wirkung und eine Farbe.
 *
 * Die Hooks werden von den Systemen aufgerufen (DamageSystem, ElementSystem),
 * damit neue Elemente nur hier ergänzt werden müssen.
 */
import { BALANCE } from '../config/balance';
import type { Enemy } from '../game/entities/Enemy';

export type ElementId = 'titan' | 'gold' | 'plasma' | 'nano';

export interface ElementDef {
  id: ElementId;
  name: string;
  color: string;
  description: string;
  /** Beim Spawn: Startwerte setzen (Schild, Extra-Leben, ...). */
  onSpawn?: (enemy: Enemy) => void;
  /** Multiplikator auf die Gold-Belohnung. */
  rewardMultiplier?: number;
  /** Pro Simulationsschritt (Heilung o.ä.). */
  update?: (enemy: Enemy, dt: number) => void;
  /**
   * Letzte Chance vor dem Tod. Gibt true zurück, wenn der Gegner überlebt
   * (z.B. zweites Leben verbraucht).
   */
  onLethalDamage?: (enemy: Enemy) => boolean;
}

export const ELEMENT_DEFS: Readonly<Record<ElementId, ElementDef>> = {
  titan: {
    id: 'titan',
    name: 'Titan-Kern',
    color: '#ffffff',
    description: 'Doppeltes Leben: steht nach dem ersten Tod einmal wieder auf.',
    onSpawn: (enemy) => {
      enemy.extraLives = 1;
    },
    onLethalDamage: (enemy) => {
      if (enemy.extraLives <= 0) return false;
      enemy.extraLives--;
      enemy.hp = enemy.maxHp;
      enemy.statuses = [];
      return true;
    },
  },
  gold: {
    id: 'gold',
    name: 'Gold-Legierung',
    color: '#ffd700',
    description: 'Doppeltes Gold beim Abschuss.',
    rewardMultiplier: 2,
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma-Schild',
    color: '#40c4ff',
    description: 'Ein Energieschild muss zuerst heruntergeschossen werden.',
    onSpawn: (enemy) => {
      enemy.shield = enemy.maxHp * BALANCE.elements.shieldFraction;
      enemy.shieldMax = enemy.shield;
    },
  },
  nano: {
    id: 'nano',
    name: 'Nanobots',
    color: '#69f0ae',
    description: 'Repariert sich laufend selbst.',
    update: (enemy, dt) => {
      if (enemy.hp <= 0 || enemy.hp >= enemy.maxHp) return;
      let healPerSecond = enemy.maxHp * BALANCE.elements.healFractionPerSecond;
      const suppressed = enemy.statuses.find((s) => s.kind === 'antiHeal');
      if (suppressed && suppressed.kind === 'antiHeal') healPerSecond *= 1 - suppressed.percent;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healPerSecond * dt);
    },
  },
};

export const ELEMENT_IDS = Object.keys(ELEMENT_DEFS) as ElementId[];

export function getElementDef(id: ElementId): ElementDef {
  return ELEMENT_DEFS[id];
}
