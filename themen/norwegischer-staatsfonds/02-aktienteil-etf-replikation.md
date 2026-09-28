# Der Aktienteil: Replikation mit ETFs

> **Stand:** 2026-09-28 · **Thema:** Norwegischer Staatsfonds · **Status:** aktiv
>
> Keine Anlageberatung. TER- und ISIN-Angaben Stand September 2026, vor einem
> Kauf am Factsheet des Anbieters prüfen.

## 1. Das Replikationsziel

Nachzubauen ist der **Aktien-Referenzindex des Fonds**. Aus
[`01-grundlagen-und-regeln.md`](01-grundlagen-und-regeln.md) sind das fünf
Eigenschaften:

| # | Eigenschaft des Fonds-Benchmarks | Schwierigkeit im ETF-Nachbau |
|---|---|---|
| 1 | FTSE Global All Cap: entwickelte Märkte **und** Schwellenländer | einfach |
| 2 | **inklusive Small Caps** (rund 9.000 Titel) | mittel – die meisten Welt-ETFs lassen Small Caps weg |
| 3 | Marktkapitalisierungsgewichtung | einfach |
| 4 | Länderfaktoren mit Europa-Neigung | mittel – nur über einen Zusatz-ETF |
| 5 | Norwegen ausgeschlossen + ethische Ausschlüsse | schwer bis unmöglich exakt |

Wichtig für die Erwartungshaltung: Punkte 1 und 3 machen den weitaus größten
Teil der Rendite aus. Punkt 2 verschiebt das Ergebnis um Zehntelprozentpunkte
pro Jahr, Punkte 4 und 5 sind Geschmacksfragen mit kleinem Renditeeffekt.

### Die drei Lücken der Standard-ETFs

- **FTSE All-World** (der Index hinter den gängigsten Welt-ETFs) ist der
  Fonds-Benchmark **ohne Small Caps**. Er deckt rund 90 bis 95 % der
  investierbaren Marktkapitalisierung ab. Es fehlen also grob **10 %
  Small Caps**.
- **MSCI ACWI** ist das MSCI-Gegenstück zu FTSE All-World, ebenfalls ohne
  Small Caps. **MSCI ACWI IMI** enthält Small Caps und ist damit der
  nächstliegende MSCI-Zwilling zu FTSE Global All Cap. Hauptunterschied der
  Indexfamilien: FTSE stuft Südkorea als entwickelten Markt ein, MSCI als
  Schwellenland – das ist ein Detail von gut 1 % Portfoliogewicht.
- **MSCI World** enthält **keine Schwellenländer** und keine Small Caps und ist
  deshalb der schlechteste der breiten Kandidaten für diesen Zweck, auch wenn
  er der bekannteste ist.

## 2. Die Bausteine

### 2.1 Ein-ETF-Lösungen (gesamter Aktienmarkt in einem Produkt)

| ETF | ISIN | Index | Small Caps | TER p. a. | Bemerkung |
|---|---|---|---|---|---|
| SPDR MSCI ACWI IMI UCITS ETF (Acc) | `IE00B3YLTY66` | MSCI ACWI IMI | **ja** | 0,17 % | **Nächste Einzel-Annäherung an FTSE Global All Cap** – DM + EM + Small Caps in einem Produkt |
| Vanguard FTSE All-World UCITS ETF (Acc) | `IE00BK5BQT80` | FTSE All-World | nein | 0,14 % | Der Klassiker; ausschüttende Variante: `IE00B3RBWM25` |
| Invesco FTSE All-World UCITS ETF (Acc) | `IE000716YHJ7` | FTSE All-World | nein | 0,15 % | Alternative zu Vanguard, Sampling |
| Amundi Prime All Country World UCITS ETF (Acc) | `IE0003XJA0J9` | Solactive GBS ACW | nein | rund 0,07 % | Günstigster Baustein, anderer Indexanbieter |
| Vanguard ESG Global All Cap UCITS ETF (Acc) | `IE00BNG8L278` | FTSE Global All Cap **Choice** | **ja** | 0,24 % | **Einziges Produkt mit exakt dem richtigen Indexzuschnitt plus Ausschlüssen**; ausschüttend: `IE00BNG8L385` |

### 2.2 Ergänzungsbausteine

| Zweck | ETF | ISIN | TER p. a. |
|---|---|---|---|
| Small Caps entwickelte Märkte | iShares MSCI World Small Cap UCITS ETF | `IE00BF4RFH31` | 0,35 % |
| Small Caps entwickelte Märkte | SPDR MSCI World Small Cap UCITS ETF | `IE00BCBJG560` | 0,45 % |
| Schwellenländer inkl. Small Caps | iShares Core MSCI EM IMI UCITS ETF (Acc) | `IE00BKM4GZ66` | 0,18 % |
| Schwellenländer | Vanguard FTSE Emerging Markets UCITS ETF (Acc) | `IE00BK5BR733` | 0,17 % |
| Entwickelte Märkte (Kern) | Vanguard FTSE Developed World UCITS ETF (Acc) | `IE00BK5BQV03` | 0,12 % |
| Europa-Übergewicht | Vanguard FTSE Developed Europe UCITS ETF (Acc) | `IE00BK5BQX27` | 0,10 % |
| Europa-Übergewicht | iShares Core MSCI Europe UCITS ETF (Acc) | `IE00B4K48X80` | 0,12 % |

## 3. Drei Musterportfolios

Die folgenden Varianten unterscheiden sich in der Genauigkeit, nicht in der
Qualität. Variante A ist für die allermeisten Anleger die vernünftige Wahl.

### Variante A – Pragmatisch (1 ETF)

| Gewicht | ETF | ISIN |
|---|---|---|
| 100 % | SPDR MSCI ACWI IMI (Acc) | `IE00B3YLTY66` |

**Mischkosten: 0,17 % p. a.**
Deckt Industrieländer, Schwellenländer und Small Caps ab – strukturell also
dasselbe wie der Fonds-Benchmark, nur mit MSCI- statt FTSE-Klassifikation. Ein
Produkt, ein Sparplan, kein Rebalancing innerhalb des Aktienteils.

*Günstigere Alternative mit bewusstem Verzicht auf Small Caps:* 100 %
Amundi Prime All Country World (`IE0003XJA0J9`) zu rund 0,07 % oder Vanguard
FTSE All-World (`IE00BK5BQT80`) zu 0,14 %.

### Variante B – Genau (3 ETFs)

Näher an der All-Cap-Struktur und mit Kontrolle über die EM-Quote:

| Gewicht | Baustein | ETF | ISIN |
|---|---|---|---|
| 79 % | Industrieländer Large/Mid | Vanguard FTSE Developed World (Acc) | `IE00BK5BQV03` |
| 11 % | Schwellenländer inkl. Small Caps | iShares Core MSCI EM IMI (Acc) | `IE00BKM4GZ66` |
| 10 % | Small Caps Industrieländer | iShares MSCI World Small Cap | `IE00BF4RFH31` |

**Mischkosten: rund 0,15 % p. a.**
Die 10 % Small Caps entsprechen ungefähr ihrem Gewicht im FTSE Global All Cap;
die 11 % Schwellenländer ihrem aktuellen Marktgewicht. Wer den Europa-Tilt des
Fonds mitnehmen will, nimmt zusätzlich 5 bis 10 % Europa-ETF und kürzt den
Industrieländer-Baustein entsprechend.

### Variante C – Ethiknah (1–2 ETFs)

| Gewicht | ETF | ISIN |
|---|---|---|
| 100 % | Vanguard ESG Global All Cap (Acc) | `IE00BNG8L278` |

**Mischkosten: 0,24 % p. a.**
Dieser ETF bildet **FTSE Global All Cap Choice** ab – also exakt den
Indexzuschnitt des Fonds (All Cap, DM + EM, rund 8.000 Titel) mit einem
vorgeschalteten Ausschlussfilter. Das ist rein strukturell die **präziseste
Ein-Produkt-Replikation** des Fonds-Aktienteils, die es am deutschen Markt
gibt.

**Aber:** Der Filter ist nicht der des Ethikrats. FTSE Choice schließt
regelbasiert ganze Kategorien aus (unter anderem Waffen, Tabak, fossile
Brennstoffe, Verstöße gegen UN-Global-Compact-Kriterien) und geht damit an
einigen Stellen **weiter** als der Fonds – der etwa Öl- und Gaskonzerne
grundsätzlich hält und sie über Stimmrechte statt Verkauf bearbeitet. Wer
„wie Norwegen" investieren will, bekommt hier also eine strengere, nicht eine
deckungsgleiche Auswahl. Das ist eine Wertentscheidung, kein Tracking-Detail.

## 4. Die Feinheiten – und ob sie sich lohnen

### 4.1 Norwegen ausschließen

Norwegische Aktien machen in der globalen Marktkapitalisierung nur eine
Größenordnung von **0,1 bis 0,2 %** aus. Für den norwegischen Staat ist der
Ausschluss zwingend (Klumpenrisiko zur eigenen Volkswirtschaft), für einen
deutschen Anleger ist er **bedeutungslos**. Kein UCITS-ETF bietet ihn an, und
ihn per Einzelaktien-Shortposition darzustellen wäre absurd.

Das *sinnvolle* Analogon ist ein anderes: Norwegen schließt seinen **Heimatmarkt**
aus, weil Arbeitsplatz, Immobilie, Rentenanspruch und Staatseinnahmen schon
dort hängen. Übertragen heißt das für einen deutschen Anleger nicht „Norwegen
raus", sondern: **Deutschland und Europa nicht zusätzlich übergewichten.** Der
Home Bias ist der Fehler, den die norwegische Regel verhindern soll.

### 4.2 Das Europa-Übergewicht

Der Fonds hat historisch ein Europa-Übergewicht gegenüber der reinen
Marktkapitalisierung. Wer das abbilden will, legt 5 bis 15 % Europa-ETF
(`IE00BK5BQX27` oder `IE00B4K48X80`) neben den Welt-ETF.

Ob man das *will*, ist offen. Die ursprüngliche Begründung war teils
währungspolitisch (Norwegens Importe kommen überwiegend aus Europa) und teils
historisch gewachsen; NBIM selbst hat über die Jahre auf eine Annäherung an
Marktgewichte hingewirkt, und das Übergewicht hat in der Rückschau Rendite
gekostet, weil US-Aktien besser liefen. **Einordnung:** Für einen Anleger im
Euroraum ist ein leichter Europa-Tilt als Währungsabsicherung der eigenen
Ausgaben begründbar – als Renditestrategie ist er es nicht.

### 4.3 Small Caps – lohnt der Aufwand?

Small Caps sind rund 10 % des All-Cap-Universums. Sie mit einem eigenen ETF
zuzukaufen kostet 0,35 bis 0,45 % TER auf diesem Anteil, also grob **0,02 bis
0,03 Prozentpunkte** Mehrkosten auf das Gesamtportfolio. Der erwartete
Renditeunterschied zwischen „mit" und „ohne" Small Caps liegt in derselben
Größenordnung wie die Streuung der Schätzungen dazu – also: **strukturell
korrekter, praktisch marginal.**

Wer es einfach haben will, nimmt die ACWI-IMI-Lösung (Variante A), die Small
Caps ohne Zusatzprodukt mitbringt.

## 5. Umsetzungshinweise

| Thema | Empfehlung | Begründung |
|---|---|---|
| Fondsdomizil | Irland (`IE…`) | Günstigere US-Quellensteuer (15 % statt 30 %) bei US-Dividenden |
| Ertragsverwendung | Thesaurierend in der Ansparphase | Weniger Buchungen, automatische Wiederanlage; ausschüttend, wenn der Sparerpauschbetrag sonst verfällt |
| Kostenmaß | **Tracking Difference**, nicht nur TER | Wertpapierleihe und Steueroptimierung können die reale Abweichung unter die TER drücken |
| Sparplan | Ja, monatlich | Entspricht dem „Rebalancing über Zuflüsse" des Fonds |
| Rebalancing | Band von ±5 Prozentpunkten, jährliche Prüfung | Das 2-Pp-Band des Fonds ist für Privatanleger nach Kosten und Steuern zu eng |
| Produktanzahl | So wenige wie möglich | Jeder zusätzliche ETF ist Rebalancing-Arbeit und eine Gelegenheit, vom Plan abzuweichen |
| Währungsabsicherung | Nein | Der Fonds sichert seinen Aktienteil ebenfalls nicht ab; Hedging kostet und hilft langfristig bei Aktien kaum |

## 6. Entscheidungshilfe

```
Willst du Small Caps dabei haben?
├─ Nein, Hauptsache günstig und breit
│   └─ Amundi Prime All Country World (IE0003XJA0J9) oder
│      Vanguard FTSE All-World (IE00BK5BQT80)
└─ Ja
    ├─ In einem Produkt  → SPDR MSCI ACWI IMI (IE00B3YLTY66)   ← Variante A
    ├─ Mit Feinsteuerung → 3-ETF-Portfolio                      ← Variante B
    └─ Mit Ausschlüssen  → Vanguard ESG Global All Cap (IE00BNG8L278) ← Variante C
```

## 7. Was hier bewusst nicht nachgebaut wird

Dieses Dokument bildet **nur den Aktienteil** ab. Der Fonds hält daneben 30 %
Anleihen sowie nicht börsennotierte Immobilien und Infrastruktur. Welche
Konsequenzen es hat, diese Seite wegzulassen, steht in
[`03-analyse-aktien-only.md`](03-analyse-aktien-only.md).

---

Weiter mit [`03-analyse-aktien-only.md`](03-analyse-aktien-only.md).
