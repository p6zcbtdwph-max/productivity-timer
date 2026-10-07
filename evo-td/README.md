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

Ziel ist es, in einem Run so weit wie möglich zu kommen (Welle 1000+). Jeder Run endet
irgendwann; was bleibt, ist DNA für den **Globalen Shop**.

- Du baust ausschließlich **Einzeller** (jeder weitere wird teurer).
- Türme sammeln XP durch Schaden und Kills und steigen im Level.
- Alle 2 Sekunden würfelt jeder Turm auf **Evolution**. Die Chance steigt mit Level, Anzahl
  gleichartiger Türme, Prestige und Upgrades. **Ab Tier 2 muss jede Art mit DNA freigeschaltet
  sein**, sonst steht sie nicht zur Wahl.
- **Jede Art hat genau einen Bonus.** Bei einer Evolution bleiben die Boni erhalten:
  eigener Bonus 100 %, Vorfahren 50 %, Geschwister 25 %, direkt angrenzende Türme 25 %.
- **Prestige durch Fusion** (`F`): zwei gleiche Türme gleicher Prestige-Stufe → ein Turm mit
  Prestige +1. **Verlegen** (`V`): eine Verlegung je 5 Wellen, kostet Gold.
- **Gold fließt nie in einzelne Türme**: nur neue Einzeller, Verlegungen, globale Upgrades
  für alle Türme und Items (Bronze bis Legendär, verkettete Glücks-Aufwertung).
- **Roboter-Elemente** ab Welle 4: Titan-Kern (zweites Leben), Gold-Legierung, Plasma-Schild,
  Nanobots. Gegner-HP verdoppelt sich alle 5 Wellen, Bosse kosten 3 Leben.

## Globaler Shop (DNA)

- Ein Run endet bei 0 Leben oder freiwillig ("Run beenden"). Dann gibt es DNA:
  jede Welle ist `ceil(welle^1.5 / 10)` DNA wert, aber **nur Wellen jenseits der bisherigen
  Bestwelle zählen voll**, bereits erreichte Wellen bringen 10 %. Pushen lohnt, Farmen nicht.
- **Freischaltungen** im Stammbaum: Tier 2 kostet 25 DNA, jedes weitere Tier das Vierfache.
  Der Elternknoten muss frei sein.
- **Permanente Upgrades**: Startkapital, Zähigkeit (Leben), Zellteilung (Turmkosten),
  Mutationsdruck (Evolutionschance), Raubtierinstinkt (Schaden ×), Stoffwechsel (Feuerrate ×),
  Erbgut (sekundäre Boni), Glücksgen (Item-Aufwertung), Tragkraft (Item-Slots), Wanderlust
  (Verlegen), Genbank (+DNA), Symbiose (Auto-Fusion).

## Stammbaum: 33 Basisarten + Mutationen

Basisarten bis Tier 4 sind von Hand gepflegt (echte Stammesgeschichte, siehe `src/data/towers.ts`).
Ab Tier 5 teilt sich jede Endform in zwei **Mutationen** (Alpha, Titan, Blitz, Adleraugen, Gift,
Frost, Schwarm, Beben, Kristall, Wucht, Gold, Weise, Brecher, Nova), deterministisch aus der
Kennung abgeleitet, z.B. `wolf+alpha+titan` = "Titan-Alpha-Wolf". Jede Mutation bringt ihren
eigenen Bonus mit. Die Obergrenze ist `MAX_TIER` (aktuell 8) und lässt sich jederzeit anheben.

Kampfwerte werden aus **Tier** (Schaden ×2 pro Tier) und **Archetyp** abgeleitet.

## Verrechnung der Boni (Töpfe)

```
Schaden = Basis(Tier, Archetyp)
        × (1 + Σ Art-Boni)          Topf "Art": eigener, Vorfahren-, Geschwister-, Nachbar-Boni (additiv)
        × (1 + Σ Ausrüstung)        Topf "Ausrüstung": Run-Upgrades + Items (additiv)
        × Π Mutations-Faktoren      reine Multiplikatoren (Titan ×1.25 ...), stapeln multiplikativ
        × (1 + 0.75 · Prestige)
        × (1 + 0.07 · (Level − 1))
        × Meta-Faktor               Globaler Shop (Raubtierinstinkt)
```

Feuerrate und Reichweite folgen demselben Muster. Krit-Chance additiv (gedeckelt), Krit-Schaden
additiv auf den Multiplikator, Gold/XP = (1 + Art) × (1 + Ausrüstung). Das Turm-Panel zeigt die
Aufschlüsselung für jeden Turm.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (Stammbaum, Mutationen, Stats-Töpfe, Evolution, Meta, Shop, Wellen, Karte, Speichern)
npm run build      # Typecheck + Production-Build nach dist/
```

## Struktur

```
src/
  config/balance.ts        alle Zahlen, die das Spielgefühl steuern
  core/                    Loop (fixed timestep), RNG (deterministisch), EventBus, Vec2
  data/                    Inhalte: towers (Stammbaum + Mutationen), bonuses, elements, enemies, upgrades, items, meta, map
  game/
    GameState.ts           Run-Zustand (1:1 speicherbar)
    MetaState.ts           permanenter Zustand (DNA, Freischaltungen, Meta-Upgrades)
    Game.ts                Fassade: Update-Reihenfolge + Aktionen für die UI
    entities/              Tower, Enemy, Projectile (nur Typen)
    systems/               Wave, Movement, Status, Element, Combat, Projectile, Damage, Level, Stats,
                           Modifier, Meta, Evolution, Build, Fusion, Relocate, Shop
  render/CanvasRenderer.ts Darstellung (liest nur)
  ui/                      HUD, Tabs, Turm-Panel, Shop, Items, Stammbaum (Freischalten), Global, Protokoll
  persistence/             SaveManager (localStorage, versioniert; je ein Key für Run und Meta)
tests/                     Vitest
```

Grundregeln:

- **Systeme sind Funktionen über `GameContext`** (`state`, `map`, `rng`, `bus`). Keine Klassen mit eigenem Zustand.
- **Schaden läuft nur über `DamageSystem.applyDamage`**, damit XP, Gold und Kills immer konsistent sind.
- **Rendering und UI lesen nur**; Spielereignisse kommen über den `EventBus`.
- **Zufall nur über `ctx.rng`**, damit Spielstände deterministisch weiterlaufen.

## Nächste Schritte (Ideen)

- Balance-Pass auf den Meta-Loop mit der Headless-Simulation (Run-Länge, DNA-Tempo).
- Offline-Fortschritt und 8×-Tempo für lange Pushes.
- Synergien pro Linie als Grund, die Evolution zu stoppen.
- Weitere Elemente (Teilung, Tarnung, Flug) in `data/elements.ts`, Boss-Elemente kombiniert.
- Zweite Karte, echte Sprites statt Blöcken, später Tauri-Bundle für den Mac.
