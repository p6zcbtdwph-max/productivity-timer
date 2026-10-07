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
  Bestwelle dieser Karte zählen voll**, bereits erreichte Wellen bringen 10 %.
- **Arten freischalten** im Stammbaum: Tier 2 kostet 25 DNA, jedes weitere Tier das Vierfache.
- **Artefakte** in fester Reihenfolge. Das nächste Artefakt braucht das vorige, eine Bestwelle
  und DNA; danach lässt es sich mit DNA weiter aufstufen. Reihenfolge (Bestwelle):
  Goldener Kiesel (0), Ursuppe (10), Raubtierzahn (15), Schildkrötenpanzer (20),
  **Instinkt** (25, Auto-Kauf im Run), Kolibriherz (30), Brutwärme (35), Fossil (40),
  Revierstein (45), Zellkern (50), Bernstein (55), **Symbiose-Koralle** (60, Auto-Fusion),
  Winterschlaf-Höhle (70), Vierblättriger Klee (75), Winterfell (85), Doppelhelix (90),
  **Gedächtnis** (100, Auto-Kauf von Artefakt-Stufen am Run-Ende), Zugvogelfeder (125), Beutel (150).
- **Auto-Modi**: Instinkt kauft jede Sekunde das billigste der im Shop angehakten Run-Upgrades
  und hält bei Auto-Bau Gold für den nächsten Turm zurück. Gedächtnis kauft am Run-Ende die
  angehakten Artefakt-Stufen, billigste zuerst.
- **Karten-Erfolge**: alle 50 Bestwellen auf einer Karte gibt es dauerhaft den Bonus der Karte.
  Urmeer: +10 % Schaden je Erfolg, als eigener Topf.

## Passiv-Modus: Evolutionskammern, Reviere, Winterruhe

- **Evolutionskammern** (Reiter "Kammern"): Kammern mit DNA freischalten (50, dann ×4, maximal 8).
  In eine Kammer kauft man einen Einzeller für DNA (Preis steigt je Kauf). Er entwickelt sich
  in Echtzeit, auch bei geschlossenem Spiel, zufällig zu **freigeschalteten** Nachfahren.
  Tier 0 entwickelt sich im Schnitt 2× pro Stunde, jedes Tier halbiert das Tempo. Evolution
  pro Kammer stoppbar.
- **Reviere**: Tiere aus der Kammer weist man einer Karte zu. Dort bringen sie DNA pro Stunde:
  `0,5 × 2^Tier × (1 + Bestwelle der Karte / 50)`. Ein Platz je Karte, mehr per Artefakt.
- **Winterruhe**: Kehrst du nach mindestens einer Minute zurück (Tab oder neu geöffnet), wird
  der laufende Run mit 50 % Kraft nachgerechnet. Bricht ein Roboter durch, wird auf den Anfang
  dieser Welle zurückgesetzt und angehalten: offline stirbt der Run nie. Obergrenze 8 Stunden.
  Ein Bericht zeigt DNA, Kammer-Evolutionen, Wellen, Gold und wo die Wand war.
- **Artefakte dazu**: Brutwärme (Kammer-Tempo), Revierstein (+Revierplätze), Bernstein
  (+passive DNA), Winterschlaf-Höhle (+2 h Offline je Stufe), Winterfell (+5 % Offline-Kraft je Stufe).
- Entwickler-Panel: "Zeit +1 h" simuliert eine Stunde Abwesenheit.

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
        × (1 + 0.10 · gleiche Nachbarn)  Synergie: angrenzende Türme derselben Art
        × (1 + 0.75 · Prestige)
        × (1 + 0.07 · (Level − 1))
        × Artefakt-Faktor           Raubtierzahn
        × Erfolgs-Faktor            Karten-Erfolge
```

Feuerrate und Reichweite folgen demselben Muster. Krit-Chance additiv (gedeckelt), Krit-Schaden
additiv auf den Multiplikator, Gold/XP = (1 + Art) × (1 + Ausrüstung). Das Turm-Panel zeigt die
Aufschlüsselung für jeden Turm.

## Auf dem Mac starten

1. Node.js LTS von nodejs.org installieren.
2. Im Terminal:

```bash
git clone https://github.com/p6zcbtdwph-max/productivity-timer.git
cd productivity-timer
git checkout claude/td-game-animal-evolution-sskxvf
cd evo-td
npm install
npm run dev
```

3. `http://localhost:5173` im Browser öffnen.

**Entwickler-Panel**: Taste `D`. Gold und DNA geben, Wellen überspringen, Bestwelle erhöhen,
Arten und Artefakte freischalten, 8×/16× Tempo, alles löschen. In der Browser-Konsole ist das
Spiel als `window.evoTd.game` erreichbar.

**Tasten**: Leertaste Pause, `L` Evolution stoppen, `F` Fusion, `V` Verlegen, `Esc` Abbrechen, `D` Entwickler.

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
- Weitere Elemente (Teilung, Tarnung, Flug) in `data/elements.ts`, Boss-Elemente kombiniert.
- Zweite Karte, echte Sprites statt Blöcken, später Tauri-Bundle für den Mac.
