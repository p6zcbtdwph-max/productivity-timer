/**
 * Artefakte: der Globale Shop. Permanente Verbesserungen, bezahlt mit DNA.
 *
 * Die Reihenfolge ist fest. Ein Artefakt lässt sich erst freischalten, wenn
 * das vorige freigeschaltet ist UND die nötige Bestwelle erreicht wurde.
 * Freischalten gibt Stufe 1; weitere Stufen kosten DNA mit steigendem Preis.
 * DNA gibt es nur am Ende eines Runs, und fast nur für neue Bestwellen.
 */
export type MetaUpgradeId =
  | 'startGold'
  | 'evolutionBase'
  | 'damage'
  | 'startLives'
  | 'autoUpgrades'
  | 'fireRate'
  | 'inheritance'
  | 'towerCost'
  | 'autoFusion'
  | 'itemLuck'
  | 'dnaGain'
  | 'autoArtifacts'
  | 'relocate'
  | 'itemSlots'
  | 'itemFind'
  | 'itemMerge'
  | 'itemPower'
  | 'hatchery'
  | 'territory'
  | 'amber'
  | 'hibernation'
  | 'winterFur';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  /** Kurzer Artefakt-Gegenstand für die Optik. */
  icon: string;
  description: string;
  /** Wirkung pro Stufe; Bedeutung je nach Artefakt (siehe MetaSystem). */
  perLevel: number;
  /** Infinity = skaliert unendlich; begrenzt nur, wo es eine natürliche Grenze gibt. */
  maxLevel: number;
  /** Bedingungen zum Freischalten (zusätzlich: Vorgänger freigeschaltet). */
  unlockWave: number;
  unlockCost: number;
  /** Preis der Stufe n+1 = levelCost × levelGrowth^(n-1). */
  levelCost: number;
  levelGrowth: number;
}

/** Artefakte in fester Reihenfolge. */
export const ARTIFACT_ORDER: readonly MetaUpgradeDef[] = [
  { id: 'startGold', name: 'Goldener Kiesel', icon: '🪙', description: '+30 Startgold je Stufe.', perLevel: 30, maxLevel: Infinity, unlockWave: 0, unlockCost: 10, levelCost: 10, levelGrowth: 1.35 },
  { id: 'evolutionBase', name: 'Ursuppe', icon: '🧪', description: '+0,1 % Grund-Evolutionschance je Stufe.', perLevel: 0.001, maxLevel: 25, unlockWave: 10, unlockCost: 20, levelCost: 15, levelGrowth: 1.45 },
  { id: 'damage', name: 'Raubtierzahn', icon: '🦷', description: 'Schaden ×(1 + 0,08 je Stufe), eigener Topf.', perLevel: 0.08, maxLevel: Infinity, unlockWave: 15, unlockCost: 40, levelCost: 25, levelGrowth: 1.3 },
  { id: 'startLives', name: 'Schildkrötenpanzer', icon: '🐢', description: '+1 Startleben je Stufe.', perLevel: 1, maxLevel: 15, unlockWave: 20, unlockCost: 60, levelCost: 30, levelGrowth: 1.6 },
  { id: 'itemSlots', name: 'Beutel', icon: '👝', description: '+1 Ausrüstungsplatz für Items je Stufe (Basis 1).', perLevel: 1, maxLevel: 7, unlockWave: 22, unlockCost: 80, levelCost: 150, levelGrowth: 3 },
  { id: 'autoUpgrades', name: 'Instinkt', icon: '🧠', description: 'Schaltet den Auto-Kauf für Run-Upgrades frei (Schalter im Shop, einmal pro Welle).', perLevel: 1, maxLevel: 1, unlockWave: 25, unlockCost: 100, levelCost: 0, levelGrowth: 1 },
  { id: 'itemFind', name: 'Elsternnest', icon: '🪺', description: 'Items werden ×(1 + 0,2 je Stufe) häufiger gefunden.', perLevel: 0.2, maxLevel: Infinity, unlockWave: 28, unlockCost: 110, levelCost: 40, levelGrowth: 1.45 },
  { id: 'fireRate', name: 'Kolibriherz', icon: '❤️', description: 'Feuerrate ×(1 + 0,05 je Stufe), eigener Topf.', perLevel: 0.05, maxLevel: Infinity, unlockWave: 30, unlockCost: 120, levelCost: 25, levelGrowth: 1.3 },
  { id: 'hatchery', name: 'Brutwärme', icon: '🥚', description: 'Evolutionskammern entwickeln sich ×(1 + 0,25 je Stufe) schneller.', perLevel: 0.25, maxLevel: Infinity, unlockWave: 35, unlockCost: 150, levelCost: 30, levelGrowth: 1.45 },
  { id: 'inheritance', name: 'Fossil', icon: '🦴', description: '+5 % Stärke aller geerbten und Nachbar-Boni je Stufe.', perLevel: 0.05, maxLevel: Infinity, unlockWave: 40, unlockCost: 200, levelCost: 40, levelGrowth: 1.4 },
  { id: 'territory', name: 'Revierstein', icon: '🗿', description: '+1 Revierplatz je Karte und Stufe.', perLevel: 1, maxLevel: 7, unlockWave: 45, unlockCost: 250, levelCost: 200, levelGrowth: 2.2 },
  { id: 'itemMerge', name: 'Perlmuschel', icon: '🦪', description: 'Zwei gleiche Items (Art, Qualität, Stufe) verschmelzen zu einem Item der nächsten Stufe (×1,8 Wirkung).', perLevel: 1, maxLevel: 1, unlockWave: 48, unlockCost: 280, levelCost: 0, levelGrowth: 1 },
  { id: 'towerCost', name: 'Zellkern', icon: '🔬', description: 'Turmkosten wachsen je Stufe 1 % langsamer.', perLevel: 0.01, maxLevel: 12, unlockWave: 50, unlockCost: 300, levelCost: 60, levelGrowth: 1.7 },
  { id: 'amber', name: 'Bernstein', icon: '🟠', description: '+15 % Eier aus Revieren je Stufe.', perLevel: 0.15, maxLevel: Infinity, unlockWave: 55, unlockCost: 350, levelCost: 60, levelGrowth: 1.4 },
  { id: 'autoFusion', name: 'Symbiose-Koralle', icon: '🪸', description: 'Schaltet Auto-Fusion frei.', perLevel: 1, maxLevel: 1, unlockWave: 60, unlockCost: 400, levelCost: 0, levelGrowth: 1 },
  { id: 'itemPower', name: 'Pfauenfeder', icon: '🦚', description: 'Alle Items wirken ×(1 + 0,1 je Stufe).', perLevel: 0.1, maxLevel: Infinity, unlockWave: 65, unlockCost: 450, levelCost: 70, levelGrowth: 1.4 },
  { id: 'hibernation', name: 'Winterschlaf-Höhle', icon: '🕳️', description: '+2 Stunden Offline-Obergrenze je Stufe (Basis 8 h).', perLevel: 2, maxLevel: 8, unlockWave: 70, unlockCost: 500, levelCost: 150, levelGrowth: 1.8 },
  { id: 'itemLuck', name: 'Vierblättriger Klee', icon: '🍀', description: 'Chance auf höhere Item-Qualität ×(1 + 0,1 je Stufe).', perLevel: 0.1, maxLevel: Infinity, unlockWave: 75, unlockCost: 600, levelCost: 80, levelGrowth: 1.6 },
  { id: 'winterFur', name: 'Winterfell', icon: '🧥', description: '+5 % Kraft während der Winterruhe je Stufe (Basis 50 %).', perLevel: 0.05, maxLevel: 10, unlockWave: 85, unlockCost: 800, levelCost: 200, levelGrowth: 1.6 },
  { id: 'dnaGain', name: 'Doppelhelix', icon: '🧬', description: '+10 % DNA am Run-Ende je Stufe.', perLevel: 0.1, maxLevel: Infinity, unlockWave: 90, unlockCost: 900, levelCost: 100, levelGrowth: 1.5 },
  { id: 'autoArtifacts', name: 'Gedächtnis', icon: '📜', description: 'Schaltet Auto-Kauf für Artefakt-Stufen am Run-Ende frei (pro Artefakt wählbar).', perLevel: 1, maxLevel: 1, unlockWave: 100, unlockCost: 1200, levelCost: 0, levelGrowth: 1 },
  { id: 'relocate', name: 'Zugvogelfeder', icon: '🪶', description: 'Verlegung eine Welle früher je Stufe (mindestens alle 2).', perLevel: 1, maxLevel: 3, unlockWave: 125, unlockCost: 1600, levelCost: 800, levelGrowth: 2.5 },
];

export const META_UPGRADE_IDS: readonly MetaUpgradeId[] = ARTIFACT_ORDER.map((a) => a.id);

export const META_UPGRADE_DEFS: Readonly<Record<MetaUpgradeId, MetaUpgradeDef>> = Object.fromEntries(
  ARTIFACT_ORDER.map((a) => [a.id, a]),
) as Record<MetaUpgradeId, MetaUpgradeDef>;

/** Preis, um von `level` auf `level + 1` zu kommen (level >= 1). */
export function metaUpgradeCost(def: MetaUpgradeDef, level: number): number {
  return Math.round(def.levelCost * def.levelGrowth ** Math.max(0, level - 1));
}

/** DNA-Wert einer einzelnen Welle (überlinear, späte Wellen zählen stark). */
export function dnaForWave(wave: number): number {
  return Math.ceil(wave ** 1.5 / 10);
}

/** Anteil, den bereits erreichte Wellen noch bringen ("sehr wenig"). */
export const REPEAT_WAVE_FACTOR = 0.1;
