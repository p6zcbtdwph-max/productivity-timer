import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { describeBonus, scaleBonus } from '../src/data/bonuses';
import { START_MAP } from '../src/data/map';
import { Game } from '../src/game/Game';
import { createInitialState } from '../src/game/GameState';
import { createInitialMeta } from '../src/game/MetaState';
import { metaValues } from '../src/game/systems/MetaSystem';
import { childrenOf } from '../src/data/towers';
import { NO_MODIFIERS } from '../src/game/systems/ModifierSystem';
import { computeStats, EMPTY_ENVIRONMENT, neighbourDefIds, resolveBonuses } from '../src/game/systems/StatsSystem';

describe('Boni und effektive Stats', () => {
  it('Einzeller hat nur seinen eigenen Bonus', () => {
    const bonuses = resolveBonuses('einzeller');
    expect(bonuses).toHaveLength(1);
    expect(bonuses[0]?.source).toBe('eigen');
    expect(bonuses[0]?.strength).toBe(1);
  });

  it('Vorfahren- und Geschwister-Boni bleiben mit reduzierter Stärke erhalten', () => {
    // Affe: Vorfahren Einzeller, Fisch, Frosch, Spitzmaus; Geschwister Wolf, Elefant.
    const bonuses = resolveBonuses('affe');
    const own = bonuses.filter((b) => b.source === 'eigen');
    const ancestors = bonuses.filter((b) => b.source === 'vorfahre');
    const siblings = bonuses.filter((b) => b.source === 'geschwister');
    expect(own.map((b) => b.from)).toEqual(['affe']);
    expect(ancestors.map((b) => b.from)).toEqual(['einzeller', 'fisch', 'frosch', 'spitzmaus']);
    expect(siblings.map((b) => b.from).sort()).toEqual(['elefant', 'wolf']);
    for (const b of ancestors) expect(b.strength).toBe(BALANCE.bonuses.ancestorStrength);
    for (const b of siblings) expect(b.strength).toBe(BALANCE.bonuses.siblingStrength);
  });

  it('skalierte Boni sind proportional schwächer', () => {
    expect(scaleBonus({ kind: 'range', percent: 0.4 }, 0.5)).toEqual({ kind: 'range', percent: 0.2 });
    expect(scaleBonus({ kind: 'slow', amount: 0.6, duration: 2 }, 0.25)).toEqual({ kind: 'slow', amount: 0.15, duration: 2 });
    expect(describeBonus({ kind: 'gold', percent: 0.5 })).toBe('+50 % Gold');
  });

  it('Affe erbt Fläche vom Frosch/Elefanten und Reichweite vom Fisch', () => {
    const stats = computeStats({ defId: 'affe', level: 1, prestige: 0 });
    // Fläche: Maximum aus Frosch (Vorfahre, 0.8 × 0.5) und Elefant (Geschwister, 1.4 × 0.25).
    expect(stats.splashRadius).toBeCloseTo(Math.max(0.8 * BALANCE.bonuses.ancestorStrength, 1.4 * BALANCE.bonuses.siblingStrength));
    expect(stats.range).toBeGreaterThan(2.5);
    expect(stats.critChance).toBeCloseTo(0.35); // kein Krit bei Vorfahren oder Geschwistern
    expect(stats.targets).toBe(1); // Wolf-Bonus (+1 Ziel) × 0.25 rundet auf 0
  });

  it('Level erhöht Schaden und Feuerrate', () => {
    const l1 = computeStats({ defId: 'wurm', level: 1, prestige: 0 });
    const l5 = computeStats({ defId: 'wurm', level: 5, prestige: 0 });
    expect(l5.damage).toBeGreaterThan(l1.damage);
    expect(l5.cooldown).toBeLessThan(l1.cooldown);
    expect(l5.onHit.poison?.dps).toBeGreaterThan(l1.onHit.poison?.dps ?? 0);
  });

  it('Endformen sind deutlich stärker als der Einzeller', () => {
    const root = computeStats({ defId: 'einzeller', level: 1, prestige: 0 });
    const final = computeStats({ defId: 'weisser_hai', level: 1, prestige: 0 });
    expect(final.damage / final.cooldown).toBeGreaterThan((root.damage / root.cooldown) * 12);
  });
});

describe('Nachbarn, Prestige und globale Modifikatoren', () => {
  it('direkt angrenzende Türme geben ein Viertel ihres eigenen Bonus', () => {
    const env = { ...EMPTY_ENVIRONMENT, neighbours: ['hai'] };
    const alone = computeStats({ defId: 'einzeller', level: 1, prestige: 0 });
    const withNeighbour = computeStats({ defId: 'einzeller', level: 1, prestige: 0 }, env);
    // Hai: +30 % Schaden → als Nachbar +7.5 %
    expect(withNeighbour.damage / alone.damage).toBeCloseTo(1 + 0.3 * BALANCE.bonuses.neighbourStrength);
    const sources = resolveBonuses('einzeller', env).map((b) => b.source);
    expect(sources).toContain('nachbar');
  });

  it('Nachbarschaft wird aus den Bauplätzen berechnet', () => {
    const game = new Game(START_MAP, createInitialMeta(), createInitialState(5));
    game.state.gold = 1_000_000;
    // Plätze 0 und 1 liegen nebeneinander (Zeile 1, Spalten 0 und 1), Platz 20 weit weg.
    const a = game.build(0);
    const b = game.build(1);
    const far = game.build(20);
    if (!a || !b || !far) throw new Error('Bau fehlgeschlagen');
    expect(neighbourDefIds(game.ctx, a)).toEqual(['einzeller']);
    expect(neighbourDefIds(game.ctx, far)).toEqual([]);
  });

  it('Prestige verstärkt Schaden, Feuerrate und Reichweite', () => {
    const p0 = computeStats({ defId: 'wurm', level: 1, prestige: 0 });
    const p2 = computeStats({ defId: 'wurm', level: 1, prestige: 2 });
    expect(p2.damage / p0.damage).toBeCloseTo(1 + 2 * BALANCE.prestige.damagePerLevel);
    expect(p2.cooldown).toBeLessThan(p0.cooldown);
    expect(p2.range).toBeGreaterThan(p0.range);
  });

  it('"Sekundäre Effekte" verstärkt geerbte Boni, nicht den eigenen', () => {
    const env = { ...EMPTY_ENVIRONMENT, modifiers: { ...NO_MODIFIERS, secondary: 1 } };
    const bonuses = resolveBonuses('fisch', env);
    const own = bonuses.find((b) => b.source === 'eigen');
    const inherited = bonuses.find((b) => b.source === 'vorfahre');
    expect(own?.strength).toBe(1);
    expect(inherited?.strength).toBeCloseTo(BALANCE.bonuses.ancestorStrength * 2);
  });
});

describe('Verrechnungstöpfe', () => {
  it('Art additiv, Ausrüstung additiv, Töpfe multiplikativ, Mutation als eigener Faktor', () => {
    const titanWolf = childrenOf('wolf').find((id) => id.endsWith('+titan')) ?? 'wolf+titan';
    const env = { ...EMPTY_ENVIRONMENT, modifiers: { ...NO_MODIFIERS, damage: 0.5 } };
    const stats = computeStats({ defId: titanWolf, level: 3, prestige: 1 }, env);
    const b = stats.breakdown.damage;
    expect(b.ausruestung).toBeCloseTo(1.5);
    expect(b.mutation).toBeCloseTo(1.25);
    expect(b.prestige).toBeCloseTo(1 + BALANCE.prestige.damagePerLevel);
    expect(b.level).toBeCloseTo(1 + 2 * BALANCE.xp.statPerLevel);
    expect(b.result).toBeCloseTo(b.base * b.art * b.ausruestung * b.mutation * b.synergie * b.prestige * b.level * b.meta * b.erfolge * b.kompendium * b.gelaende * b.flug * b.garten);
    expect(stats.damage).toBeCloseTo(b.result);
  });

  it('Synergie: gleiche Nachbarn multiplizieren, fremde nicht', () => {
    const twins = computeStats({ defId: 'wolf', level: 1, prestige: 0 }, { ...EMPTY_ENVIRONMENT, neighbours: ['wolf', 'wolf', 'hai'] });
    expect(twins.breakdown.damage.synergie).toBeCloseTo(1 + 2 * BALANCE.synergy.damagePerTwin);
    expect(twins.breakdown.fireRate.synergie).toBeCloseTo(1 + 2 * BALANCE.synergy.fireRatePerTwin);
  });

  it('Karten-Erfolge sind ein eigener Topf', () => {
    const meta = createInitialMeta();
    meta.bestWaveByMap.urmeer = 100;
    const stats = computeStats({ defId: 'wurm', level: 1, prestige: 0 }, { ...EMPTY_ENVIRONMENT, meta: metaValues(meta) });
    expect(stats.breakdown.damage.erfolge).toBeCloseTo(1.2);
  });

  it('Meta-Schaden ist ein eigener Topf', () => {
    const meta = createInitialMeta();
    meta.upgrades.damage = 5;
    const env = { ...EMPTY_ENVIRONMENT, meta: metaValues(meta) };
    const stats = computeStats({ defId: 'wurm', level: 1, prestige: 0 }, env);
    expect(stats.breakdown.damage.meta).toBeCloseTo(1.4);
  });
});
