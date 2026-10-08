# Testplan Evo TD

Ziel: Spielgefühl und Balance prüfen, Fehler finden, Unklares notieren.
Tipp: Erst 20–30 Minuten **ohne** Entwickler-Panel spielen (ehrlicher Eindruck vom Einstieg),
danach mit Panel (`D`) die späten Features ansehen.

## 0. Starten

Einfachster Weg: https://claude.ai/artifact/6N4xzURPckaHNcyuywSJw9 im Browser öffnen
(eingeloggt bei claude.ai). Spielstand wird in der Cloud gesichert.

Alternativ lokal:

- [ ] Node.js LTS installiert (nodejs.org)
- [ ] Im Terminal:
      `git clone https://github.com/p6zcbtdwph-max/productivity-timer.git`
      `cd productivity-timer && git checkout claude/td-game-animal-evolution-sskxvf`
      `cd evo-td && npm install && npm run dev`
- [ ] `http://localhost:5173` öffnet das Spiel (Safari und Chrome)

## 1. Erster Run (ohne Panel)

- [ ] Einzeller bauen per Klick, jeder weitere wird teurer
- [ ] Wellen starten von selbst, Tempo 1×/2×/4×, Pause mit Leertaste
- [ ] Auto-Bau an: baut, sobald Gold reicht
- [ ] Erste Evolution zu Wurm oder Fisch passiert (Tier 2 ist ohne DNA gesperrt)
- [ ] Turm anklicken: Panel verständlich? Formelzeile "Verrechnung" lesbar?
- [ ] Elemente erkennbar (Buchstaben T/G/P/N, Rahmen, Schildbalken)
- [ ] Wie weit kommst du? Wann und warum stirbst du? → notieren
- [ ] Run-Ende: DNA-Abrechnung verständlich ("neue Wellen" vs. "bereits erreichte")

## 2. Türme bedienen

- [ ] `L` Evolution stoppen / freigeben
- [ ] `T` Zielpriorität durchschalten (Erster, Letzter, Stärkster, Schwächster, Nächster)
- [ ] `F` Fusion zweier gleicher Türme → ★1, Platz wird frei
- [ ] `V` Verlegen (erst ab Welle 5 möglich, kostet Gold)
- [ ] Nachbarn: angrenzende Türme tauchen in "Eigenschaften" als "Nachbar" auf
- [ ] Synergie: zwei gleiche Arten nebeneinander → Faktor "Synergie"

## 3. Shop, Items, Global

- [ ] Run-Shop: Upgrades kaufen, Preise steigen
- [ ] Items kaufen, Glücks-Aufwertung gesehen? Ausrüsten (4 Slots)
- [ ] Stammbaum: Tier 2 mit DNA freischalten, danach entwickeln sich Türme dorthin
- [ ] Global: erstes Artefakt freischalten und aufstufen, "Unbekanntes Artefakt" als Ziel sichtbar
- [ ] Zweiter Run: neue Bestwelle → spürbar mehr DNA? Gleiche Welle → fast nichts?
- [ ] Ab Artefakt "Instinkt": Auto-Kauf-Häkchen im Shop funktionieren

## 4. Karten (mit Panel: "Alle Karten frei")

- [ ] Global → Karten: Wechsel zu Urkontinent (Run wird abgerechnet)
- [ ] Urkontinent: Weg teilt sich, Biome farbig (Luft oben, Land/Erde Mitte, Wasser unten)
- [ ] Hindernis (B/F/R) anklicken → Preis beim Darüberfahren, räumen, bebauen
- [ ] Anhöhe (Dreieck) → ×1,2 Reichweite im Panel
- [ ] Art im Heimat-Biom → "Gelände ×1.30" in der Verrechnung
- [ ] Roboterfabrik: zwei Eingänge; nach Welle 25 HUD "🤖 … −20 %" und Meldung
- [ ] Erfolge im Global-Reiter (alle 50 Bestwellen)

## 5. Luft und Erde

- [ ] Vogel/Libelle/Biene/Fledermaus: Reichweite "global (fliegt)", Faktor "Flug ×0.70"
- [ ] Fühlt sich Luft zu stark oder zu schwach an?
- [ ] Erd-Arten (Wurm, Tausendfüßer, Maulwurf …) auf Erd-Plätzen am Urkontinent

## 6. Passiv-Modus

- [ ] Kammern: Kammer freischalten (DNA), Einzeller kaufen, Evolution über Zeit
- [ ] Tier ins Revier schicken → DNA/h sichtbar
- [ ] Tab schließen oder 5+ Minuten wechseln, zurückkommen → Bericht "Während du weg warst"
- [ ] Panel "Zeit +1 h": Winterruhe rechnet nach, hält an der Wand, Run stirbt nicht
- [ ] "Rest überspringen" funktioniert

## 7. Kompendium und Garten

- [ ] Kompendium füllt sich mit gebauten Arten, Boni steigen mit Rekord-Level/Prestige
- [ ] Garten startet mit 1 Topf; Samen nur aktiv nach Wellen (ab Welle 5, Bosse 40 %)
- [ ] Samen pflanzen, "Garten +24 h": Level und Harz steigen
- [ ] Topf 2 für 20 Harz, Pflege kaufen (Dünger, Kompost, Nistmaterial …)

## 8. Speichern

- [ ] Seite neu laden: Run, DNA, Artefakte, Kammern, Garten bleiben erhalten
- [ ] Panel "Alles löschen" setzt komplett zurück

## Fragen für das Feedback

- Erster Run: zu leicht, zu schwer, zu lang, zu kurz?
- DNA-Tempo: fühlt sich Pushen lohnend an? Freischaltpreise (Tier 2: 25, ×4 je Tier) ok?
- Was war unklar oder versteckt? Welche Anzeige fehlt?
- Garten- und Kammer-Tempo: zu langsam am Anfang?
- Luft mit globaler Reichweite: Balance?
- Erde: eigene Sonderregel gewünscht (z. B. ignoriert Schilde, lässt Roboter einsinken)?
- Bugs: was, wo, wie reproduzierbar (Screenshot hilft)

## Bekannt / bewusst offen

- Alle Zahlen sind erste Setzwerte (zentral in `src/config/balance.ts` und `src/data/*`).
- Erde hat noch keine Sonderregel. Harz hat außer Garten/Passiv noch keine Verwendung.
- Keine echte Mac-App (Tauri) – läuft im Browser.
