/**
 * Heimat-Biom jeder Art. Steht eine Art auf einem Bauplatz ihres Bioms,
 * bekommt sie den Biom-Bonus (Topf "Gelände"). Mutationen erben das Biom
 * ihrer Basisart. Luft-Arten haben zusätzlich immer globale Reichweite;
 * Erde-Arten leben im Boden (Würmer, Tausendfüßer, Maulwurf).
 */
import type { Biome } from './map';
import { baseIdOf, type BaseTowerId, type TowerId } from './towers';

export const BIOME_BONUS = {
  /** Schaden auf einem Platz im Heimat-Biom. */
  damage: 1.3,
  /** Reichweite auf einer Anhöhe. */
  highGroundRange: 1.2,
  /** Schaden von Luft-Arten: Ausgleich für ihre globale Reichweite. */
  airDamage: 0.7,
} as const;

export const BIOME_NAMES: Readonly<Record<Biome, string>> = { luft: 'Luft', land: 'Land', erde: 'Erde', wasser: 'Wasser' };
export const BIOME_COLORS: Readonly<Record<Biome, string>> = {
  luft: 'rgba(180, 220, 255, 0.10)',
  land: 'rgba(160, 200, 110, 0.10)',
  erde: 'rgba(150, 100, 60, 0.20)',
  wasser: 'rgba(70, 140, 230, 0.16)',
};

const BIOME_OF: Readonly<Record<BaseTowerId, Biome>> = {
  einzeller: 'wasser',
  wurm: 'erde',
  fisch: 'wasser',
  schnecke: 'wasser',
  trilobit: 'wasser',
  knorpelfisch: 'wasser',
  frosch: 'land',
  tintenfisch: 'wasser',
  muschel: 'wasser',
  seeskorpion: 'wasser',
  insekt: 'luft',
  hai: 'wasser',
  rochen: 'wasser',
  echse: 'land',
  spitzmaus: 'land',
  oktopus: 'wasser',
  kalmar: 'wasser',
  auster: 'wasser',
  riesenmuschel: 'wasser',
  skorpion: 'land',
  spinne: 'land',
  kaefer: 'land',
  libelle: 'luft',
  weisser_hai: 'wasser',
  hammerhai: 'wasser',
  manta: 'wasser',
  zitterrochen: 'wasser',
  krokodil: 'wasser',
  vogel: 'luft',
  schlange: 'land',
  wolf: 'land',
  elefant: 'land',
  affe: 'land',
  tausendfuesser: 'erde',
  igel: 'land',
  biene: 'luft',
  skolopender: 'erde',
  saftkugler: 'erde',
  maulwurf: 'erde',
  fledermaus: 'luft',
};

/** Luft-Arten fliegen: sie erreichen jedes Ziel auf der Karte. */
export function hasGlobalRange(id: TowerId): boolean {
  return speciesBiome(id) === 'luft';
}

export function speciesBiome(id: TowerId): Biome {
  return BIOME_OF[baseIdOf(id)];
}
