import { describe, expect, it } from 'vitest';
import {
  baseStatsFor,
  childrenOf,
  isFinalForm,
  lineageOf,
  MAX_TIER,
  parentOf,
  ROOT_TOWER,
  TOWER_DEFS,
  TOWER_IDS,
  type TowerId,
} from '../src/data/towers';

describe('Stammbaum der Türme', () => {
  it('jede Art außer den Endformen teilt sich in 2 oder 3 Nachfahren', () => {
    for (const id of TOWER_IDS) {
      const children = childrenOf(id);
      if (isFinalForm(id)) continue;
      expect(children.length, `${id} hat ${children.length} Nachfahren`).toBeGreaterThanOrEqual(2);
      expect(children.length, `${id} hat ${children.length} Nachfahren`).toBeLessThanOrEqual(3);
    }
  });

  it('alle Endformen liegen auf MAX_TIER, alle anderen darunter', () => {
    for (const id of TOWER_IDS) {
      const tier = TOWER_DEFS[id].tier;
      if (isFinalForm(id)) expect(tier, `${id} endet zu früh`).toBe(MAX_TIER);
      else expect(tier).toBeLessThan(MAX_TIER);
    }
  });

  it('alle Arten sind vom Einzeller aus erreichbar und haben genau einen Elternknoten', () => {
    const seen = new Set<TowerId>();
    const stack: TowerId[] = [ROOT_TOWER];
    while (stack.length) {
      const id = stack.pop() as TowerId;
      expect(seen.has(id), `${id} wird doppelt erreicht`).toBe(false);
      seen.add(id);
      stack.push(...childrenOf(id));
    }
    expect([...seen].sort()).toEqual([...TOWER_IDS].sort());
    expect(parentOf(ROOT_TOWER)).toBeNull();
  });

  it('Evolution erhöht das Tier um genau eins', () => {
    for (const id of TOWER_IDS) {
      const parent = parentOf(id);
      if (parent) expect(TOWER_DEFS[id].tier).toBe(TOWER_DEFS[parent].tier + 1);
    }
  });

  it('Abstammungslinie des Affen führt über die realen Vorfahren', () => {
    expect(lineageOf('affe')).toEqual(['einzeller', 'fisch', 'frosch', 'spitzmaus', 'affe']);
  });

  it('Grundschaden pro Sekunde verdoppelt sich pro Tier, unabhängig vom Archetyp', () => {
    for (const archetype of ['ausgewogen', 'schnell', 'schwer', 'weit'] as const) {
      const dps0 = baseStatsFor(0, archetype).damage / baseStatsFor(0, archetype).cooldown;
      const dps3 = baseStatsFor(3, archetype).damage / baseStatsFor(3, archetype).cooldown;
      expect(dps3).toBeCloseTo(dps0 * 8);
    }
  });

  it('jede Art hat eine eigene Farbe', () => {
    const colors = new Set(TOWER_IDS.map((id) => TOWER_DEFS[id].color));
    expect(colors.size).toBe(TOWER_IDS.length);
  });
});
