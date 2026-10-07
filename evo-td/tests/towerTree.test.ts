import { describe, expect, it } from 'vitest';
import { lineageOf, parentOf, ROOT_TOWER, TOWER_DEFS, TOWER_IDS, type TowerId } from '../src/data/towers';

describe('Stammbaum der Türme', () => {
  it('enthält genau 16 Arten', () => {
    expect(TOWER_IDS).toHaveLength(16);
  });

  it('jede Art außer dem Einzeller hat genau einen Vorfahren', () => {
    for (const id of TOWER_IDS) {
      const parents = TOWER_IDS.filter((p) => TOWER_DEFS[p].evolvesTo.includes(id));
      if (id === ROOT_TOWER) expect(parents).toHaveLength(0);
      else expect(parents, `${id} hat ${parents.length} Eltern`).toHaveLength(1);
    }
  });

  it('alle Arten sind vom Einzeller aus erreichbar', () => {
    const seen = new Set<TowerId>();
    const stack: TowerId[] = [ROOT_TOWER];
    while (stack.length) {
      const id = stack.pop() as TowerId;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...TOWER_DEFS[id].evolvesTo);
    }
    expect([...seen].sort()).toEqual([...TOWER_IDS].sort());
  });

  it('Evolution erhöht das Tier um genau eins', () => {
    for (const id of TOWER_IDS) {
      for (const child of TOWER_DEFS[id].evolvesTo) {
        expect(TOWER_DEFS[child].tier).toBe(TOWER_DEFS[id].tier + 1);
      }
    }
  });

  it('Abstammungslinie des Affen führt über die realen Vorfahren', () => {
    expect(lineageOf('affe')).toEqual(['einzeller', 'wurm', 'fisch', 'frosch', 'spitzmaus', 'affe']);
    expect(parentOf('einzeller')).toBeUndefined();
  });

  it('Schaden wächst grob mit 2^Tier (Gegner skalieren in 2er-Potenzen)', () => {
    const rootDps = TOWER_DEFS.einzeller.stats.damage / TOWER_DEFS.einzeller.stats.cooldown;
    for (const id of TOWER_IDS) {
      const def = TOWER_DEFS[id];
      if (def.tier === 0) continue;
      const critFactor = 1 + def.stats.critChance * (def.stats.critMultiplier - 1);
      const hits = def.attack.kind === 'multi' ? def.attack.targets : 1;
      const dps = (def.stats.damage / def.stats.cooldown) * critFactor * hits;
      // Mindestens ein Drittel der "erwarteten" Verdopplung je Tier; Fläche,
      // Slow und Gift zählen hier bewusst nicht mit (das ist deren Ausgleich).
      expect(dps, `${id} ist zu schwach für Tier ${def.tier}`).toBeGreaterThanOrEqual((rootDps * 2 ** def.tier) / 3);
    }
  });
});
