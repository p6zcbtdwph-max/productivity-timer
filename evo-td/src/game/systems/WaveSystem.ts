/**
 * Wellen laufen im Idle-Rhythmus von alleine: Countdown -> Welle startet ->
 * Gegner spawnen nacheinander. Gegner-HP und Belohnung skalieren pro Tier in
 * 2er-Potenzen (siehe balance.ts).
 */
import { BALANCE, tierForWave, tierMultiplier } from '../../config/balance';
import { getEnemyDef, type EnemyId } from '../../data/enemies';
import { getTrait } from '../../data/traits';
import type { Enemy } from '../entities/Enemy';
import type { GameContext } from '../GameContext';
import { allocId } from '../GameState';

/** Zusammensetzung einer Welle, rein aus der Wellennummer abgeleitet. */
export function composeWave(wave: number): EnemyId[] {
  const count = Math.round(BALANCE.waves.baseCount + BALANCE.waves.countPerWave * (wave - 1));
  const queue: EnemyId[] = [];
  for (let i = 0; i < count; i++) {
    if (wave >= 3 && i % 4 === 3) queue.push('laeufer');
    else if (wave >= 6 && i % 5 === 4) queue.push('panzer');
    else queue.push('drohne');
  }
  if (wave % BALANCE.waves.bossEvery === 0) queue.push('boss');
  return queue;
}

export function spawnEnemy(ctx: GameContext, defId: EnemyId, wave: number): Enemy {
  const def = getEnemyDef(defId);
  const mult = tierMultiplier(tierForWave(wave));
  const start = ctx.map.waypoints[0];
  if (!start) throw new Error('Karte hat keine Wegpunkte');
  const hp = BALANCE.enemies.baseHp * def.hpMult * mult;
  const enemy: Enemy = {
    id: allocId(ctx.state),
    defId,
    hp,
    maxHp: hp,
    speed: BALANCE.enemies.baseSpeed * def.speedMult,
    reward: Math.max(1, Math.round(BALANCE.enemies.baseReward * def.rewardMult * mult)),
    waypointIndex: 1,
    x: start.x,
    y: start.y,
    statuses: [],
    traits: [...def.traits],
    distanceTravelled: 0,
  };
  for (const traitId of enemy.traits) getTrait(traitId)?.onSpawn?.(enemy);
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
      const next = wave.spawnQueue.shift() as EnemyId;
      spawnEnemy(ctx, next, wave.current);
      wave.spawnTimer += BALANCE.waves.spawnGap;
    }
  }

  wave.countdown -= dt;
  if (wave.countdown <= 0) {
    wave.current++;
    wave.countdown = BALANCE.waves.interval;
    wave.spawnQueue = composeWave(wave.current);
    wave.spawnTimer = 0;
    wave.aliveFromCurrent = 0;
    ctx.bus.emit('waveStarted', { wave: wave.current, tier: tierForWave(wave.current) });
  }
}

/** Wird vom Kampfsystem gerufen, wenn ein Gegner der aktuellen Welle stirbt oder durchkommt. */
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
