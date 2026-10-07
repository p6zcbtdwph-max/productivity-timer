import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance';
import { describeBonus, scaleBonus } from '../src/data/bonuses';
import { computeStats, resolveBonuses } from '../src/game/systems/StatsSystem';

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
    const stats = computeStats({ defId: 'affe', level: 1 });
    // Fläche: Maximum aus Frosch (Vorfahre, 0.8 × 0.5) und Elefant (Geschwister, 1.4 × 0.25).
    expect(stats.splashRadius).toBeCloseTo(Math.max(0.8 * BALANCE.bonuses.ancestorStrength, 1.4 * BALANCE.bonuses.siblingStrength));
    expect(stats.range).toBeGreaterThan(2.5);
    expect(stats.critChance).toBeCloseTo(0.35); // kein Krit bei Vorfahren oder Geschwistern
    expect(stats.targets).toBe(1); // Wolf-Bonus (+1 Ziel) × 0.25 rundet auf 0
  });

  it('Level erhöht Schaden und Feuerrate', () => {
    const l1 = computeStats({ defId: 'wurm', level: 1 });
    const l5 = computeStats({ defId: 'wurm', level: 5 });
    expect(l5.damage).toBeGreaterThan(l1.damage);
    expect(l5.cooldown).toBeLessThan(l1.cooldown);
    expect(l5.onHit.poison?.dps).toBeGreaterThan(l1.onHit.poison?.dps ?? 0);
  });

  it('Endformen sind deutlich stärker als der Einzeller', () => {
    const root = computeStats({ defId: 'einzeller', level: 1 });
    const final = computeStats({ defId: 'weisser_hai', level: 1 });
    expect(final.damage / final.cooldown).toBeGreaterThan((root.damage / root.cooldown) * 12);
  });
});
