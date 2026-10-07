/**
 * Stammbaum der Türme, angelehnt an die echte Tier-Evolution (stark vereinfacht).
 *
 * Regeln:
 *  - Jede Art außer den Endformen teilt sich in 2 oder 3 Nachfahren.
 *  - Alle Endformen liegen auf demselben Tier (MAX_TIER), damit jede Linie
 *    gleich viele Evolutionen durchläuft.
 *  - Jede Art hat genau einen Bonus. Vorfahren- und Geschwister-Boni bleiben
 *    als sekundäre Eigenschaften erhalten (siehe StatsSystem).
 *  - Kampfwerte werden NICHT pro Art gepflegt, sondern aus Tier + Archetyp
 *    abgeleitet (`baseStatsFor`). So bleibt ein großer Baum balancierbar.
 *
 *  Einzeller
 *  ├─ Wurm (Protostomia)
 *  │  ├─ Schnecke (Mollusca)
 *  │  │  ├─ Tintenfisch (Cephalopoda) ─ Oktopus, Kalmar
 *  │  │  └─ Muschel (Bivalvia) ─ Auster, Riesenmuschel
 *  │  └─ Trilobit (Arthropoda)
 *  │     ├─ Seeskorpion (Eurypterida) ─ Skorpion, Spinne
 *  │     └─ Insekt (Insecta) ─ Käfer, Libelle
 *  └─ Fisch (Chordata)
 *     ├─ Knorpelfisch (Chondrichthyes)
 *     │  ├─ Hai ─ Weißer Hai, Hammerhai
 *     │  └─ Rochen ─ Manta, Zitterrochen
 *     └─ Frosch (Tetrapoda)
 *        ├─ Echse (Sauropsida) ─ Krokodil, Vogel, Schlange
 *        └─ Spitzmaus (Synapsida) ─ Wolf, Elefant, Affe
 */
import type { BonusDef } from './bonuses';

export type TowerId =
  | 'einzeller'
  | 'wurm'
  | 'fisch'
  | 'schnecke'
  | 'trilobit'
  | 'knorpelfisch'
  | 'frosch'
  | 'tintenfisch'
  | 'muschel'
  | 'seeskorpion'
  | 'insekt'
  | 'hai'
  | 'rochen'
  | 'echse'
  | 'spitzmaus'
  | 'oktopus'
  | 'kalmar'
  | 'auster'
  | 'riesenmuschel'
  | 'skorpion'
  | 'spinne'
  | 'kaefer'
  | 'libelle'
  | 'weisser_hai'
  | 'hammerhai'
  | 'manta'
  | 'zitterrochen'
  | 'krokodil'
  | 'vogel'
  | 'schlange'
  | 'wolf'
  | 'elefant'
  | 'affe';

export type Targeting = 'first' | 'strongest' | 'closest';

/**
 * Archetyp = Grundcharakter der Kampfwerte. Alle Archetypen haben etwa
 * dieselbe Gesamtleistung, verteilen sie aber unterschiedlich.
 */
export type Archetype = 'ausgewogen' | 'schnell' | 'schwer' | 'weit';

export interface TowerDef {
  id: TowerId;
  name: string;
  /** Taxon / Linie aus der Realität. */
  lineage: string;
  tier: number;
  parent: TowerId | null;
  archetype: Archetype;
  targeting: Targeting;
  /** Die eigene Eigenschaft dieser Art. */
  bonus: BonusDef;
  color: string;
  description: string;
}

export interface BaseStats {
  damage: number;
  /** Reichweite in Zellen. */
  range: number;
  /** Sekunden zwischen zwei Schüssen. */
  cooldown: number;
  /** Zellen pro Sekunde. */
  projectileSpeed: number;
}

/** Tier der Endformen. */
export const MAX_TIER = 4;

/** Der einzige Turm, den der Spieler direkt bauen kann. */
export const ROOT_TOWER: TowerId = 'einzeller';

const ARCHETYPES: Readonly<Record<Archetype, { damage: number; cooldown: number; range: number }>> = {
  ausgewogen: { damage: 1.0, cooldown: 1.0, range: 1.0 },
  schnell: { damage: 0.5, cooldown: 0.45, range: 0.9 },
  schwer: { damage: 2.2, cooldown: 2.0, range: 1.0 },
  weit: { damage: 0.9, cooldown: 1.0, range: 1.4 },
};

/** Grundwerte aus Tier und Archetyp. Schaden verdoppelt sich pro Tier. */
export function baseStatsFor(tier: number, archetype: Archetype): BaseStats {
  const a = ARCHETYPES[archetype];
  return {
    damage: 4 * 2 ** tier * a.damage,
    cooldown: 1.0 * a.cooldown,
    range: 2.5 * a.range,
    projectileSpeed: 9 + tier * 1.5,
  };
}

type Def = Omit<TowerDef, 'id'>;

const DEFS: Readonly<Record<TowerId, Def>> = {
  // --- Tier 0 ---------------------------------------------------------------
  einzeller: {
    name: 'Einzeller',
    lineage: 'Choanoflagellata',
    tier: 0,
    parent: null,
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'xp', percent: 0.2 },
    color: '#9be7a0',
    description: 'Der Ursprung allen tierischen Lebens. Teilt sich fleißig und lernt schnell.',
  },

  // --- Tier 1 ---------------------------------------------------------------
  wurm: {
    name: 'Wurm',
    lineage: 'Protostomia',
    tier: 1,
    parent: 'einzeller',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'poison', percentOfDamage: 0.3, duration: 3 },
    color: '#d98c6a',
    description: 'Erstes Tier mit Vorne und Hinten. Sondert korrodierendes Sekret ab.',
  },
  fisch: {
    name: 'Fisch',
    lineage: 'Chordata',
    tier: 1,
    parent: 'einzeller',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'range', percent: 0.2 },
    color: '#5ec8f2',
    description: 'Wirbelsäule, Kiefer, Augen: sieht und trifft weiter als alles zuvor.',
  },

  // --- Tier 2 ---------------------------------------------------------------
  schnecke: {
    name: 'Schnecke',
    lineage: 'Mollusca',
    tier: 2,
    parent: 'wurm',
    archetype: 'schwer',
    targeting: 'first',
    bonus: { kind: 'slow', amount: 0.3, duration: 2 },
    color: '#c9a66b',
    description: 'Langsam, aber ihre Schleimspur bremst alles, was hindurch muss.',
  },
  trilobit: {
    name: 'Trilobit',
    lineage: 'Arthropoda',
    tier: 2,
    parent: 'wurm',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'shieldBreaker', percent: 0.5 },
    color: '#8d8d6e',
    description: 'Gepanzert und gegliedert. Knackt Panzer, weil es selbst einen hat.',
  },
  knorpelfisch: {
    name: 'Knorpelfisch',
    lineage: 'Chondrichthyes',
    tier: 2,
    parent: 'fisch',
    archetype: 'ausgewogen',
    targeting: 'strongest',
    bonus: { kind: 'crit', chance: 0.1, multiplier: 2 },
    color: '#7f93a8',
    description: 'Urahn der Haie. Spürt Schwachstellen über große Entfernungen.',
  },
  frosch: {
    name: 'Frosch',
    lineage: 'Tetrapoda',
    tier: 2,
    parent: 'fisch',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'splash', radius: 0.8 },
    color: '#6fd36f',
    description: 'Der Sprung ans Land. Klebrige Zungenschläge treffen ganze Gruppen.',
  },

  // --- Tier 3 ---------------------------------------------------------------
  tintenfisch: {
    name: 'Tintenfisch',
    lineage: 'Cephalopoda',
    tier: 3,
    parent: 'schnecke',
    archetype: 'ausgewogen',
    targeting: 'closest',
    bonus: { kind: 'multi', extraTargets: 2 },
    color: '#ff7eb6',
    description: 'Viele Arme, drei Herzen: greift mehrere Ziele gleichzeitig an.',
  },
  muschel: {
    name: 'Muschel',
    lineage: 'Bivalvia',
    tier: 3,
    parent: 'schnecke',
    archetype: 'schwer',
    targeting: 'first',
    bonus: { kind: 'gold', percent: 0.25 },
    color: '#e8d5b7',
    description: 'Filtert Wertvolles aus allem, was vorbeikommt. Perlen inklusive.',
  },
  seeskorpion: {
    name: 'Seeskorpion',
    lineage: 'Eurypterida',
    tier: 3,
    parent: 'trilobit',
    archetype: 'schwer',
    targeting: 'strongest',
    bonus: { kind: 'damage', percent: 0.25 },
    color: '#b5651d',
    description: 'Zwei Meter Raubtier der Urmeere. Schlägt hart zu.',
  },
  insekt: {
    name: 'Insekt',
    lineage: 'Insecta',
    tier: 3,
    parent: 'trilobit',
    archetype: 'schnell',
    targeting: 'first',
    bonus: { kind: 'fireRate', percent: 0.3 },
    color: '#e0b84c',
    description: 'Klein, zahlreich, rastlos. Sticht öfter zu als jedes andere Tier.',
  },
  hai: {
    name: 'Hai',
    lineage: 'Selachii',
    tier: 3,
    parent: 'knorpelfisch',
    archetype: 'schwer',
    targeting: 'strongest',
    bonus: { kind: 'damage', percent: 0.3 },
    color: '#5c6f82',
    description: 'Seit 400 Millionen Jahren perfektioniert. Jagt immer das stärkste Ziel.',
  },
  rochen: {
    name: 'Rochen',
    lineage: 'Batoidea',
    tier: 3,
    parent: 'knorpelfisch',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'antiHeal', percent: 0.5, duration: 3 },
    color: '#9fb3c8',
    description: 'Flach, elektrisch, störend: bringt Reparatursysteme durcheinander.',
  },
  echse: {
    name: 'Echse',
    lineage: 'Sauropsida',
    tier: 3,
    parent: 'frosch',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'range', percent: 0.25 },
    color: '#8bc34a',
    description: 'Unabhängig vom Wasser. Zäh, ausdauernd, mit scharfem Blick.',
  },
  spitzmaus: {
    name: 'Spitzmaus',
    lineage: 'Synapsida',
    tier: 3,
    parent: 'frosch',
    archetype: 'schnell',
    targeting: 'first',
    bonus: { kind: 'fireRate', percent: 0.35 },
    color: '#b08968',
    description: 'Warmblütig und rastlos. Hoher Stoffwechsel, hohe Feuerrate.',
  },

  // --- Tier 4 (Endformen) ---------------------------------------------------
  oktopus: {
    name: 'Oktopus',
    lineage: 'Octopoda',
    tier: 4,
    parent: 'tintenfisch',
    archetype: 'ausgewogen',
    targeting: 'closest',
    bonus: { kind: 'multi', extraTargets: 3 },
    color: '#ff5ca8',
    description: 'Acht Arme, neun Gehirne. Hält acht Roboter gleichzeitig beschäftigt.',
  },
  kalmar: {
    name: 'Kalmar',
    lineage: 'Teuthida',
    tier: 4,
    parent: 'tintenfisch',
    archetype: 'schnell',
    targeting: 'closest',
    bonus: { kind: 'fireRate', percent: 0.4 },
    color: '#ff9ecf',
    description: 'Düsenantrieb und Blitzreflexe. Feuert, bevor das Ziel reagiert.',
  },
  auster: {
    name: 'Auster',
    lineage: 'Ostreidae',
    tier: 4,
    parent: 'muschel',
    archetype: 'schwer',
    targeting: 'first',
    bonus: { kind: 'gold', percent: 0.5 },
    color: '#f0e6d2',
    description: 'Macht aus jedem Störenfried eine Perle. Verdoppelt fast die Beute.',
  },
  riesenmuschel: {
    name: 'Riesenmuschel',
    lineage: 'Tridacna',
    tier: 4,
    parent: 'muschel',
    archetype: 'schwer',
    targeting: 'first',
    bonus: { kind: 'splash', radius: 1.2 },
    color: '#c6b7e2',
    description: 'Zweihundert Kilo Schale. Wenn sie zuschnappt, bebt der Boden.',
  },
  skorpion: {
    name: 'Skorpion',
    lineage: 'Scorpiones',
    tier: 4,
    parent: 'seeskorpion',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'poison', percentOfDamage: 0.5, duration: 4 },
    color: '#d4a017',
    description: 'Der Giftstachel frisst sich noch lange nach dem Treffer durch Schaltkreise.',
  },
  spinne: {
    name: 'Spinne',
    lineage: 'Araneae',
    tier: 4,
    parent: 'seeskorpion',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'slow', amount: 0.5, duration: 2.5 },
    color: '#6b5b73',
    description: 'Netze aus Stahlseide. Wer hineinläuft, kommt kaum noch voran.',
  },
  kaefer: {
    name: 'Käfer',
    lineage: 'Coleoptera',
    tier: 4,
    parent: 'insekt',
    archetype: 'schwer',
    targeting: 'strongest',
    bonus: { kind: 'shieldBreaker', percent: 1.0 },
    color: '#4a6b3a',
    description: 'Härteste Panzerung im Tierreich. Durchschlägt jeden Energieschild.',
  },
  libelle: {
    name: 'Libelle',
    lineage: 'Odonata',
    tier: 4,
    parent: 'insekt',
    archetype: 'schnell',
    targeting: 'first',
    bonus: { kind: 'crit', chance: 0.25, multiplier: 2.5 },
    color: '#4dd0e1',
    description: 'Erfolgreichster Jäger der Welt: 95 % Trefferquote, jede Schwachstelle sitzt.',
  },
  weisser_hai: {
    name: 'Weißer Hai',
    lineage: 'Lamnidae',
    tier: 4,
    parent: 'hai',
    archetype: 'schwer',
    targeting: 'strongest',
    bonus: { kind: 'damage', percent: 0.5 },
    color: '#cfd8dc',
    description: 'Drei Tonnen Biss. Ein Treffer, und vom Boss bleibt wenig übrig.',
  },
  hammerhai: {
    name: 'Hammerhai',
    lineage: 'Sphyrnidae',
    tier: 4,
    parent: 'hai',
    archetype: 'ausgewogen',
    targeting: 'strongest',
    bonus: { kind: 'crit', chance: 0.3, multiplier: 2.5 },
    color: '#90a4ae',
    description: 'Der breite Kopf ist ein Sensorfeld. Findet die Schwachstelle in jeder Hülle.',
  },
  manta: {
    name: 'Manta',
    lineage: 'Mobulidae',
    tier: 4,
    parent: 'rochen',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'range', percent: 0.5 },
    color: '#b0bec5',
    description: 'Sieben Meter Spannweite. Deckt das halbe Schlachtfeld ab.',
  },
  zitterrochen: {
    name: 'Zitterrochen',
    lineage: 'Torpediniformes',
    tier: 4,
    parent: 'rochen',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'antiHeal', percent: 1.0, duration: 4 },
    color: '#80deea',
    description: '200 Volt pro Treffer. Schaltet Nanobot-Reparatur komplett ab.',
  },
  krokodil: {
    name: 'Krokodil',
    lineage: 'Crocodylia',
    tier: 4,
    parent: 'echse',
    archetype: 'schwer',
    targeting: 'strongest',
    bonus: { kind: 'slow', amount: 0.6, duration: 1.5 },
    color: '#4e7d3a',
    description: 'Der stärkste Biss des Tierreichs. Was gepackt ist, kommt nicht weiter.',
  },
  vogel: {
    name: 'Vogel',
    lineage: 'Aves (Dinosauria)',
    tier: 4,
    parent: 'echse',
    archetype: 'weit',
    targeting: 'first',
    bonus: { kind: 'range', percent: 0.6 },
    color: '#4fc3f7',
    description: 'Letzter lebender Dinosaurier. Sieht alles aus großer Höhe.',
  },
  schlange: {
    name: 'Schlange',
    lineage: 'Serpentes',
    tier: 4,
    parent: 'echse',
    archetype: 'ausgewogen',
    targeting: 'first',
    bonus: { kind: 'poison', percentOfDamage: 0.6, duration: 5 },
    color: '#7cb342',
    description: 'Ein Biss genügt. Das Gift arbeitet weiter, während sie das nächste Ziel sucht.',
  },
  wolf: {
    name: 'Wolf',
    lineage: 'Carnivora',
    tier: 4,
    parent: 'spitzmaus',
    archetype: 'schnell',
    targeting: 'first',
    bonus: { kind: 'multi', extraTargets: 1 },
    color: '#9e9e9e',
    description: 'Jagt im Rudel. Jeder Angriff trifft ein zweites Ziel.',
  },
  elefant: {
    name: 'Elefant',
    lineage: 'Proboscidea',
    tier: 4,
    parent: 'spitzmaus',
    archetype: 'schwer',
    targeting: 'first',
    bonus: { kind: 'splash', radius: 1.4 },
    color: '#8d99ae',
    description: 'Jeder Tritt lässt den Boden beben. Massive Flächenwirkung.',
  },
  affe: {
    name: 'Affe',
    lineage: 'Primates',
    tier: 4,
    parent: 'spitzmaus',
    archetype: 'ausgewogen',
    targeting: 'strongest',
    bonus: { kind: 'crit', chance: 0.35, multiplier: 3 },
    color: '#f4a261',
    description: 'Werkzeuggebrauch und Köpfchen: findet jede Schwachstelle.',
  },
};

export const TOWER_IDS = Object.keys(DEFS) as TowerId[];

export const TOWER_DEFS: Readonly<Record<TowerId, TowerDef>> = Object.fromEntries(
  TOWER_IDS.map((id) => [id, { id, ...DEFS[id] }]),
) as Record<TowerId, TowerDef>;

const CHILDREN: ReadonlyMap<TowerId, readonly TowerId[]> = new Map(
  TOWER_IDS.map((id) => [id, TOWER_IDS.filter((c) => TOWER_DEFS[c].parent === id)]),
);

export function getTowerDef(id: TowerId): TowerDef {
  return TOWER_DEFS[id];
}

/** Direkte Nachfahren im Stammbaum. */
export function childrenOf(id: TowerId): readonly TowerId[] {
  return CHILDREN.get(id) ?? [];
}

/** Elternknoten (null für den Einzeller). */
export function parentOf(id: TowerId): TowerId | null {
  return TOWER_DEFS[id].parent;
}

/** Geschwister: andere Arten mit demselben Elternknoten. */
export function siblingsOf(id: TowerId): readonly TowerId[] {
  const parent = parentOf(id);
  if (!parent) return [];
  return childrenOf(parent).filter((c) => c !== id);
}

/** Vollständige Abstammungslinie vom Einzeller bis zur Art (inklusive). */
export function lineageOf(id: TowerId): TowerId[] {
  const chain: TowerId[] = [id];
  let current = parentOf(id);
  while (current) {
    chain.unshift(current);
    current = parentOf(current);
  }
  return chain;
}

export function isFinalForm(id: TowerId): boolean {
  return childrenOf(id).length === 0;
}
