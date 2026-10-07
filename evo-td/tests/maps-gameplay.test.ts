import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { BIOME_BONUS, speciesBiome } from '../src/data/biomes';
import { CONTINENT_MAP, FACTORY_MAP, START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import { applyDamage } from '../src/game/systems/DamageSystem';
import { isMapUnlocked, metaValues } from '../src/game/systems/MetaSystem';
import { statsFor } from '../src/game/systems/StatsSystem';
import { spawnEnemy } from '../src/game/systems/WaveSystem';

function gameOn(map = CONTINENT_MAP, seed = 1): Game {
  const game = new Game(map, createInitialMeta(), createInitialState(seed, undefined, map.id));
  game.state.gold = 1e9;
  return game;
}

describe('Biome und Gelände', () => {
  it('Heimat-Biom gibt ×1.3 Schaden, Anhöhe ×1.2 Reichweite', () => {
    const game = gameOn();
    const map = CONTINENT_MAP;
    const water = map.slotBiome.findIndex((b, i) => b === 'wasser' && !map.highGround.has(i) && !map.obstacles.some((o) => o.slot === i));
    const air = map.slotBiome.findIndex((b, i) => b === 'luft' && !map.highGround.has(i) && !map.obstacles.some((o) => o.slot === i));
    const a = game.build(water);
    const b = game.build(air);
    if (!a || !b) throw new Error('Bau fehlgeschlagen');
    expect(speciesBiome('einzeller')).toBe('wasser');
    const home = statsFor(game.ctx, a);
    const away = statsFor(game.ctx, b);
    expect(home.breakdown.damage.gelaende).toBe(BIOME_BONUS.damage);
    expect(away.breakdown.damage.gelaende).toBe(1);

    const high = [...map.highGround][0] as number;
    const c = game.build(high);
    if (!c) throw new Error('Bau fehlgeschlagen');
    expect(statsFor(game.ctx, c).breakdown.range.gelaende).toBe(BIOME_BONUS.highGroundRange);
  });

  it('Urmeer hat kein Gelände', () => {
    const game = gameOn(START_MAP);
    const t = game.build(0);
    if (!t) throw new Error('Bau fehlgeschlagen');
    expect(statsFor(game.ctx, t).breakdown.damage.gelaende).toBe(1);
  });
});

describe('Hindernisse', () => {
  it('blockieren den Bau, lassen sich für Gold räumen', () => {
    const game = gameOn();
    const slot = CONTINENT_MAP.obstacles[0]?.slot as number;
    expect(game.canBuildAt(slot)).toBe(false);
    expect(game.build(slot)).toBeUndefined();
    const cost = game.obstacleClearCost();
    const gold = game.state.gold;
    expect(game.clearObstacle(slot)).toBe(true);
    expect(game.state.gold).toBe(gold - cost);
    expect(game.obstacleAt(slot)).toBeUndefined();
    expect(game.build(slot)).toBeDefined();
    expect(game.clearObstacle(slot)).toBe(false);
  });

  it('Auto-Bau nutzt keine blockierten Plätze', () => {
    const game = gameOn();
    game.setAutoBuild(true);
    for (let i = 0; i < 2000; i++) game.update(BALANCE.stepSeconds);
    const blocked = new Set(CONTINENT_MAP.obstacles.map((o) => o.slot));
    expect(game.state.towers.length).toBeGreaterThan(10);
    expect(game.state.towers.some((t) => blocked.has(t.slot))).toBe(false);
  });
});

describe('Mehrere Wege', () => {
  it('Gegner verteilen sich auf beide Wege und kommen am Ziel an', () => {
    const game = gameOn(FACTORY_MAP, 3);
    for (let i = 0; i < 6; i++) spawnEnemy(game.ctx, { defId: 'laeufer', element: null }, 1);
    const paths = new Set(game.state.enemies.map((e) => e.pathIndex));
    expect(paths.size).toBe(2);
    const lives = game.state.lives;
    for (let i = 0; i < 60 * 60; i++) game.update(BALANCE.stepSeconds);
    expect(game.state.lives).toBeLessThan(lives);
  });
});

describe('Roboter-Anpassung (Roboterfabrik)', () => {
  it('nach 25 Wellen resistent gegen die meistgenutzte Schadensart', () => {
    const game = gameOn(FACTORY_MAP);
    const enemy = spawnEnemy(game.ctx, { defId: 'boss', element: null }, 1);
    enemy.hp = enemy.maxHp = 1e6;
    applyDamage(game.ctx, enemy, 100, 0, { category: 'gift' });
    applyDamage(game.ctx, enemy, 30, 0, { category: 'direkt' });
    const hpBefore = enemy.hp;
    // Wellenstart 25 auslösen
    game.state.wave.current = 24;
    game.state.wave.countdown = 0;
    game.update(BALANCE.stepSeconds);
    expect(game.state.wave.current).toBe(25);
    expect(game.state.adaptation?.resist.gift).toBeCloseTo(FACTORY_MAP.adaptive?.step ?? 0);
    expect(game.state.adaptation?.resist.direkt).toBe(0);
    const hp = enemy.hp;
    applyDamage(game.ctx, enemy, 100, 0, { category: 'gift' });
    expect(hp - enemy.hp).toBeCloseTo(100 * (1 - (FACTORY_MAP.adaptive?.step ?? 0)));
    expect(hpBefore).toBeGreaterThan(0);
  });

  it('übersprungene Wellen holen fällige Anpassungen nach, eine pro Wellenstart', () => {
    const game = gameOn(FACTORY_MAP);
    const enemy = spawnEnemy(game.ctx, { defId: 'boss', element: null }, 1);
    enemy.hp = enemy.maxHp = 1e9;
    applyDamage(game.ctx, enemy, 100, 0, { category: 'krit' });
    game.state.wave.current = 60; // Stufe 1 und 2 sind fällig
    game.state.wave.countdown = 0;
    game.update(BALANCE.stepSeconds);
    expect(game.state.adaptation?.stage).toBe(1);
    applyDamage(game.ctx, enemy, 100, 0, { category: 'krit' });
    game.state.wave.countdown = 0;
    game.update(BALANCE.stepSeconds);
    expect(game.state.adaptation?.stage).toBe(2);
    expect(game.state.adaptation?.resist.krit).toBeCloseTo(2 * (FACTORY_MAP.adaptive?.step ?? 0));
  });

  it('auf anderen Karten keine Anpassung', () => {
    const game = gameOn(CONTINENT_MAP);
    const enemy = spawnEnemy(game.ctx, { defId: 'boss', element: null }, 1);
    applyDamage(game.ctx, enemy, 100, 0, { category: 'gift' });
    game.state.wave.current = 24;
    game.state.wave.countdown = 0;
    game.update(BALANCE.stepSeconds);
    expect(game.state.adaptation?.resist.gift).toBe(0);
  });
});

describe('Kartenwahl', () => {
  it('Freischaltung über Bestwelle der vorigen Karte, Wechsel rechnet den Run ab', () => {
    const meta = createInitialMeta();
    const game = new Game(START_MAP, meta);
    expect(isMapUnlocked(meta, CONTINENT_MAP)).toBe(false);
    expect(game.switchMap(CONTINENT_MAP.id)).toBeUndefined();
    expect(game.map.id).toBe(START_MAP.id);

    game.state.wave.current = 60;
    const report = game.endRun();
    expect(report.total).toBeGreaterThan(0);
    expect(isMapUnlocked(meta, CONTINENT_MAP)).toBe(true);

    game.state.wave.current = 10;
    const dnaBefore = meta.dna;
    const switchReport = game.switchMap(CONTINENT_MAP.id);
    expect(switchReport?.wave).toBe(10);
    expect(meta.dna).toBeGreaterThan(dnaBefore);
    expect(game.map.id).toBe(CONTINENT_MAP.id);
    expect(game.state.mapId).toBe(CONTINENT_MAP.id);
    expect(game.state.wave.current).toBe(0);
  });

  it('Erfolge je Karte: Urkontinent Feuerrate, Fabrik DNA', () => {
    const meta = createInitialMeta();
    meta.bestWaveByMap.urkontinent = 100;
    meta.bestWaveByMap.fabrik = 50;
    const v = metaValues(meta);
    expect(v.achievementFireRateMult).toBeCloseTo(1.1);
    expect(v.achievementDnaMult).toBeCloseTo(1.1);
    expect(v.achievementDamageMult).toBe(1);
  });
});
