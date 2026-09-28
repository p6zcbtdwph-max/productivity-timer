# Wissensbasis (Cloud)

Ein themenorientiertes Repository für strukturierte Recherche- und Wissensarbeit.
Ausgelegt auf Arbeit in der Cloud (Claude Code on the web, GitHub-Weboberfläche,
beliebiger Editor) – alles ist reines Markdown, keine Toolchain, kein Build,
keine Abhängigkeiten.

## Prinzipien

1. **Ein Ordner = ein Thema.** Themen sind voneinander unabhängig und können
   jederzeit ergänzt werden, ohne dass etwas anderes angefasst werden muss.
2. **Ein Dokument = eine Frage.** Lieber mehrere klar geschnittene Dateien als
   ein Monolith.
3. **Nur Markdown.** Lesbar im Browser, auf dem Handy, im Terminal und für
   KI-Assistenten gleichermaßen.
4. **Quellen und Stand immer mitführen.** Jedes Dokument hat einen Kopf mit
   `Stand:` und verlinkt seine Quellen.
5. **Nichts wird stillschweigend veraltet.** Zahlen bekommen ein Datum, damit
   man sieht, wann sie nachgezogen werden müssen.

## Struktur

```
.
├── README.md                  # diese Datei – Einstieg und Themenindex
├── CONTRIBUTING.md            # wie ein neues Thema angelegt wird
├── CLAUDE.md                  # Arbeitsanweisung für KI-Assistenten im Repo
├── vorlagen/
│   └── thema-vorlage.md       # Kopiervorlage für neue Dokumente
└── themen/
    └── <thema>/
        ├── README.md          # Übersicht und Navigation des Themas
        ├── 01-....md          # Einzeldokumente, nummeriert in Lesereihenfolge
        └── quellen.md         # gesammelte Quellen des Themas
```

## Themenindex

| Thema | Status | Kurzbeschreibung |
|---|---|---|
| [Norwegischer Staatsfonds (GPFG)](themen/norwegischer-staatsfonds/) | aktiv | Regelwerk des Fonds, Replikation des Aktienteils mit ETFs, Analyse einer reinen Aktien-Umsetzung |

## Neues Thema anlegen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md). Kurzfassung:

```bash
mkdir -p themen/<neues-thema>
cp vorlagen/thema-vorlage.md themen/<neues-thema>/README.md
# Zeile in den Themenindex oben eintragen
```

## Hinweis

Inhalte in diesem Repository sind Recherche- und Bildungsmaterial. Insbesondere
die Finanzthemen sind **keine Anlageberatung** und keine Empfehlung zum Kauf
oder Verkauf von Wertpapieren.
