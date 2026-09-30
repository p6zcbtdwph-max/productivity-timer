# Den norwegischen Staatsfonds mit ETFs nachbauen

**Handout · Fokus: Aktienseite · Stand: 2026-09-30**
*Keine Anlageberatung. ISIN-, TER- und Indexangaben vor einer Anlage am aktuellen Factsheet des Anbieters prüfen.*

---

## 1 · Die Regeln des Fonds

Der **Government Pension Fund Global (GPFG)** gehört dem norwegischen Staat, wird von **NBIM** (Norges Bank Investment Management) verwaltet, und das Finanzministerium gibt die Regeln vor. Diese Trennung ist die eigentliche Erfolgsregel: Strategiewechsel aus Marktstimmung heraus sind unmöglich, weil sie einen politischen Prozess erfordern.

| Regel | Inhalt | Für Privatanleger |
|---|---|---|
| **Strategische Quote** | 70 % Aktien / 30 % Anleihen (seit Mai 2019). Dazu wenige Prozent nicht börsennotierte Immobilien und erneuerbare Infrastruktur, finanziert als Abweichung vom Index. Ist-Aktienquote Mitte 2026: rund 72 % | Zielquote schriftlich festlegen |
| **Aktien-Benchmark** | **FTSE Global All Cap** – Industrie- **und** Schwellenländer, **Large, Mid und Small Caps**, rund 9.000 Titel aus ca. 49 Ländern. Marktkapitalisierungs­gewichtet mit Länderfaktoren (historisch Europa-Übergewicht) | 1 bis 3 ETFs, siehe Abschnitt 3 |
| **Heimatmarkt ausgeschlossen** | Keine norwegischen Aktien. Grund: Der Staat hängt über Steuern, Equinor und die heimische Wirtschaft ohnehin an Norwegen | Analogon: Deutschland/Europa **nicht** übergewichten |
| **Anleihe-Benchmark** | 70 % Staats- und staatsnahe, 30 % Unternehmens­anleihen. Zweck ist Risikodämpfung und Liquidität, nicht Rendite | Wenn gewünscht: EUR-Anleihen oder Tagesgeld, nicht die Fondskopie |
| **Rebalancing** | Weicht die Aktienquote am Monatsende um **mehr als 2 Prozentpunkte** von 70 % ab, wird zurückgewichtet. Neue Öl-Zuflüsse gehen bevorzugt in die untergewichtete Klasse | Band von ±5 Pp (Kosten/Steuern), plus Sparplan |
| **Aktives Management** | Tracking-Error-Limit von rund 1,25 Prozentpunkten – der Fonds ist zu weit über 95 % indexnah | Keine Einzelwetten |
| **Kosten** | Rund 0,04–0,05 % p. a. – Größenvorteil, kein Können | Realistisch 0,07–0,25 % p. a. |
| **Ethik** | Unabhängiger Ethikrat (Etikkrådet) empfiehlt Ausschlüsse: produktbasiert (Tabak, bestimmte Waffen, Kohle über Schwellenwerten) und verhaltensbasiert (Menschenrechte, Umwelt, Korruption). Ölkonzerne bleiben bewusst drin und werden über Stimmrechte bearbeitet | Nur näherungsweise über Screened-Indizes |
| **Entnahme** | „Handlungsregel": im Schnitt nur die erwartete **reale** Rendite, seit 2017 mit **3 %** angesetzt | Entnahmeregel im Ruhestand |

> **Stand 2026, zu prüfen:** Seit 2025 gelten vorläufige ethische Richtlinien; die Norges Bank trifft vorerst keine neuen Ausschlussentscheidungen, kann alte aber aufheben. Aktuellen Stand bei NBIM und Etikkrådet nachsehen.

**Die Rendite des Fonds ist unspektakulär** – langfristig grob 4 % real p. a. Der Erfolg kommt aus drei kopierbaren Dingen: hohe Aktienquote über lange Zeit, maximale Streuung zu minimalen Kosten, und ein schriftliches Regelwerk, von dem niemand abweichen darf.

---

## 2 · Was auf der Aktienseite nachzubauen ist

Der Benchmark ist **FTSE Global All Cap**. Entscheidend sind drei Punkte:

- **„All Cap" heißt: mit Small Caps.** Die gängigen Welt-ETFs lassen sie weg. *FTSE All-World* ist genau dieser Index **ohne** die rund 10 % Small Caps.
- **MSCI ACWI IMI** ist der nächste MSCI-Zwilling zu FTSE Global All Cap – ebenfalls Industrieländer + Schwellenländer + Small Caps. Einziger nennenswerter Unterschied: FTSE zählt Südkorea zu den Industrieländern, MSCI zu den Schwellenländern (gut 1 % Gewicht).
- **MSCI World ist der falsche Index** für diesen Zweck: keine Schwellenländer, keine Small Caps – obwohl er der bekannteste ist.

Zur Erwartungshaltung: Breite Streuung und Marktgewichtung machen praktisch die gesamte Rendite aus. Small Caps verschieben das Ergebnis um Zehntelprozentpunkte, Länderfaktoren und Ausschlüsse sind Geschmacksfragen mit kleinem Renditeeffekt.

---

## 3 · Die drei Umsetzungswege

### Weg A — Pragmatisch: ein ETF, strukturell korrekt

| Gewicht | ETF | ISIN | Index | TER |
|---|---|---|---|---|
| 100 % | SPDR MSCI ACWI IMI (Acc) | `IE00B3YLTY66` | MSCI ACWI IMI | **0,17 %** |

Industrieländer, Schwellenländer und Small Caps in einem Produkt – strukturell dasselbe wie der Fonds-Benchmark, nur mit MSCI- statt FTSE-Klassifikation. Ein Sparplan, kein internes Rebalancing. **Für die meisten die vernünftige Wahl.**

*Günstigere Varianten mit bewusstem Verzicht auf Small Caps:*
Amundi Prime All Country World (Acc) `IE0003XJA0J9`, rund 0,07 % · Vanguard FTSE All-World (Acc) `IE00BK5BQT80`, 0,14 % (ausschüttend: `IE00B3RBWM25`) · Invesco FTSE All-World (Acc) `IE000716YHJ7`, 0,15 %

### Weg B — Genau: drei ETFs, volle Kontrolle

| Gewicht | Baustein | ETF | ISIN | TER |
|---|---|---|---|---|
| 79 % | Industrieländer Large/Mid | Vanguard FTSE Developed World (Acc) | `IE00BK5BQV03` | 0,12 % |
| 11 % | Schwellenländer inkl. Small Caps | iShares Core MSCI EM IMI (Acc) | `IE00BKM4GZ66` | 0,18 % |
| 10 % | Small Caps Industrieländer | iShares MSCI World Small Cap | `IE00BF4RFH31` | 0,35 % |

**Mischkosten rund 0,15 % p. a.** Die 10 % Small Caps entsprechen ungefähr ihrem Gewicht im All-Cap-Universum, die 11 % Schwellenländer ihrem Marktgewicht. Wer das Europa-Übergewicht des Fonds mitnehmen will, nimmt 5–10 % Europa-ETF dazu und kürzt den Industrieländer-Baustein: Vanguard FTSE Developed Europe (Acc) `IE00BK5BQX27` (0,10 %) oder iShares Core MSCI Europe (Acc) `IE00B4K48X80` (0,12 %).

### Weg C — Ethiknah: der präziseste Indexzuschnitt

| Gewicht | ETF | ISIN | Index | TER |
|---|---|---|---|---|
| 100 % | Vanguard ESG Global All Cap (Acc) | `IE00BNG8L278` | FTSE Global All Cap **Choice** | **0,24 %** |

Das einzige Produkt mit **exakt dem Indexzuschnitt des Fonds** (All Cap, Industrie- + Schwellenländer, rund 8.000 Titel) plus vorgeschaltetem Ausschlussfilter. Ausschüttend: `IE00BNG8L385`.

**Aber:** Der Filter ist nicht der des Ethikrats. FTSE Choice schließt regelbasiert ganze Kategorien aus – unter anderem **fossile Brennstoffe**, Waffen, Tabak – und geht damit weiter als der Fonds, der Öl- und Gaskonzerne bewusst hält und über Stimmrechte bearbeitet. Man bekommt eine strengere, nicht eine deckungsgleiche Auswahl. Das ist eine Wertentscheidung, kein Tracking-Detail.

### Entscheidungsbaum

```
Sollen Small Caps dabei sein?
├─ Nein, Hauptsache günstig und breit
│   └─ Amundi Prime ACW (IE0003XJA0J9) oder Vanguard FTSE All-World (IE00BK5BQT80)
└─ Ja
    ├─ in einem Produkt   → SPDR MSCI ACWI IMI (IE00B3YLTY66)        ← Weg A
    ├─ mit Feinsteuerung  → 3-ETF-Portfolio                           ← Weg B
    └─ mit Ausschlüssen   → Vanguard ESG Global All Cap (IE00BNG8L278) ← Weg C
```

---

## 4 · Praxis

| Thema | Empfehlung | Warum |
|---|---|---|
| Fondsdomizil | Irland (`IE…`) | 15 statt 30 % US-Quellensteuer auf Dividenden |
| Ertragsverwendung | Thesaurierend in der Ansparphase | Automatische Wiederanlage; ausschüttend, wenn sonst der Sparerpauschbetrag verfällt |
| Kostenmaß | **Tracking Difference**, nicht nur TER | Wertpapierleihe und Steueroptimierung können die reale Abweichung unter die TER drücken |
| Sparplan | Monatlich | Entspricht dem „Rebalancing über Zuflüsse" des Fonds |
| Rebalancing | ±5 Pp, jährliche Prüfung | Das 2-Pp-Band des Fonds ist nach Kosten und Steuern zu eng |
| Produktanzahl | So wenige wie möglich | Jeder ETF mehr ist Arbeit und eine Gelegenheit, vom Plan abzuweichen |
| Währungsabsicherung | Nein | Der Fonds sichert seinen Aktienteil auch nicht ab |
| Norwegen ausschließen | Nicht nötig | Norwegen ist 0,1–0,2 % der Weltmarktkapitalisierung; kein UCITS-ETF bietet es an |

---

## 5 · Der eine Vorbehalt zur reinen Aktienlösung

Wer nur die Aktienseite umsetzt, baut nicht den Staatsfonds nach, sondern **dessen Renditemotor ohne dessen Stoßdämpfer**. Die 30 % Anleihen finanzieren beim Fonds die laufenden Entnahmen, ohne im Tief verkaufen zu müssen, und liefern die Munition fürs antizyklische Nachkaufen.

- **In der Ansparphase ist Aktien-only sachgerecht:** Humankapital, Rentenansprüche und der Notgroschen auf dem Tagesgeldkonto erfüllen die Pufferfunktion bereits – nur eben außerhalb des Depots.
- **In der Entnahmephase ist es riskant:** Verkaufte Anteile nehmen an der Erholung nicht mehr teil. Zwei bis fünf Jahresausgaben schwankungsarm vorhalten.
- **Der Preis ist der Drawdown:** 2008 verlor der Aktienteil des Fonds rund 40 %, der Gesamtfonds rund 23 %. *(Zahlen gerundet, am NBIM-Jahresbericht gegenzuprüfen.)*

**Checkliste – Aktien-only ist vertretbar, wenn alles zutrifft:**
☐ Horizont ≥ 15 Jahre ohne geplante Entnahme ☐ Notgroschen außerhalb des Depots ☐ keine Großausgabe absehbar ☐ krisenfestes Einkommen ☐ ehrlich: 18 Monate lang 40 % im Minus – wird weiter eingezahlt?

Trifft ein Punkt nicht zu, ist nicht der ETF falsch, sondern die Quote.

---

## 6 · Quellen

NBIM Benchmark-Index · nbim.no/en/investments/benchmark-index/
NBIM Jahresbericht 2025 und Halbjahresbericht 2026 · nbim.no
Rebalancing-Regeln, Meld. St. 17 (2011–2012) · regjeringen.no
Ausschlüsse: nbim.no/en/responsible-investment/exclusion-of-companies/ · etikkradet.no/excluded-companies/
Produktdaten: justETF-Profile zu den genannten ISINs, Anbieter-Factsheets

*Recherchehinweis: `nbim.no` war aus dem verwendeten Cloud-Container per Netzwerk-Policy nicht direkt abrufbar. Die Fondszahlen beruhen auf Suchergebnis-Auszügen dieser Seiten und auf Sekundärquellen; die im Text als „zu prüfen" markierten Angaben sollten am Primärdokument verifiziert werden.*
