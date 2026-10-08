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
- [ ] HUD "Nächster Turm: X 💰" stimmt (grün, wenn bezahlbar); beim Überfahren eines freien Platzes steht der Preis
- [ ] Wellen starten von selbst, Tempo 1×/2×/4×, Pause mit Leertaste
- [ ] Auto-Bau an: baut, sobald Gold reicht
- [ ] Evolution ist jetzt deutlich seltener; erste Evolution zu Wurm oder Fisch (Tier 2 gesperrt, bis Wurm/Fisch 1.500 XP haben)
- [ ] Turm anklicken: Turm-Panel erscheint oben in der Seitenleiste (kein Reiter "Turm" mehr), ✕ oder Esc schließt es
- [ ] Panel verständlich? Formelzeile "Verrechnung" lesbar?
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

- [ ] Run-Shop: Upgrades kaufen, Preise steigen, keine Obergrenze
- [ ] Mengenwahl ×1 / ×10 / ×100 / Max in jedem Shop (Run-Shop, Artefakte, Garten-Pflege, Nest-Shop); Knopf zeigt "+N: Preis"
- [ ] Items-Reiter: Items findet man nur selten nach Wellen (Meldung "🎁 …"), mit Panel "+5 Items" testen
- [ ] Anfangs 1 Ausrüstungsplatz; ausgerüstetes Item wirkt auf ALLE Türme (Verrechnung "Ausrüstung")
- [ ] Artefakte Beutel (+Platz), Elsternnest (Fundchance), Perlmuschel (Verschmelzen), Pfauenfeder (Stärke)
- [ ] Verschmelzen: zwei gleiche → "+1", Wirkung ×1,8; "Alles Gleiche verschmelzen"
- [ ] Stammbaum: "🔒 Wurm-XP x/1.500" füllt sich beim Spielen; bei 1.500 Meldung "freigeschaltet", danach entwickeln sich Türme dorthin. Fühlt sich das schwer genug an?
- [ ] Global: erstes Artefakt freischalten und aufstufen, "Unbekanntes Artefakt" als Ziel sichtbar
- [ ] Zweiter Run: neue Bestwelle → spürbar mehr DNA? Gleiche Welle → fast nichts?
- [ ] Ab Artefakt "Instinkt": Auto-Kauf-Schalter im Shop. Kauft einmal pro Welle, nur wenn kein Turm bezahlbar ist; Protokoll "🧠 Auto-Kauf (Gefahr|ruhig)"
- [ ] Gefahr (Roboter über die Hälfte/Durchbruch) → Schaden+Feuerrate; ruhig → Gold zuerst

## 4. Karten (mit Panel: "Alle Karten frei")

- [ ] Global → Karten: Wechsel zu Urkontinent (Run wird abgerechnet)
- [ ] Urkontinent: Weg teilt sich, Biome farbig (Luft oben, Land/Erde Mitte, Wasser unten)
- [ ] Hindernis (B/F/R) anklicken → Preis beim Darüberfahren, räumen, bebauen
- [ ] Anhöhe (Dreieck) → ×1,2 Reichweite im Panel
- [ ] Art im Heimat-Biom → "Gelände ×1.30" in der Verrechnung
- [ ] Roboterfabrik: zwei Eingänge; nach Welle 25 HUD "🤖 … −20 %" und Meldung
- [ ] Erfolge im Global-Reiter (alle 50 Bestwellen)

## 5. Luft und Erde

- [ ] Vogel/Libelle/Biene/Fledermaus: Reichweite "global (fliegt)", Faktor "Flug ×0.35" (deutlich schwächer als vorher)
- [ ] Fühlt sich Luft zu stark oder zu schwach an?
- [ ] Erd-Arten (Wurm, Tausendfüßer, Maulwurf …) auf Erd-Plätzen am Urkontinent

## 6. Passiv-Modus

- [ ] Start: 1 Kammer und 1 🥚 Ei (HUD); "Ei ausbrüten" → Einzeller, Evolution über Zeit
- [ ] Eier findet man selten nach Wellen (Meldung "🥚 Ein Ei!"), weitere Kammern kosten Eier
- [ ] Tier ins Revier schicken → 🥚/h sichtbar (keine DNA mehr)
- [ ] Nest-Shop (Unter-Reiter): Nistmaterial, Wildwechsel, Brutpflege, Laubdecke für Eier
- [ ] Tab schließen oder 5+ Minuten wechseln, zurückkommen → Bericht "Während du weg warst"
- [ ] Panel "Zeit +1 h": Winterruhe rechnet nach, hält an der Wand, Run stirbt nicht
- [ ] "Rest überspringen" funktioniert

## 7. Kompendium und Garten

- [ ] Kompendium: Unter-Reiter "Boni" und "Arten"; unbekannte Arten als verdeckte Karten, Boni steigen mit Rekord-Level/Prestige
- [ ] Garten startet mit 1 Topf und 1 Moos-Samen; weitere Samen sehr selten (0,3 % je Welle, Bosse 3 %), nur aktiv
- [ ] Samen pflanzen, "Garten +24 h": Level und Harz steigen
- [ ] Topf 2 für 20 Harz, Unter-Reiter "Pflege": Dünger, Kompost … (Passiv-Pflege ist jetzt im Nest-Shop)

## 8. Speichern

- [ ] Seite neu laden: Run, DNA, Artefakte, Kammern, Eier, Items, Garten bleiben erhalten
- [ ] Anderes Gerät / anderer Browser (eingeloggt bei claude.ai): Cloud-Stand wird geladen
- [ ] Panel "Alles löschen" setzt komplett zurück

## Fragen für das Feedback

- Erster Run: zu leicht, zu schwer, zu lang, zu kurz?
- DNA-Tempo: fühlt sich Pushen lohnend an? Freischalt-XP (Tier 2: 1.500, ×10 je Tier) ok?
- Samen, Eier, Items: selten genug, aber nicht frustrierend?
- Evolution: jetzt zu langsam oder richtig?
- Was war unklar oder versteckt? Welche Anzeige fehlt?
- Garten- und Kammer-Tempo: zu langsam am Anfang?
- Luft mit globaler Reichweite: Balance?
- Erde: eigene Sonderregel gewünscht (z. B. ignoriert Schilde, lässt Roboter einsinken)?
- Bugs: was, wo, wie reproduzierbar (Screenshot hilft)

## Bekannt / bewusst offen

- Alle Zahlen sind erste Setzwerte (zentral in `src/config/balance.ts` und `src/data/*`).
- Erde hat noch keine Sonderregel. Harz hat außer dem Garten noch keine Verwendung. Der Name "Eier" für die Währung ist vorläufig.
- Keine echte Mac-App (Tauri) – läuft im Browser.
