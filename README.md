# TicketMaster · Block → Platz → Warenkorb

Chrome-/Edge-Erweiterung: **Verfügbaren Block erkennen → Block öffnen → einzelnen freien Platz erkennen und auswählen → Einkaufswagen betätigen.** Bereits beim Start vorhandene Verfügbarkeit wird erkannt; ein Wechsel von Grau zu Farbe ist nicht mehr erforderlich.

## Installation / Update

1. Projekt über GitHub **Code → Download ZIP** herunterladen und entpacken.
2. In `chrome://extensions` (Edge: `edge://extensions`) den Entwicklermodus einschalten und **Entpackte Erweiterung laden** → Ordner `extension` wählen.
3. Bei einer bestehenden Installation den Ordner durch die neue Version ersetzen und in der Erweiterungsübersicht **Neu laden** anklicken. Danach auch die Ticketseite neu laden, damit die alte Version des Bedienfelds entfernt wird.
4. Auf der vollständig geladenen Ticketseite das Erweiterungssymbol anklicken.

## Einrichten

- **Bereich der Blöcke markieren:** Ein Rechteck über den relevanten Teil der Blockübersicht ziehen. Die Suche findet die konfigurierte Verfügbarkeitsfarbe, auch wenn diese schon sichtbar ist.
- **Suchbereich für einzelne Plätze markieren:** Ein Rechteck wählen, das die Plätze nach dem Öffnen eines Blocks abdecken wird. Bei identischer Kartenposition kann es derselbe Ausschnitt wie bei den Blöcken sein. Bedienfeld und farbige Legenden aussparen. Diese Koordinaten gelten für die spätere Detailansicht, nicht für einen bereits festgelegten Platz.
- **Einkaufswagen wählen:** Das bereits sichtbare Symbol unten rechts auswählen. Der Auswahlklick betätigt es noch nicht. Das Element muss im späteren Ablauf erhalten bleiben.
- **Farben einstellen:** Die tatsächliche Farbe eines verfügbaren Blocks und eines freien Platzes festlegen. Beide sind vorläufig auf Olivgrün `#6c7400` eingestellt, angelehnt an das bereitgestellte Bild. Die Farbe einzelner Plätze im echten Shop ist noch nicht bestätigt. **Nicht jede Abweichung von Grau wird als freier Platz behandelt:** Weißraum, Text und andere Statusfarben sind keine verlässlichen Verfügbarkeitssignale.
- **Klickart einstellen:** Block und Platz können unabhängig per Einfach- oder Doppelklick bedient werden; Vorgabe ist jeweils Einfachklick.

Zunächst ohne **Aktionen automatisch ausführen** starten. Dieser Testmodus meldet einen verfügbaren Block und klickt nichts an. Für den gesamten Ablauf die Option anschließend aktivieren und erneut starten.

## Ablauf

1. Zwei aufeinanderfolgende Bilder müssen einen farblich passenden Block an derselben Position zeigen.
2. Der Block wird angeklickt. Die anschließende Platzsuche wartet auf eine sichtbare Änderung im Platzsuchbereich gegenüber der Übersicht.
3. In dieser veränderten Ansicht wird nach einem kleinen, farblich passenden Platz gesucht. Er muss ebenfalls in zwei Bildern bestätigt werden. Nach 15 Sekunden ohne bestätigten Platz wird abgebrochen.
4. Genau ein erkannter Platz wird angeklickt. Nach mindestens 250 ms wird der gewählte Einkaufswagen betätigt; ist er deaktiviert, wird bis zu drei Sekunden gewartet. Hat sich das gewählte Warenkorbelement verändert, wird abgebrochen.
5. Der Wächter stoppt. Das tatsächliche Ergebnis im Shop bitte prüfen; gesendete Ereignisse beweisen keine erfolgreiche Reservierung.

**Escape**, Stoppen, Tabwechsel, Scrollen oder eine Größenänderung stoppen alle weiteren Aktionen. Nach Scrollen oder Größenänderung müssen die Bereiche und der Einkaufswagen neu gewählt werden. Eine Blocköffnung, die selbst scrollt, eine neue Seite lädt oder den Warenkorb ersetzt, benötigt eine Anpassung an den echten Shop.

## Grenzen und Geschwindigkeit

- Die echte Ticketseite war aus der Cloud-Entwicklungsumgebung durch die Netzwerkrichtlinie gesperrt. Die Erweiterung wurde auf einer lokalen Testseite geprüft, **nicht im echten Ticketshop**. Es wurden keine echten Tickets ausgewählt und keine echten Warenkörbe verändert.
- Diese Version arbeitet bildbasiert. Chrome erlaubt höchstens zwei Tab-Aufnahmen pro Sekunde; mindestens 550 ms liegen zwischen Aufnahmen. Je Erkennungsstufe werden zwei Bilder benötigt. Hinzu kommen eine Aufnahme vor dem Blockklick, Bildverarbeitung, Ladezeit der Detailansicht und die Wartezeit vor dem Warenkorb. Es gibt keine garantierte Latenz.
- Die Suche verwendet die eingestellte Farbe mit einer Toleranz von 35 pro RGB-Kanal. Eine zusammenhängende Fläche muss mindestens zwölf passende Pixel enthalten. Ein Platz darf höchstens 48×48 CSS-Pixel groß sein und kein Seitenverhältnis über 2,5 haben. Die Auswahl bevorzugt passende Flächen oben, dann links. Preis, Sicht, zusammenhängende Sitze und Kategorien werden nicht ausgewertet.
- Der Ansichtswechsel erfordert mindestens 24 deutlich veränderte Pixel und mindestens 2 % Veränderung im gewählten Platzsuchbereich. Das ist eine bildbasierte Plausibilitätsprüfung, kein Nachweis eines bestimmten Shopzustands. Animationen oder farbige Legenden können Fehlinterpretationen verursachen. Kleine, passende Bereiche konfigurieren.
- Der Tab muss sichtbar bleiben. Die Erweiterung lädt die Seite nicht selbst neu und kann Verfügbarkeit nur erkennen, wenn der Shop sie im Browser anzeigt.
- Synthetische Mausereignisse werden nicht von jedem Shop akzeptiert. Eingebettete Frames, Navigation zu einer neuen Seite, erst später erscheinende Einkaufswagen oder eine Bestätigung der tatsächlichen Platzauswahl benötigen weitere Integration.
- Checkout und Zahlung werden nicht automatisiert.

## Datenschutz

Nur `activeTab` und `scripting`; Zugriff erfolgt nach Klick auf das Erweiterungssymbol. Aufnahmen werden lokal im Arbeitsspeicher verarbeitet und weder gespeichert noch übertragen. Es werden keine Zugangsdaten benötigt.

## Entwickeln und testen

Die Erweiterung benötigt keinen Build. Für die Entwicklung Node.js ab Version 20:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Der Browsertest nutzt `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Er prüft bereits vorhandene Verfügbarkeit, Testmodus, Reihenfolge Block → Platz → Warenkorb, einmalige Ausführung, fehlenden Ansichtswechsel, Escape zwischen den Schritten und ungültige Koordinaten nach Größenänderung. Die Aufnahme-API wird durch echte Browser-Screenshots ersetzt. Die Tab-Prüfungen des Hintergrunddiensts werden separat mit simulierten API-Antworten getestet. Der vollständige Erweiterungsbetrieb im Shop bleibt zusätzlich zu prüfen.

Für den manuellen Test `python3 -m http.server 8080 --bind 127.0.0.1` starten und im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen. Dort Blockbereich und Platzsuchbereich über der Karte markieren.
