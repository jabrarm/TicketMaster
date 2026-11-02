# TicketMaster · Freier Platz → Warenkorb

Chrome-/Edge-Erweiterung: **Runden farbigen Platzpunkt erkennen → einmal auf den Platz klicken → Einkaufswagen betätigen.** Graue Punkte werden ignoriert. Bereits beim Start verfügbare Plätze werden ebenfalls erkannt.

## Installieren / aktualisieren

1. Auf GitHub **Code → Download ZIP** wählen und entpacken.
2. Unter `chrome://extensions` (Edge: `edge://extensions`) den Entwicklermodus aktivieren und den Ordner `extension` über **Entpackte Erweiterung laden** auswählen.
3. Zum Aktualisieren den bisherigen Erweiterungsordner durch die neue Version ersetzen und in der Erweiterungsübersicht **Neu laden** anklicken. Anschließend auch die Ticketseite neu laden, um das alte Bedienfeld zu entfernen.
4. Die vollständig geladene Ticketseite öffnen und das Erweiterungssymbol anklicken.

## Für die gezeigte Platzansicht

1. **Plätze bereits sichtbar** als Ansicht wählen (Standard).
2. **Bereich mit Platzpunkten markieren:** Ein Rechteck über die relevanten Sitzpunkte ziehen. Farbige Bedienelemente, Symbole und Legenden außerhalb lassen. Das Bedienfeld darf nicht im Suchbereich liegen.
3. **Einkaufswagen wählen:** Das sichtbare Symbol unten rechts auswählen. Dieser Auswahlklick betätigt den Warenkorb noch nicht.
4. **Platz wählen: Einfachklick** beibehalten.
5. Zuerst ohne **Aktionen automatisch ausführen** starten. Der Testmodus meldet einen freien farbigen Punkt und klickt nichts an.
6. Für die Klickfolge die automatische Ausführung aktivieren und erneut starten.

Eine feste Farbe muss nicht eingestellt werden. Der olivfarbene Punkt im bereitgestellten Bild wird wie andere ausreichend farbige, annähernd runde Punkte erkannt. Nach zwei passenden Bildern wird genau ein Punkt angeklickt. Danach wartet der Wächter mindestens 250 ms und betätigt den gewählten Warenkorb. Ein deaktivierter Warenkorb wird bis zu drei Sekunden abgewartet. Danach stoppt der Wächter; eine Wiederholung erfordert einen neuen Start.

**Escape**, Stoppen oder ein unsichtbarer Tab stoppen weitere Aktionen. Nach Scrollen oder Änderung der Fenstergröße müssen Suchbereiche und Einkaufswagen neu gewählt werden.

## Optional: zuerst einen Block öffnen

Falls nur die Blockübersicht sichtbar ist, **Erst Block öffnen** auswählen und zusätzlich den Blockbereich markieren. Der Platzsuchbereich bezeichnet dann den Ausschnitt, in dem nach Öffnen des Blocks die einzelnen Plätze erscheinen werden.

Der Wächter sucht zuerst eine farbige Fläche im Blockbereich und öffnet den Block. Danach muss sich die Platzansicht sichtbar ändern. Erst dann sucht er einen einzelnen farbigen Platzpunkt. Nach 15 Sekunden ohne bestätigte Platzansicht mit freiem Punkt wird abgebrochen; der Warenkorb wird nicht betätigt. Block und Platz sind unabhängig per Einfach- oder Doppelklick bedienbar. Der Direktmodus wartet ohne Zeitlimit auf einen freien Punkt.

## Grenzen

- Die echte Ticketseite war aus der Cloud-Entwicklungsumgebung durch die Netzwerkrichtlinie gesperrt. Die Erkennung und Klickfolge wurden auf einer lokalen Testseite geprüft, **nicht im echten Ticketshop**. Der Screenshot dient als Hinweis für die Darstellung; er beweist keine erfolgreiche Integration. Es wurden keine echten Tickets oder Warenkörbe verändert.
- Farbig bedeutet eine Differenz von mindestens 25 zwischen dem höchsten und niedrigsten RGB-Kanal. Weiß, Schwarz und Grau zählen nicht als farbig. Ein Platz benötigt mindestens zwölf zusammenhängende passende Pixel, maximal 48×48 CSS-Pixel, ein Seitenverhältnis von höchstens 1,5 und eine Flächendichte zwischen 0,5 und 0,94. Das ist eine Formheuristik, keine semantische Prüfung der Verfügbarkeit. Farbige runde Symbole oder andersfarbige belegte Plätze im Suchbereich können ebenfalls erkannt werden.
- Die Auswahl bevorzugt Punkte oben, dann links. Preis, Sicht, Kategorie und zusammenhängende Plätze werden nicht berücksichtigt. Die Suchfläche entsprechend begrenzen.
- Chrome erlaubt höchstens zwei Tab-Aufnahmen pro Sekunde. Aufnahmen erfolgen mindestens 550 ms auseinander. Zwei Bilder bestätigen eine Erkennung: ungefähr 0,6–1,2 Sekunden plus Aufnahme-/Verarbeitungszeit im Direktmodus, danach die Wartezeit vor dem Warenkorb. Der Blockmodus benötigt zusätzliche Aufnahmen und Ladezeit. Keine garantierte Latenz.
- Der Tab muss sichtbar bleiben. Die Seite wird nicht selbst neu geladen. Der Wächter sieht nur die vom Shop im Browser angezeigte Verfügbarkeit.
- Synthetische Mausereignisse werden nicht von jedem Shop akzeptiert. Ein Klick ist kein Nachweis einer erfolgreichen Platzauswahl oder Reservierung. Das tatsächliche Ergebnis bitte im Shop prüfen.
- Der ausgewählte Warenkorb muss sichtbar bleiben und als Seitenelement erhalten sein. Erscheint er erst nach der Platzauswahl oder wird er ersetzt, benötigt das eine Integration für die konkrete Seite. Ein verändertes Ziel wird nicht blind angeklickt.
- Ein Blockwechsel mit Navigation zu einer neuen Seite, Scrollen oder Größenänderung beendet den Ablauf. Eingebettete Frames benötigen zusätzliche Integration.
- Im Blockmodus erfordert der Ansichtswechsel mindestens 24 deutlich veränderte Pixel und mindestens 2 % Veränderung im Platzsuchbereich. Animationen sind kein verlässlicher Nachweis eines bestimmten Shopzustands.
- Checkout und Zahlung werden nicht automatisiert.

## Datenschutz

Nur `activeTab` und `scripting`; Zugriff erfolgt nach Klick auf das Erweiterungssymbol. Aufnahmen werden lokal im Arbeitsspeicher verarbeitet und weder gespeichert noch an einen Server übertragen. Es werden keine Zugangsdaten benötigt.

## Entwickeln und testen

Die Erweiterung selbst benötigt weder Build noch npm-Pakete. Für Tests Node.js ab Version 20:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Der Browsertest nutzt `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Geprüft werden der Direktmodus (auch mit einem gedämpft olivfarbenen Punkt), Testmodus, Block → Platz → Warenkorb, einmalige Ausführung, fehlender Ansichtswechsel, Escape zwischen den Schritten und ungültige Koordinaten nach Größenänderung. Die Aufnahme-API wird durch echte Browser-Screenshots ersetzt; Tab-Prüfungen werden separat mit simulierten API-Antworten getestet. Der vollständige Erweiterungsbetrieb im Shop bleibt zu prüfen.

Für den manuellen Test `python3 -m http.server 8080 --bind 127.0.0.1` starten und im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen.
