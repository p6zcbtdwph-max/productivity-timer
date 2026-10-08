import { describe, expect, it } from 'vitest';
import {
  BASE_MAX_TIER,
  BASE_TOWER_IDS,
  baseStatsFor,
  childrenOf,
  getTowerDef,
  isFinalForm,
  isValidTowerId,
  lineageOf,
  MAX_TIER,
  mutationIdsOf,
  parentOf,
  ROOT_TOWER,
  siblingsOf,
  unlockXp,
  type TowerId,
} from '../src/data/towers';

describe('Stammbaum der Türme', () => {
  it('jede Art außer den Endformen teilt sich in 2 oder 3 Nachfahren', () => {
    for (const id of BASE_TOWER_IDS) {
      const children = childrenOf(id);
      if (isFinalForm(id)) continue;
      expect(children.length, `${id} hat ${children.length} Nachfahren`).toBeGreaterThanOrEqual(2);
      expect(children.length, `${id} hat ${children.length} Nachfahren`).toBeLessThanOrEqual(3);
    }
  });

  it('alle Basis-Endformen liegen auf BASE_MAX_TIER und teilen sich weiter in Mutationen', () => {
    for (const id of BASE_TOWER_IDS) {
      const tier = getTowerDef(id).tier;
      const baseChildren = childrenOf(id).filter((c) => BASE_TOWER_IDS.includes(c as never));
      if (baseChildren.length === 0) expect(tier, `${id} endet zu früh`).toBe(BASE_MAX_TIER);
      expect(isFinalForm(id)).toBe(false);
    }
  });

  it('Mutationen: 2 je Art, eindeutige Kennungen, kein Doppel in einer Linie, Ende bei MAX_TIER', () => {
    let id: TowerId = 'wolf';
    for (let tier = BASE_MAX_TIER; tier < MAX_TIER; tier++) {
      const kids = childrenOf(id);
      expect(kids).toHaveLength(2);
      expect(new Set(kids).size).toBe(2);
      for (const kid of kids) {
        expect(isValidTowerId(kid)).toBe(true);
        expect(getTowerDef(kid).tier).toBe(tier + 1);
        expect(parentOf(kid)).toBe(id);
        const chain = mutationIdsOf(kid);
        expect(new Set(chain).size).toBe(chain.length);
      }
      expect(siblingsOf(kids[0] as TowerId)).toEqual([kids[1]]);
      id = kids[0] as TowerId;
    }
    expect(childrenOf(id)).toEqual([]);
    expect(isFinalForm(id)).toBe(true);
    expect(getTowerDef(id).name.split('-').length).toBe(MAX_TIER - BASE_MAX_TIER + 1);
    expect(isValidTowerId('wolf+nix')).toBe(false);
    expect(() => getTowerDef('nix')).toThrow();
  });

  it('Freischalt-XP: frei bis Tier 1, danach 1.500 XP der Elternart, ×10 je Tier', () => {
    expect(unlockXp('einzeller')).toBe(0);
    expect(unlockXp('wurm')).toBe(0);
    expect(unlockXp('schnecke')).toBe(1500);
    expect(unlockXp('tintenfisch')).toBe(15_000);
    expect(unlockXp('oktopus')).toBe(150_000);
    expect(unlockXp(childrenOf('oktopus')[0] as TowerId)).toBe(1_500_000);
  });

  it('alle Basisarten sind vom Einzeller aus erreichbar und haben genau einen Elternknoten', () => {
    const seen = new Set<TowerId>();
    const stack: TowerId[] = [ROOT_TOWER];
    while (stack.length) {
      const id = stack.pop() as TowerId;
      expect(seen.has(id), `${id} wird doppelt erreicht`).toBe(false);
      seen.add(id);
      stack.push(...childrenOf(id).filter((c) => getTowerDef(c).tier <= BASE_MAX_TIER));
    }
    expect([...seen].sort()).toEqual([...BASE_TOWER_IDS].sort());
    expect(parentOf(ROOT_TOWER)).toBeNull();
  });

  it('Evolution erhöht das Tier um genau eins', () => {
    for (const id of BASE_TOWER_IDS) {
      const parent = parentOf(id);
      if (parent) expect(getTowerDef(id).tier).toBe(getTowerDef(parent).tier + 1);
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
    const colors = new Set(BASE_TOWER_IDS.map((id) => getTowerDef(id).color));
    expect(colors.size).toBe(BASE_TOWER_IDS.length);
  });
});
