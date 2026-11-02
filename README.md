# TicketMaster · Freier Platz → Warenkorb

Chrome-/Edge-Erweiterung: **Runden farbigen Platzpunkt erkennen → einmal auf den Platz klicken → Einkaufswagen betätigen.** Graue Punkte werden ignoriert. Bereits beim Start verfügbare Plätze werden ebenfalls erkannt.

## Installieren / aktualisieren

1. Auf GitHub **Code → Download ZIP** wählen und entpacken.
2. Unter `chrome://extensions` (Edge: `edge://extensions`) den Entwicklermodus aktivieren und den Ordner `extension` über **Entpackte Erweiterung laden** auswählen.
3. Zum Aktualisieren den bisherigen Erweiterungsordner durch die neue Version ersetzen und in der Erweiterungsübersicht **Neu laden** anklicken. Anschließend auch die Ticketseite neu laden, um das alte Bedienfeld zu entfernen.
4. Die vollständig geladene Ticketseite öffnen und das Erweiterungssymbol anklicken.

## Empfohlen für S1: Blocknamen automatisch suchen

**Du musst den Block nicht selbst öffnen und auch nicht vorher als Klickziel auswählen.** Standard ist jetzt **Block nach Namen automatisch öffnen**, mit vorbelegtem Blocknamen **S1**.

1. In der Stadionübersicht den Modus **Block nach Namen automatisch öffnen** und den Namen **S1** beibehalten.
2. Den **Suchbereich für einzelne Plätze** markieren: den Kartenbereich, in dem nach der automatischen Blocköffnung die Platzpunkte erscheinen. Dabei nicht den Block öffnen; das Rechteck bezeichnet nur den späteren Suchausschnitt.
3. Den Einkaufswagen als Ziel auswählen und die Platzauswahl auf Einfachklick belassen.
4. Im Testmodus prüfen, ob „Block S1 gefunden“ gemeldet wird. Dies prüft die automatische Zuordnung des Blocknamens, bestätigt aber noch keine freien Tickets und klickt nicht.
5. **Aktionen automatisch ausführen** aktivieren und starten. Der Wächter findet S1 über den Seitentext/SVG-Blocknamen, öffnet ihn selbst unabhängig von seinem Farbton, sucht nach dem Ansichtswechsel einen freien Platz und klickt anschließend den Warenkorb.

Die automatische Namenssuche ist für zugängliche HTML-/SVG-Beschriftungen implementiert und auf einer lokalen SVG-Testseite geprüft. **Ob der echte Shop diese Beschriftungen zugänglich bereitstellt, ist weiterhin nicht verifiziert.** Eine rein als Bild oder Canvas gezeichnete Beschriftung wird nicht gelesen. Bei fehlendem, verdecktem oder mehrdeutigem Blocknamen wird abgebrochen, statt eine Position zu raten.

Diese Variante prüft den eingetragenen Block; sie leitet aus dem minimalen Farbunterschied der Gesamtübersicht keine zuverlässige Verfügbarkeit ab und durchsucht nicht automatisch alle Blöcke. Es ist nicht nachgewiesen, dass der Shop eine Platzauswahl oder einen Warenkorbvorgang ohne das Öffnen der Platzansicht unterstützt.

## Alternative: Blockziel einmalig auswählen

Der geringe Darstellungsunterschied von S1 in der Stadionübersicht wird nicht als zuverlässiges Farbsignal vorausgesetzt. Der alternative Modus heißt **Blockziel einmalig auswählen**. Dieser Modus öffnet einen ausdrücklich gewählten Block unabhängig von seiner Farbe. Er erkennt den Blocknamen nicht automatisch und durchsucht nicht alle Blöcke.

1. In der Stadionübersicht **S1 / anderen Block als Klickziel wählen** anklicken und dann genau auf S1 klicken. Damit wird nur das spätere Klickziel gespeichert; der Block wird noch nicht geöffnet.
2. Den **Suchbereich für einzelne Plätze** markieren: den Kartenbereich wählen, in dem nach dem Öffnen die einzelnen Platzpunkte erscheinen. Das Bedienfeld darf nicht darin liegen. Der Bereich ist kein festgelegter Sitzplatz; darin wird ein freier Punkt gesucht.
3. Den bereits sichtbaren **Einkaufswagen** als Klickziel auswählen.
4. Blockklick passend einstellen; Vorgabe ist Einfachklick. Falls die Webseite den Block nur per Doppelklick öffnet, entsprechend umstellen. Die Platzauswahl bleibt auf Einfachklick.
5. Im Testmodus werden nur die Eingaben geprüft: Der Block wird nicht geöffnet und freie Tickets werden damit nicht bestätigt.
6. **Aktionen automatisch ausführen** aktivieren und starten. Der Wächter öffnet den gewählten Block sofort, wartet auf eine sichtbar veränderte Platzansicht und sucht dort auch bereits verfügbare farbige Platzpunkte. Erst nach dem Platzklick folgt der Einkaufswagen. Ohne bestätigten freien Punkt erfolgt kein Warenkorbklick; nach 15 Sekunden wird abgebrochen.

Nach einem Durchlauf vor erneutem Start zur Übersicht zurückkehren und das Blockziel neu prüfen. Diese Version navigiert nicht automatisch zurück und wechselt nicht selbst zum nächsten Block. Die Suchbereiche und Klickziele gelten nur für die unveränderte Browseransicht.

## Alternative: farbige Blöcke suchen

Die Gesamtübersicht und die Detailansicht einzelner Plätze sind unterschiedliche Zustände. Der Modus **Farbige Blöcke automatisch suchen** ist nur für Übersichten mit erkennbarem farbigem Verfügbarkeitshinweis gedacht. Für sichtbare einzelne Platzpunkte den Direktmodus ausdrücklich auswählen.

In der Übersicht den Blockbereich markieren und über **Spielfeld / Legende aus der Suche ausschließen** das gesamte grüne Spielfeld sowie farbige Symbole mit eigenen Rechtecken ausblenden. Mehrere Ausschlüsse sind möglich und gelten ausschließlich für die Blocksuche, nicht für die nachfolgende Platzansicht. Nach Scrollen oder Größenänderung werden sie gelöscht.

Die Blocksuche benötigt einen farbigen Verfügbarkeitshinweis im markierten, nicht ausgeschlossenen Bereich. **Sind alle Blöcke grau und wird Verfügbarkeit erst nach dem Öffnen sichtbar, kann diese Version daraus keine freien Tickets ableiten und durchsucht die Blöcke nicht automatisch nacheinander.** Dafür ist eine Integration der tatsächlichen Blockelemente und der Rücknavigation erforderlich. Die Meldung „kein farbiger Verfügbarkeitshinweis“ bedeutet nicht, dass sicher keine Tickets existieren.

Bereits beim Start farbig angezeigte Verfügbarkeit wird sofort berücksichtigt. Es wird nicht auf eine Farbänderung gewartet. Der Testmodus meldet Treffer und klickt ausdrücklich nichts an.

## Für die gezeigte Platzansicht

1. **Plätze bereits sichtbar** als Ansicht wählen.
2. **Bereich mit Platzpunkten markieren:** Ein Rechteck über die relevanten Sitzpunkte ziehen. Farbige Bedienelemente, Symbole und Legenden außerhalb lassen. Das Bedienfeld darf nicht im Suchbereich liegen.
3. **Einkaufswagen wählen:** Das sichtbare Symbol unten rechts auswählen. Dieser Auswahlklick betätigt den Warenkorb noch nicht.
4. **Platz wählen: Einfachklick** beibehalten.
5. Zuerst ohne **Aktionen automatisch ausführen** starten. Der Testmodus meldet einen freien farbigen Punkt und klickt nichts an.
6. Für die Klickfolge die automatische Ausführung aktivieren und erneut starten.

Die Spielfeld-Ausschlüsse sind im Direktmodus nicht aktiv. Eine feste Farbe muss nicht eingestellt werden. Der olivfarbene Punkt im bereitgestellten Bild wird wie andere ausreichend farbige, annähernd runde Punkte erkannt. Nach zwei passenden Bildern wird genau ein Punkt angeklickt. Danach wartet der Wächter mindestens 250 ms und betätigt den gewählten Warenkorb. Ein deaktivierter Warenkorb wird bis zu drei Sekunden abgewartet. Danach stoppt der Wächter; eine Wiederholung erfordert einen neuen Start.

**Escape**, Stoppen oder ein unsichtbarer Tab stoppen weitere Aktionen. Nach Scrollen oder Änderung der Fenstergröße müssen Suchbereiche und Einkaufswagen neu gewählt werden.

## Optional: zuerst einen Block öffnen

Für eine Übersicht mit farbiger Verfügbarkeit **Farbige Blöcke automatisch suchen** auswählen und zusätzlich den Blockbereich markieren. Der Platzsuchbereich bezeichnet dann den Ausschnitt, in dem nach Öffnen des Blocks die einzelnen Plätze erscheinen werden.

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
- Im Blockmodus erfordert der Ansichtswechsel mindestens 24 veränderte Pixel (RGB-Kanaldifferenz über 24) und mindestens 2 % Veränderung im Platzsuchbereich. Animationen sind kein verlässlicher Nachweis eines bestimmten Shopzustands.
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

Der Browsertest nutzt `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Geprüft werden der Direktmodus (auch mit einem gedämpft olivfarbenen Punkt), Testmodus, Block → Platz → Warenkorb, vorhandene Verfügbarkeit mit ausgeschlossenem grünem Spielfeld, automatische Suche des SVG-Blocknamens S1, fehlende und mehrdeutige Blocknamen, gezielter grauer Block ohne Farbsignal, kein Warenkorbklick ohne freien Punkt, Suchstatus ohne Verfügbarkeit, einmalige Ausführung, fehlender Ansichtswechsel, Escape zwischen den Schritten und ungültige Koordinaten nach Größenänderung. Die Aufnahme-API wird durch echte Browser-Screenshots ersetzt; Tab-Prüfungen werden separat mit simulierten API-Antworten getestet. Der vollständige Erweiterungsbetrieb im Shop bleibt zu prüfen.

Für den manuellen Test `python3 -m http.server 8080 --bind 127.0.0.1` starten und im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen.
