/**
 * Wellen laufen im Idle-Rhythmus von alleine: Countdown -> Welle startet ->
 * Gegner spawnen nacheinander. Gegner-HP und Belohnung skalieren pro Tier in
 * 2er-Potenzen (siehe balance.ts). Ab einer bestimmten Welle tragen Gegner
 * zufällig ein Element.
 */
import { BALANCE, tierForWave, tierMultiplier } from '../../config/balance';
import { ELEMENT_IDS, getElementDef, type ElementId } from '../../data/elements';
import { getEnemyDef, type EnemyId } from '../../data/enemies';
import type { Enemy } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { allocId } from '../GameState';
import type { Rng } from '../../core/Rng';
import { metaValues } from './MetaSystem';
import { adaptRobots } from './AdaptationSystem';

export interface SpawnOrder {
  defId: EnemyId;
  element: ElementId | null;
}

export function elementChance(wave: number): number {
  const e = BALANCE.elements;
  if (wave < e.fromWave) return 0;
  return Math.min(e.maxChance, e.baseChance + e.chancePerWave * wave);
}

/** Zusammensetzung einer Welle aus Wellennummer (Typen) und RNG (Elemente). */
export function composeWave(wave: number, rng: Rng): SpawnOrder[] {
  const count = Math.min(BALANCE.waves.maxCount, Math.round(BALANCE.waves.baseCount + BALANCE.waves.countPerWave * (wave - 1)));
  const chance = elementChance(wave);
  const queue: SpawnOrder[] = [];
  for (let i = 0; i < count; i++) {
    let defId: EnemyId = 'drohne';
    if (wave >= 3 && i % 4 === 3) defId = 'laeufer';
    else if (wave >= 6 && i % 5 === 4) defId = 'panzer';
    const element = rng.chance(chance) ? rng.pick(ELEMENT_IDS) : null;
    queue.push({ defId, element });
  }
  if (wave % BALANCE.waves.bossEvery === 0) {
    queue.push({ defId: 'boss', element: wave >= BALANCE.elements.fromWave ? rng.pick(ELEMENT_IDS) : null });
  }
  return queue;
}

export function spawnEnemy(ctx: GameContext, order: SpawnOrder, wave: number): Enemy {
  const def = getEnemyDef(order.defId);
  const mult = tierMultiplier(tierForWave(wave));
  const pathIndex = ctx.state.nextEntityId % ctx.map.paths.length;
  const start = ctx.map.paths[pathIndex]?.[0];
  if (!start) throw new Error('Karte hat keine Wegpunkte');
  const element = order.element ? getElementDef(order.element) : undefined;
  const hp = BALANCE.enemies.baseHp * def.hpMult * mult;
  const comp = metaValues(ctx.meta).compendium;
  const enemy: Enemy = {
    id: allocId(ctx.state),
    defId: order.defId,
    element: order.element,
    hp,
    maxHp: hp,
    shield: 0,
    shieldMax: 0,
    extraLives: 0,
    speed: BALANCE.enemies.baseSpeed * def.speedMult * (1 - comp.enemySlow),
    healMultiplier: 1 - comp.antiHeal,
    reward: Math.max(1, Math.round(BALANCE.enemies.baseReward * def.rewardMult * mult * (element?.rewardMultiplier ?? 1))),
    pathIndex,
    waypointIndex: 1,
    x: start.x,
    y: start.y,
    statuses: [],
    distanceTravelled: 0,
  };
  element?.onSpawn?.(enemy);
  ctx.state.enemies.push(enemy);
  ctx.state.wave.aliveFromCurrent++;
  return enemy;
}

export function updateWaves(ctx: GameContext, dt: number): void {
  const { state } = ctx;
  const wave = state.wave;

  if (wave.spawnQueue.length > 0) {
    wave.spawnTimer -= dt;
    while (wave.spawnTimer <= 0 && wave.spawnQueue.length > 0) {
      const next = wave.spawnQueue.shift() as SpawnOrder;
      spawnEnemy(ctx, next, wave.current);
      wave.spawnTimer += BALANCE.waves.spawnGap;
    }
  }

  wave.countdown -= dt;
  if (wave.countdown <= 0) {
    wave.current++;
    wave.countdown = BALANCE.waves.interval;
    wave.spawnQueue = composeWave(wave.current, ctx.rng);
    wave.spawnTimer = 0;
    wave.aliveFromCurrent = 0;
    ctx.bus.emit('waveStarted', { wave: wave.current, tier: tierForWave(wave.current) });
    adaptRobots(ctx);
  }
}

/** Wird gerufen, wenn ein Gegner der aktuellen Welle stirbt oder durchkommt. */
export function onEnemyRemoved(ctx: GameContext): void {
  const wave = ctx.state.wave;
  wave.aliveFromCurrent = Math.max(0, wave.aliveFromCurrent - 1);
  if (wave.aliveFromCurrent === 0 && wave.spawnQueue.length === 0 && wave.current > 0) {
    const bonus = Math.round(BALANCE.economy.waveClearBonus * tierMultiplier(tierForWave(wave.current)));
    ctx.state.gold += bonus;
    ctx.state.stats.goldEarned += bonus;
    ctx.bus.emit('waveCleared', { wave: wave.current, bonus });
  }
}
