/**
 * Die 16 Türme des Prototyps, angeordnet als Stammbaum nach der echten
 * Tier-Evolution (stark vereinfacht):
 *
 *  Einzeller (Choanoflagellat)
 *  ├─ Schwamm      (Porifera)
 *  ├─ Qualle       (Cnidaria)
 *  └─ Wurm         (Bilateria)
 *     ├─ Oktopus   (Mollusca)
 *     ├─ Skorpion  (Arthropoda)
 *     └─ Fisch     (Chordata)
 *        ├─ Hai    (Chondrichthyes)
 *        └─ Frosch (Amphibia)
 *           ├─ Echse      (Sauropsida)
 *           │  ├─ Krokodil (Crocodylia)
 *           │  └─ Vogel    (Aves / Dinosaurier-Linie)
 *           └─ Spitzmaus  (Synapsida / Ursäuger)
 *              ├─ Wolf     (Carnivora)
 *              ├─ Elefant  (Proboscidea)
 *              └─ Affe     (Primates)
 *
 * Tier = evolutionäre Stufe. Schaden verdoppelt sich grob pro Tier, damit die
 * Türme mit der 2er-Potenz-Skalierung der Gegner Schritt halten.
 */

export type TowerId =
  | 'einzeller'
  | 'schwamm'
  | 'qualle'
  | 'wurm'
  | 'oktopus'
  | 'skorpion'
  | 'fisch'
  | 'hai'
  | 'frosch'
  | 'echse'
  | 'spitzmaus'
  | 'krokodil'
  | 'vogel'
  | 'wolf'
  | 'elefant'
  | 'affe';

export type Targeting = 'first' | 'strongest' | 'closest';

/** Wie ein Treffer wirkt. Neue Angriffsarten werden hier ergänzt. */
export type AttackDef =
  | { kind: 'single' }
  | { kind: 'splash'; radius: number }
  | { kind: 'multi'; targets: number };

/** Statuseffekte, die ein Treffer auf dem Gegner hinterlässt. */
export type StatusEffectDef =
  | { kind: 'slow'; factor: number; duration: number }
  | { kind: 'poison'; dps: number; duration: number };

export interface TowerStats {
  damage: number;
  /** Reichweite in Zellen. */
  range: number;
  /** Sekunden zwischen zwei Schüssen. */
  cooldown: number;
  /** Zellen pro Sekunde. */
  projectileSpeed: number;
  critChance: number;
  critMultiplier: number;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  /** Taxon / Linie, aus der Realität. */
  lineage: string;
  tier: number;
  color: string;
  description: string;
  evolvesTo: readonly TowerId[];
  stats: TowerStats;
  targeting: Targeting;
  attack: AttackDef;
  onHit: readonly StatusEffectDef[];
}

const base = (overrides: Partial<TowerStats>): TowerStats => ({
  damage: 1,
  range: 2.5,
  cooldown: 1,
  projectileSpeed: 9,
  critChance: 0,
  critMultiplier: 2,
  ...overrides,
});

export const TOWER_DEFS: Readonly<Record<TowerId, TowerDef>> = {
  einzeller: {
    id: 'einzeller',
    name: 'Einzeller',
    lineage: 'Choanoflagellata',
    tier: 0,
    color: '#9be7a0',
    description: 'Der Ursprung allen tierischen Lebens. Schwach, aber aus ihm kann alles entstehen.',
    evolvesTo: ['schwamm', 'qualle', 'wurm'],
    stats: base({ damage: 4, range: 2.5, cooldown: 1.0 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [],
  },

  schwamm: {
    id: 'schwamm',
    name: 'Schwamm',
    lineage: 'Porifera',
    tier: 1,
    color: '#f2c14e',
    description: 'Filtriert alles in großem Umkreis. Langsam, aber mit Flächenwirkung.',
    evolvesTo: [],
    stats: base({ damage: 5, range: 3.2, cooldown: 1.5, projectileSpeed: 6 }),
    targeting: 'first',
    attack: { kind: 'splash', radius: 0.9 },
    onHit: [],
  },

  qualle: {
    id: 'qualle',
    name: 'Qualle',
    lineage: 'Cnidaria',
    tier: 1,
    color: '#c58cff',
    description: 'Nesselzellen lähmen die Zielsysteme der Roboter.',
    evolvesTo: [],
    stats: base({ damage: 3, range: 2.6, cooldown: 0.9 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [{ kind: 'slow', factor: 0.6, duration: 1.5 }],
  },

  wurm: {
    id: 'wurm',
    name: 'Wurm',
    lineage: 'Bilateria',
    tier: 1,
    color: '#d98c6a',
    description: 'Erstes Tier mit Vorne und Hinten. Sondert korrodierendes Sekret ab.',
    evolvesTo: ['oktopus', 'skorpion', 'fisch'],
    stats: base({ damage: 3, range: 2.4, cooldown: 1.0 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [{ kind: 'poison', dps: 1.5, duration: 3 }],
  },

  oktopus: {
    id: 'oktopus',
    name: 'Oktopus',
    lineage: 'Mollusca',
    tier: 2,
    color: '#ff7eb6',
    description: 'Acht Arme, drei Herzen: trifft mehrere Ziele gleichzeitig.',
    evolvesTo: [],
    stats: base({ damage: 5, range: 2.6, cooldown: 1.1 }),
    targeting: 'closest',
    attack: { kind: 'multi', targets: 3 },
    onHit: [],
  },

  skorpion: {
    id: 'skorpion',
    name: 'Skorpion',
    lineage: 'Arthropoda',
    tier: 2,
    color: '#e0b84c',
    description: 'Gepanzert und schnell. Giftstachel frisst sich durch Schaltkreise.',
    evolvesTo: [],
    stats: base({ damage: 5, range: 2.2, cooldown: 0.55, projectileSpeed: 11 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [{ kind: 'poison', dps: 3, duration: 3 }],
  },

  fisch: {
    id: 'fisch',
    name: 'Fisch',
    lineage: 'Chordata',
    tier: 2,
    color: '#5ec8f2',
    description: 'Wirbelsäule, Kiefer, Augen: ein echtes Jagdtier mit präzisen Schüssen.',
    evolvesTo: ['hai', 'frosch'],
    stats: base({ damage: 7, range: 2.8, cooldown: 0.8, projectileSpeed: 12 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [],
  },

  hai: {
    id: 'hai',
    name: 'Hai',
    lineage: 'Chondrichthyes',
    tier: 3,
    color: '#7f93a8',
    description: 'Seit 400 Millionen Jahren perfektioniert. Jagt immer das stärkste Ziel.',
    evolvesTo: [],
    stats: base({ damage: 22, range: 3.0, cooldown: 1.3, projectileSpeed: 14, critChance: 0.15 }),
    targeting: 'strongest',
    attack: { kind: 'single' },
    onHit: [],
  },

  frosch: {
    id: 'frosch',
    name: 'Frosch',
    lineage: 'Amphibia',
    tier: 3,
    color: '#6fd36f',
    description: 'Der Sprung ans Land. Klebrige Zungenschläge treffen ganze Gruppen.',
    evolvesTo: ['echse', 'spitzmaus'],
    stats: base({ damage: 12, range: 2.6, cooldown: 1.0, projectileSpeed: 8 }),
    targeting: 'first',
    attack: { kind: 'splash', radius: 1.0 },
    onHit: [],
  },

  echse: {
    id: 'echse',
    name: 'Echse',
    lineage: 'Sauropsida',
    tier: 4,
    color: '#8bc34a',
    description: 'Unabhängig vom Wasser. Zäh, ausdauernd, vielseitig.',
    evolvesTo: ['krokodil', 'vogel'],
    stats: base({ damage: 24, range: 2.9, cooldown: 0.8, projectileSpeed: 12 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [],
  },

  spitzmaus: {
    id: 'spitzmaus',
    name: 'Spitzmaus',
    lineage: 'Synapsida (Ursäuger)',
    tier: 4,
    color: '#b08968',
    description: 'Warmblütig und rastlos. Hoher Stoffwechsel, hohe Feuerrate.',
    evolvesTo: ['wolf', 'elefant', 'affe'],
    stats: base({ damage: 14, range: 2.6, cooldown: 0.4, projectileSpeed: 13 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [],
  },

  krokodil: {
    id: 'krokodil',
    name: 'Krokodil',
    lineage: 'Crocodylia',
    tier: 5,
    color: '#4e7d3a',
    description: 'Der stärkste Biss des Tierreichs. Hält jedes Ziel fest.',
    evolvesTo: [],
    stats: base({ damage: 70, range: 2.4, cooldown: 1.6, projectileSpeed: 10 }),
    targeting: 'strongest',
    attack: { kind: 'single' },
    onHit: [{ kind: 'slow', factor: 0.4, duration: 1.2 }],
  },

  vogel: {
    id: 'vogel',
    name: 'Vogel',
    lineage: 'Aves (Dinosauria)',
    tier: 5,
    color: '#4fc3f7',
    description: 'Letzter lebender Dinosaurier. Sieht alles aus großer Höhe.',
    evolvesTo: [],
    stats: base({ damage: 40, range: 4.2, cooldown: 0.7, projectileSpeed: 18 }),
    targeting: 'first',
    attack: { kind: 'single' },
    onHit: [],
  },

  wolf: {
    id: 'wolf',
    name: 'Wolf',
    lineage: 'Carnivora',
    tier: 5,
    color: '#9e9e9e',
    description: 'Jagt im Rudel: jeder weitere Wolf macht das Rudel gefährlicher.',
    evolvesTo: [],
    stats: base({ damage: 30, range: 2.8, cooldown: 0.6, projectileSpeed: 14, critChance: 0.2 }),
    targeting: 'first',
    attack: { kind: 'multi', targets: 2 },
    onHit: [],
  },

  elefant: {
    id: 'elefant',
    name: 'Elefant',
    lineage: 'Proboscidea',
    tier: 5,
    color: '#8d99ae',
    description: 'Jeder Tritt lässt den Boden beben. Massive Flächenwirkung.',
    evolvesTo: [],
    stats: base({ damage: 80, range: 2.6, cooldown: 1.8, projectileSpeed: 7 }),
    targeting: 'first',
    attack: { kind: 'splash', radius: 1.4 },
    onHit: [{ kind: 'slow', factor: 0.7, duration: 1.0 }],
  },

  affe: {
    id: 'affe',
    name: 'Affe',
    lineage: 'Primates',
    tier: 5,
    color: '#f4a261',
    description: 'Werkzeuggebrauch und Köpfchen: findet jede Schwachstelle.',
    evolvesTo: [],
    stats: base({ damage: 32, range: 3.0, cooldown: 0.7, projectileSpeed: 13, critChance: 0.4, critMultiplier: 3 }),
    targeting: 'strongest',
    attack: { kind: 'single' },
    onHit: [],
  },
};

export const TOWER_IDS = Object.keys(TOWER_DEFS) as TowerId[];

/** Der einzige Turm, den der Spieler direkt bauen kann. */
export const ROOT_TOWER: TowerId = 'einzeller';

export function getTowerDef(id: TowerId): TowerDef {
  return TOWER_DEFS[id];
}

/** Elternknoten im Stammbaum (undefined für den Einzeller). */
export function parentOf(id: TowerId): TowerId | undefined {
  return TOWER_IDS.find((candidate) => TOWER_DEFS[candidate].evolvesTo.includes(id));
}

/** Vollständige Abstammungslinie vom Einzeller bis zum Turm. */
export function lineageOf(id: TowerId): TowerId[] {
  const chain: TowerId[] = [id];
  let current = parentOf(id);
  while (current) {
    chain.unshift(current);
    current = parentOf(current);
  }
  return chain;
}
