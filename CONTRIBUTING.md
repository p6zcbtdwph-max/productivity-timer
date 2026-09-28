# Arbeiten in dieser Wissensbasis

## Ein neues Thema anlegen

1. Ordner unter `themen/` anlegen, Name klein und mit Bindestrichen
   (`themen/betriebliche-altersvorsorge`).
2. `vorlagen/thema-vorlage.md` als `README.md` in den Ordner kopieren und den
   Kopf ausfüllen.
3. Inhalte auf nummerierte Einzeldateien aufteilen: `01-grundlagen.md`,
   `02-umsetzung.md`, `03-analyse.md`. Die Nummer ist die Lesereihenfolge.
4. `quellen.md` im Themenordner anlegen und dort alle verwendeten Links
   sammeln – mit Abrufdatum.
5. Eine Zeile im Themenindex der Haupt-`README.md` ergänzen.

## Dokumentkopf

Jedes Dokument beginnt mit diesem Block:

```markdown
# <Titel>

> **Stand:** JJJJ-MM-TT · **Thema:** <Themenname> · **Status:** Entwurf | aktiv | zu prüfen
```

## Regeln für Inhalte

- **Zahlen mit Datum.** Jede Zahl, die sich ändern kann (Fondsvolumen, Quoten,
  TER, Indexgewichte), bekommt ein Stand-Datum oder steht in einer Tabelle mit
  gemeinsamem Stand. Lieber „rund 70 %" als eine Scheingenauigkeit.
- **Quelle oder Kennzeichnung.** Was nicht belegt ist, wird als Einschätzung
  gekennzeichnet („Einordnung:", „Faustregel:").
- **Kein Marketington.** Vor- und Nachteile stehen nebeneinander.
- **Deutsch**, Fachbegriffe beim ersten Auftreten kurz erklären.

## Commits

Kurz, auf Deutsch, im Imperativ, mit Themenpräfix:

```
staatsfonds: Regelwerk um Rebalancing-Band ergänzen
repo: Vorlage für neue Themen hinzufügen
```

## Pflege

Dokumente mit Status `zu prüfen` sind der Rückstand. Beim Nachziehen von Zahlen
das `Stand:`-Datum aktualisieren und in `quellen.md` das Abrufdatum anpassen.
