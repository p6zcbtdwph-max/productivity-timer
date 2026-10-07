# Evo TD – Tiere gegen Roboter

Idle Tower Defense. Die Türme sind Tiere, die sich **von selbst** entlang der
echten Stammesgeschichte weiterentwickeln. Die Gegner sind Roboter, deren
Stärke in **2er-Potenzen** wächst.

## Spielprinzip

- Du baust ausschließlich **Einzeller** (jeder weitere wird teurer).
- Türme sammeln XP durch Schaden und Kills und steigen im Level (mehr Schaden, höhere Feuerrate).
- Alle paar Sekunden würfelt jeder Turm auf **Evolution**. Die Chance steigt mit dem Level
  und mit der Zahl gleichartiger Türme auf dem Feld. Der Nachfahre wird zufällig aus den
  direkten Kindern im Stammbaum gewählt.
- Pro Turm lässt sich die Evolution **anhalten** (Button im Panel oder Taste `L`).
- Wellen starten automatisch. Alle 5 Wellen verdoppeln sich HP und Belohnung der Gegner.
  Jede 10. Welle bringt einen Boss.
- Idle-Komfort: Geschwindigkeit 1×/2×/4×, Pause (Leertaste), **Auto-Bau** und Autosave
  im `localStorage`.

## Stammbaum (16 Arten)

```
Einzeller (Choanoflagellata)
├─ Schwamm   (Porifera)         Fläche, lange Reichweite
├─ Qualle    (Cnidaria)         Slow
└─ Wurm      (Bilateria)        Gift
   ├─ Oktopus   (Mollusca)      3 Ziele
   ├─ Skorpion  (Arthropoda)    schnell + Gift
   └─ Fisch     (Chordata)      präzise Projektile
      ├─ Hai    (Chondrichthyes) hoher Schaden, stärkstes Ziel
      └─ Frosch (Amphibia)      Fläche
         ├─ Echse     (Sauropsida)
         │  ├─ Krokodil (Crocodylia)   schwerer Biss + Slow
         │  └─ Vogel    (Aves)         sehr lange Reichweite
         └─ Spitzmaus (Synapsida)      hohe Feuerrate
            ├─ Wolf    (Carnivora)     2 Ziele, Krit
            ├─ Elefant (Proboscidea)   große Fläche + Slow
            └─ Affe    (Primates)      hohe Kritchance
```

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
  data/                    Inhalte: towers (Stammbaum), enemies, traits (Hook, noch leer), map
  game/
    GameState.ts           reiner Datenzustand (1:1 speicherbar)
    Game.ts                Fassade: Update-Reihenfolge + Aktionen für die UI
    entities/              Tower, Enemy, Projectile (nur Typen)
    systems/               Wave, Movement, Status, Combat, Projectile, Damage, Level, Evolution, Build
  render/CanvasRenderer.ts Darstellung (liest nur)
  ui/                      HUD, Turm-Panel, Stammbaum, Protokoll (DOM, kein Framework)
  persistence/             SaveManager (localStorage, versioniert)
tests/                     Vitest
```

Grundregeln:

- **Systeme sind Funktionen über `GameContext`** (`state`, `map`, `rng`, `bus`). Keine Klassen mit eigenem Zustand.
- **Schaden läuft nur über `DamageSystem.applyDamage`**, damit XP, Gold und Kills immer konsistent sind.
- **Rendering und UI lesen nur**; Spielereignisse kommen über den `EventBus`.
- **Zufall nur über `ctx.rng`**, damit Spielstände deterministisch weiterlaufen.

## Nächste Schritte (Ideen)

- Gegner-Traits aktivieren (`data/traits.ts`): Schild, Teilung, Tarnung, Flug.
- Grund, die Evolution zu stoppen: Boni für gleichartige Türme / Synergien pro Linie.
- Prestige-Schleife für den Idle-Kern (Reset mit permanenten Boni).
- Weitere Karten, echte Sprites statt Blöcken.
