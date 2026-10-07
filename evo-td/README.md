# Evo TD – Tiere gegen Roboter

Idle Tower Defense. Die Türme sind Tiere, die sich **von selbst** entlang der
echten Stammesgeschichte weiterentwickeln. Die Gegner sind Roboter, deren
Stärke in **2er-Potenzen** wächst.

## Technologie-Entscheidung

TypeScript + Canvas im Browser, kein Unity. Läuft ohne Installation auf jedem Mac
(Safari, Chrome, Firefox), ist hier direkt baubar und testbar, und für ein 2D-Idle-Spiel
mit Blöcken völlig ausreichend. Ein natives Mac-`.app` entsteht später durch Einwickeln
mit Tauri, ohne die Spiellogik anzufassen. Der Renderer ist austauschbar (z.B. PixiJS).

## Spielprinzip

- Du baust ausschließlich **Einzeller** (jeder weitere wird teurer).
- Türme sammeln XP durch Schaden und Kills und steigen im Level (mehr Schaden, höhere Feuerrate).
- Alle 2 Sekunden würfelt jeder Turm auf **Evolution**. Die Chance steigt mit dem Level
  und mit der Zahl gleichartiger Türme auf dem Feld. Der Nachfahre wird zufällig aus den
  direkten Kindern im Stammbaum gewählt.
- **Jede Art hat genau einen Bonus.** Bei einer Evolution bleiben die Boni erhalten:
  eigener Bonus 100 %, Boni aller Vorfahren 50 %, Boni der Geschwister-Arten 25 %.
  Dazu kommt 25 % des eigenen Bonus jedes **direkt angrenzenden Turms** (8er-Nachbarschaft).
- Pro Turm lässt sich die Evolution **anhalten** (Button im Panel oder Taste `L`).
- **Prestige durch Fusion** (`F`): zwei Türme derselben Art und Prestige-Stufe verschmelzen zu
  einem Turm mit Prestige +1 (mehr Schaden, Feuerrate, Reichweite, Evolutionschance). Der
  andere Bauplatz wird frei. Kostet kein Gold.
- **Verlegen** (`V`): alle 5 Wellen gibt es eine Verlegung; jede kostet Gold (halbe Turmkosten).
- **Gold fließt nie in einzelne Türme.** Es gibt nur: neue Einzeller (jeder teurer als der
  vorige), Verlegungen, **globale Upgrades** für alle Türme (Schaden, Angriffsgeschwindigkeit,
  Reichweite, Evolutionschance, sekundäre Effekte, Passiv = Gold & XP) und **Items**.
- **Items** haben dieselben Kategorien und eine Qualität: Bronze, Silber, Gold, Platin,
  Legendär (Wirkung ×1, ×2, ×4, ×8, ×16). Man kauft eine Stufe; mit 25 % / 15 % / 8 % / 3 %
  springt der Kauf jeweils eine Stufe höher (verkettet). Legendär ist nicht kaufbar und fällt
  aus Bronze mit 0,009 %. Preise skalieren mit Gegner-Tier und Kaufanzahl. 4 Items gleichzeitig
  ausrüstbar.
- Wellen starten automatisch. Alle 5 Wellen verdoppeln sich HP und Belohnung der Gegner.
  Jede 10. Welle bringt einen Boss.
- **Roboter-Elemente** ab Welle 4: Titan-Kern (zweites Leben), Gold-Legierung
  (doppeltes Gold), Plasma-Schild (Schild zuerst abbauen), Nanobots (Selbstheilung).
  Türme kontern mit Schildbrecher- und Anti-Heilungs-Boni.
- Idle-Komfort: Geschwindigkeit 1×/2×/4×, Pause (Leertaste), **Auto-Bau** und Autosave
  im `localStorage`.

## Stammbaum (33 Arten, jede Art teilt sich 2- bis 3-fach bis Tier 4)

```
Einzeller (+XP)
├─ Wurm (Gift)
│  ├─ Schnecke (Slow)
│  │  ├─ Tintenfisch (+2 Ziele) ─ Oktopus (+3 Ziele), Kalmar (Feuerrate)
│  │  └─ Muschel (+Gold)        ─ Auster (+Gold), Riesenmuschel (Fläche)
│  └─ Trilobit (Schildbrecher)
│     ├─ Seeskorpion (+Schaden) ─ Skorpion (Gift), Spinne (Slow)
│     └─ Insekt (Feuerrate)     ─ Käfer (Schildbrecher), Libelle (Krit)
└─ Fisch (+Reichweite)
   ├─ Knorpelfisch (Krit)
   │  ├─ Hai (+Schaden)         ─ Weißer Hai (+Schaden), Hammerhai (Krit)
   │  └─ Rochen (Anti-Heilung)  ─ Manta (+Reichweite), Zitterrochen (Anti-Heilung)
   └─ Frosch (Fläche)
      ├─ Echse (+Reichweite)    ─ Krokodil (Slow), Vogel (+Reichweite), Schlange (Gift)
      └─ Spitzmaus (Feuerrate)  ─ Wolf (+1 Ziel), Elefant (Fläche), Affe (Krit)
```

Kampfwerte werden nicht pro Art gepflegt, sondern aus **Tier** (Schaden ×2 pro Tier) und
**Archetyp** (ausgewogen, schnell, schwer, weit) abgeleitet. Neue Arten brauchen nur
Name, Linie, Eltern, Archetyp, Bonus und Farbe.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (Stammbaum, Evolution, Wellen, Karte, Speichern)
npm run build      # Typecheck + Production-Build nach dist/
```

## Struktur

```
src/
  config/balance.ts        alle Zahlen, die das Spielgefühl steuern
  core/                    Loop (fixed timestep), RNG (deterministisch), EventBus, Vec2
  data/                    Inhalte: towers (Stammbaum), bonuses, elements, enemies, upgrades, items, map
  game/
    GameState.ts           reiner Datenzustand (1:1 speicherbar)
    Game.ts                Fassade: Update-Reihenfolge + Aktionen für die UI
    entities/              Tower, Enemy, Projectile (nur Typen)
    systems/               Wave, Movement, Status, Element, Combat, Projectile, Damage, Level, Stats,
                           Modifier, Evolution, Build, Fusion, Relocate, Shop
  render/CanvasRenderer.ts Darstellung (liest nur)
  ui/                      HUD, Tabs, Turm-Panel, Shop, Items, Stammbaum, Protokoll (DOM, kein Framework)
  persistence/             SaveManager (localStorage, versioniert)
tests/                     Vitest
```

Grundregeln:

- **Systeme sind Funktionen über `GameContext`** (`state`, `map`, `rng`, `bus`). Keine Klassen mit eigenem Zustand.
- **Schaden läuft nur über `DamageSystem.applyDamage`**, damit XP, Gold und Kills immer konsistent sind.
- **Rendering und UI lesen nur**; Spielereignisse kommen über den `EventBus`.
- **Zufall nur über `ctx.rng`**, damit Spielstände deterministisch weiterlaufen.

## Nächste Schritte (Ideen)

- Weitere Elemente (Teilung, Tarnung, Flug) in `data/elements.ts`.
- Grund, die Evolution zu stoppen: Synergien pro Linie, Fusion erfordert gleiche Art.
- Run-Reset mit permanenten Boni für den Idle-Kern.
- Weitere Karten, echte Sprites statt Blöcken.
