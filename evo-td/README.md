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
  gleichartiger Türme, Prestige und Upgrades. **Ab Tier 2 muss jede Art freigeschaltet
  sein**, sonst steht sie nicht zur Wahl. Freigeschaltet wird über **XP im Kompendium**: Die XP
  aller Türme einer Art zählen über alle Runs; hat die Elternart `300 × 5^(Tier − 2)` XP gesammelt,
  wird das Kind frei (Tier 2: 300, Tier 3: 1.500, Tier 4: 7.500 …). Fortschritt im Stammbaum.
- **Jede Art hat genau einen Bonus.** Bei einer Evolution bleiben die Boni erhalten:
  eigener Bonus 100 %, Vorfahren 50 %, Geschwister 25 %, direkt angrenzende Türme 25 %.
- **Prestige durch Fusion** (`F`): zwei gleiche Türme gleicher Prestige-Stufe → ein Turm mit
  Prestige +1. **Verlegen** (`V`): eine Verlegung je 5 Wellen, kostet Gold.
- **Gold** fließt in neue Einzeller (Kosten des nächsten Turms stehen immer im HUD und beim
  Überfahren eines freien Platzes), Verlegungen, globale Upgrades für alle Türme und **Items**.
- **Items** kauft man direkt am Turm (Turm anklicken): Bronze bis Platin, Kategorie zufällig,
  verkettete Glücks-Aufwertung bis Legendär. **Höchstens 3 Items je Turm** (Artefakt Beutel
  gibt spät mehr). Items wirken nur auf ihren Turm, bleiben bei Evolution erhalten und wandern
  bei einer Fusion mit, soweit Platz ist.
- **Roboter-Elemente** ab Welle 4: Titan-Kern (zweites Leben), Gold-Legierung, Plasma-Schild,
  Nanobots. Gegner-HP verdoppelt sich alle 5 Wellen, Bosse kosten 3 Leben.

## Globaler Shop (DNA)

- Ein Run endet bei 0 Leben oder freiwillig ("Run beenden"). Dann gibt es DNA:
  jede Welle ist `ceil(welle^1.5 / 10)` DNA wert, aber **nur Wellen jenseits der bisherigen
  Bestwelle dieser Karte zählen voll**, bereits erreichte Wellen bringen 10 %.
- **Artefakte** in fester Reihenfolge. Das nächste Artefakt braucht das vorige, eine Bestwelle
  und DNA; danach lässt es sich mit DNA weiter aufstufen. Reihenfolge (Bestwelle):
  Goldener Kiesel (0), Ursuppe (10), Raubtierzahn (15), Schildkrötenpanzer (20),
  **Instinkt** (25, Auto-Kauf im Run), Kolibriherz (30), Brutwärme (35), Fossil (40),
  Revierstein (45), Zellkern (50), Bernstein (55), **Symbiose-Koralle** (60, Auto-Fusion),
  Winterschlaf-Höhle (70), Vierblättriger Klee (75), Winterfell (85), Doppelhelix (90),
  **Gedächtnis** (100, Auto-Kauf von Artefakt-Stufen am Run-Ende), Zugvogelfeder (125), Beutel (150).
- **Auto-Modi**: Instinkt (Schalter im Shop) kauft **einmal pro Welle** Run-Upgrades, und nur,
  wenn gerade kein neuer Turm bezahlbar ist. Er schaut, wie weit die Roboter in der letzten Welle
  kamen: über die Hälfte des Weges oder ein Durchbruch → **Gefahr**, Schaden und Feuerrate zuerst;
  sonst **ruhig**, Gold zuerst, der Rest gewichtet dahinter. Gekauft wird nach Gewicht/Preis. Gedächtnis kauft am Run-Ende die
  angehakten Artefakt-Stufen, billigste zuerst.
- **Karten-Erfolge**: alle 50 Bestwellen auf einer Karte gibt es dauerhaft den Bonus der Karte.
  Urmeer: +10 % Schaden je Erfolg, als eigener Topf.

## Karten

Jede Karte hat eigene Wege, eigene Objekte und einen eigenen Modus (angelehnt an Bloons TD).
Gewechselt wird im Reiter "Global"; der laufende Run wird dabei mit DNA abgerechnet.

| Karte | Wege | Objekte | Modus | Erfolg je 50 Bestwellen | Freischaltung |
|---|---|---|---|---|---|
| Urmeer | ein S-Pfad | – | – | +10 % Schaden | immer |
| Urkontinent | Weg teilt sich (Gebirge / Küste) | Bäume, Felsen, Riffe; Anhöhen | **Biome**: Luft, Land, Erde, Wasser | +5 % Feuerrate | Urmeer Welle 60 |
| Roboterfabrik | zwei Eingänge laufen zusammen | Schrott; Kräne | **Roboter-Anpassung** | +10 % DNA | Urkontinent Welle 60 |

- **Biome**: Jede Art hat ein Heimat-Biom; Mutationen erben es. Auf einem Platz im Heimat-Biom
  ×1,3 Schaden (Topf "Gelände").
  - Wasser: Einzeller, Fische, Haie, Rochen, Muscheln, Tintenfische, Krokodil
  - Land: Frosch, Echse, Schlange, Spitzmaus, Igel, Wolf, Elefant, Affe, Skorpion, Spinne, Käfer
  - Erde: Wurm, Tausendfüßer, Skolopender, Saftkugler, Maulwurf
  - Luft: Insekt, Libelle, Biene, Vogel, Fledermaus. **Luft-Arten haben immer globale Reichweite**
    (sie fliegen und erreichen jedes Ziel auf der Karte), machen dafür aber nur 70 % Schaden
    (Faktor "Flug", einstellbar in `src/data/biomes.ts`).
- **Hindernisse** blockieren Bauplätze und lassen sich per Klick räumen (1,5 × Turmkosten).
- **Anhöhen / Kräne**: ×1,2 Reichweite.
- **Roboter-Anpassung**: Jeder Schaden zählt als Direkt, Fläche, Gift oder Krit. Alle 25 Wellen
  werden die Roboter gegen die Art mit dem meisten Schaden um 20 % resistenter (max. 80 %).
  Das HUD zeigt die Resistenzen und die Wellen bis zur nächsten Anpassung.
- Reviere und Erfolge gelten je Karte; Tiere lassen sich nur freigeschalteten Karten zuweisen.

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

## Garten

Reiter "Garten": Bäume aus der Pflanzen-Evolution wachsen in Töpfen.

- **Töpfe**: Man beginnt mit einem Topf. Weitere nur für **Harz** (20, dann ×3, maximal 6).
- **Samen**: Man startet mit einem Moos-Samen. Danach sind Samen **sehr selten** (Gacha):
  ab Welle 5 je geschaffter Welle 0,3 %, Bosswellen 3 %, **nur beim aktiven Spielen**, nie in
  der Winterruhe. Seltenheit: häufig 90 %, selten 8,5 %, sehr selten 1,4 %, legendär 0,1 %.
  Samen bleiben über Runs erhalten.
- **Wachstum** in Echtzeit (auch offline, wie Kammern): Level n → n+1 dauert n Stunden
  (Level 10 nach ~2 Tagen, Level 30 nach ~3 Wochen), maximal Level 100.
- **Boni** steigen mit Level und Seltenheit (×1 / ×1,5 / ×2 / ×3). Schaden, Feuerrate und
  Reichweite als eigener Topf "Garten", der Rest wirkt wie Kompendium-Boni.
- **Harz** (🍯): Währung für Garten und Passiv-Modus, `0,2 × Level × Seltenheit` pro Stunde und Baum.
- **Pflege** (für Harz, mit Stufen):

  | Pflege | Wirkung je Stufe | Max |
  |---|---|---|
  | Dünger | Bäume wachsen +15 % schneller | 20 |
  | Kompost | Baum-Boni +10 % | 30 |
  | Harzkanäle | +15 % Harz | 20 |
  | Vogelfutter | +15 % Samenchance | 15 |
  | Veredelung | seltene Samen +15 % wahrscheinlicher | 15 |
  | Nistmaterial | Evolutionskammern +10 % schneller | 20 |
  | Wildwechsel | +10 % DNA aus Revieren | 20 |
  | Laubdecke | +1 h Offline-Obergrenze | 8 |

  Die Passiv-Pflege wirkt zusätzlich zu den Artefakten (multiplikativ bzw. additiv bei Stunden).

| Baum | Seltenheit | Bonus je Level |
|---|---|---|
| Moos | häufig | +1 % Gold |
| Farn | häufig | +0,05 % Evolutionschance |
| Schachtelhalm | häufig | +1 % XP |
| Ginkgo | selten | +0,4 % Reichweite |
| Kiefer | selten | +0,8 % Feuerrate |
| Eiche | selten | +1 % Schaden |
| Magnolie | sehr selten | +0,2 % Krit-Chance |
| Mammutbaum | legendär | +1,2 % Schaden |

Entwickler-Panel: "+500 Harz", "+5 Samen" und "Garten +24 h".

## Kompendium

Reiter "Kompendium": jede Art, die du je hattest (Run, Winterruhe oder Evolutionskammer), mit
Rekord-Level und Rekord-Prestige. Jede Art gibt dauerhaft einen kleinen Bonus. Der Typ folgt aus
ihrer Eigenschaft:

| Eigenschaft der Art | Kompendium-Bonus |
|---|---|
| Schaden, Titan, Gift, Fläche | Schaden (eigener Topf) |
| Feuerrate | Feuerrate (eigener Topf) |
| Reichweite | Reichweite (max. +50 %) |
| Krit / Krit-Schaden | Krit-Chance (max. +25 %) / Krit-Schaden |
| Gold, Mehrfachziel | Gold |
| XP | XP |
| Slow | alle Roboter langsamer (max. −30 %) |
| Schildbrecher | Schaden gegen Schilde |
| Anti-Heilung | Nanobot-Heilung schwächer (max. −60 %) |

Stärke: `Grundwert × (Rekord-Level + 25 × Rekord-Prestige) × (1 + 0,5 × Tier)`.
Basisarten stehen immer in der Liste, Mutationen erst, wenn man sie hatte.

## Stammbaum: 40 Basisarten + Mutationen

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
        × (1 + Σ Ausrüstung)        Topf "Ausrüstung": Run-Upgrades + Items des Turms (additiv)
        × Π Mutations-Faktoren      reine Multiplikatoren (Titan ×1.25 ...), stapeln multiplikativ
        × (1 + 0.10 · gleiche Nachbarn)  Synergie: angrenzende Türme derselben Art
        × (1 + 0.75 · Prestige)
        × (1 + 0.07 · (Level − 1))
        × Artefakt-Faktor           Raubtierzahn
        × Erfolgs-Faktor            Karten-Erfolge
        × (1 + Kompendium)          Rekorde aller je gezüchteten Arten
        × Gelände                   Heimat-Biom ×1,3 (Reichweite: Anhöhe ×1,2)
        × Flug                      Luft-Arten ×0,7
        × (1 + Garten)              Bäume im Garten
```

Feuerrate und Reichweite folgen demselben Muster. Krit-Chance additiv (gedeckelt), Krit-Schaden
additiv auf den Multiplikator, Gold/XP = (1 + Art) × (1 + Ausrüstung). Das Turm-Panel zeigt die
Aufschlüsselung für jeden Turm.

## Online spielen (ohne Installation)

Private Testversion auf claude.ai: https://claude.ai/artifact/6N4xzURPckaHNcyuywSJw9
Der Spielstand wird dort zusätzlich in der Cloud gespeichert (privat pro Person), also auch
geräteübergreifend. Aktualisieren: `npm run build`, dann die Seite neu veröffentlichen.

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

**Tasten**: Leertaste Pause, `L` Evolution stoppen, `T` Zielpriorität, `F` Fusion, `V` Verlegen, `Esc` Abbrechen, `D` Entwickler.

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
                           Modifier, Meta, Evolution, Build, Fusion, Relocate, Shop, Auto, Compendium, Garden
  render/CanvasRenderer.ts Darstellung (liest nur)
  ui/                      HUD, Tabs, Turm-Panel, Shop (Upgrades, Auto-Kauf), Stammbaum (XP-Fortschritt), Global, Protokoll
  persistence/             SaveManager (localStorage, versioniert; je ein Key für Run und Meta)
tests/                     Vitest
```

Grundregeln:

- **Systeme sind Funktionen über `GameContext`** (`state`, `map`, `rng`, `bus`). Keine Klassen mit eigenem Zustand.
- **Schaden läuft nur über `DamageSystem.applyDamage`**, damit XP, Gold und Kills immer konsistent sind.
- **Rendering und UI lesen nur**; Spielereignisse kommen über den `EventBus`.
- **Zufall nur über `ctx.rng`**, damit Spielstände deterministisch weiterlaufen.

## Nächste Schritte (Ideen)

Siehe auch `BACKLOG.md` (u. a. Steuerung des Stammbaums überarbeiten).


- Balance-Pass auf den Meta-Loop mit der Headless-Simulation (Run-Länge, DNA-Tempo).
- Weitere Elemente (Teilung, Tarnung, Flug) in `data/elements.ts`, Boss-Elemente kombiniert.
- Weitere Karten, echte Sprites statt Blöcken, später Tauri-Bundle für den Mac.
