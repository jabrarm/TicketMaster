# TicketMaster · 3 × Zoom → Block → Platz → cart add

Version 0.7 ersetzt die vorherigen Suchmodi durch einen festen Ablauf:

1. In der am weitesten entfernten Stadionansicht beginnen.
2. Genau **drei getrennte Mausradereignisse zum Hineinzoomen** senden.
3. Einen bereits vorhandenen oder neu farbig markierten verfügbaren Block in der kleinen Übersicht oben rechts erkennen und **einmal anklicken**.
4. Erst nach einer erkannten Veränderung der großen Platzansicht einen freien farbigen runden Punkt suchen und **einmal anklicken**.
5. Die daraufhin erscheinende aktive Hinzufügen-Schaltfläche über Tooltip **cart add**, Beschriftung, Symbolmerkmal oder ein einmalig eingelerntes Ziel finden und **einmal anklicken**.
6. Stoppen und das tatsächliche Ergebnis im Shop prüfen.

**Kein Blockname und keine feste Warenkorbposition werden eingegeben.** Das Bedienfeld sitzt unten links, damit es die Übersicht oben rechts nicht verdeckt. Das Verfahren ist auf lokalen Testseiten mit SVG- und Canvas-Miniaturkarten geprüft. Der echte Shop ist weiterhin nicht verifiziert: Seine Domain wird in der Cloud-Ausführungsumgebung mit HTTP 403 vom Netzwerkproxy blockiert. Ein erfolgreicher lokaler Test beweist keine erfolgreiche Reservierung im echten Shop.

## Installieren / aktualisieren

1. Auf GitHub **Code → Download ZIP** wählen und entpacken.
2. In Chrome `chrome://extensions` oder in Edge `edge://extensions` den Entwicklermodus einschalten und den Ordner `extension` über **Entpackte Erweiterung laden** öffnen.
3. Bei einem Update den bisherigen Erweiterungsordner ersetzen und in der Erweiterungsübersicht **Neu laden** anklicken. Auch die Ticketseite neu laden, um das alte Bedienfeld zu entfernen.

## Einrichten und starten

1. Die echte Ticketseite vollständig laden lassen, vorhandene Platzauswahl zurücksetzen und die Karte **manuell ganz herauszoomen**. Der Wächter kann den Ausgangszoom nicht zuverlässig selbst bestimmen oder zurücksetzen. Bei bereits aktiver cart-add-Schaltfläche wird kein neuer automatischer Durchlauf gestartet.
2. Erweiterungssymbol anklicken und **Großen Kartenbereich markieren** wählen. Ein Rechteck über den großen Saalplan ziehen, ohne Kopfzeile, Mengen- und Preissteuerungen. Der Mittelpunkt dieses Rechtecks ist der Ursprung der drei Mausradereignisse. Die Miniaturübersicht wird bei der späteren Sitzsuche automatisch ausgespart.
3. **Ablauf starten**. Es werden genau drei Zoomereignisse gesendet und anschließend wird eine sichtbare Kartenänderung verlangt. Es gibt keine weiteren automatischen Zoomschritte.
4. Die Miniaturübersicht wird nach Möglichkeit anhand ihrer Seitenstruktur erkannt. Falls das nicht gelingt, wartet der Ablauf nach dem dritten Zoom: **Übersicht oben rechts markieren** wählen und nur das kleine Miniatur-Stadion eng mit einem Rechteck umrahmen, ohne Schließen-Knopf und sonstige Symbole. Danach geht es automatisch weiter, ohne erneut zu zoomen. Der Ausschnitt darf auch schon vor dem Start konfiguriert werden, wenn seine spätere Position bekannt ist.
5. **Ohne Häkchen** bei „Block, Platz und cart add automatisch anklicken“ ist dies ein Testlauf: Er zoomt dreimal und bestätigt einen verfügbaren Block, führt aber keine Auswahlklicks aus.
6. Für den vollständigen Ablauf vor dem nächsten Start wieder ganz herauszoomen, gegebenenfalls die Bereiche neu markieren und das Häkchen aktivieren. Die Startansicht darf nicht vom vorherigen Test bereits vergrößert sein.

Der Wächter wartet auch auf später erscheinende Verfügbarkeit, ohne die Seite neu zu laden und ohne erneut zu zoomen. Er berücksichtigt bereits vorhandene Tickets sofort. Pro Durchlauf wird höchstens ein Block, ein Platz und eine Hinzufügen-Aktion angeklickt.

## Feste Reihenfolge und Abbruch

- Ein Platz wird erst nach dem Blockklick und einer bestätigten Änderung der großen Kartenansicht gesucht. Änderungen ausschließlich in der Miniaturübersicht reichen nicht aus.
- Die Miniaturkarte wird bei der Sitzsuche ausgeblendet, damit ein kleiner farbiger Block dort nicht als Sitz angeklickt wird.
- Freie Plätze müssen in zwei Aufnahmen an annähernd derselben Stelle bestätigt werden. Nach 15 Sekunden ohne bestätigte Platzansicht mit freiem Punkt wird abgebrochen.
- Die Hinzufügen-Schaltfläche darf am Anfang fehlen. Sie wird erst nach dem Platzklick gesucht, muss sichtbar, aktiv und eindeutig sein. Nach acht Sekunden ohne eindeutiges Ziel oder bei mehreren Zielen wird abgebrochen.
- Escape, Stoppen und Tabwechsel brechen die noch ausstehenden Schritte ab. Scrollen der Browserseite oder eine Größenänderung stoppt den Ablauf und verwirft die eingegebenen Rechtecke. Internes Zoomen der Karte ist davon zu unterscheiden.
- Der Wächter navigiert nicht selbst zurück, leert keinen Warenkorb und führt weder Checkout noch Zahlung aus. Vor einem weiteren Start Auswahlzustand prüfen und zur ganz herausgezoomten Ausgangsansicht zurückkehren.

## Wie der farbige Block erkannt wird

Vorrangig werden zugängliche Blockelemente in der Miniaturübersicht anhand von Verfügbarkeitsattributen, eindeutigem Status oder farbiger Blockfüllung ausgewertet. Unterstützt werden Blockattribute, Blockklassen und übliche SVG-Blockkennungen; graue Füllungen zählen nicht, eine ausdrückliche Nichtverfügbarkeit hat Vorrang vor der Farbe. Die Blocknamen werden intern als Kennungen verwendet, aber nicht vom Benutzer eingegeben.

Bei einer als Bild/Canvas dargestellten oder unbekannten Übersicht wird der markierte Ausschnitt bildbasiert untersucht. Kleine zusammenhängende farbige Flächen im äußeren Stadionring dienen als mögliche Blockmarkierungen. Große zentrale Flächen und dünne Umrissrahmen sollen dadurch ausgeschlossen werden. **Das ist eine Heuristik für die angenommene Stadionansicht, keine semantische Garantie:** Eine anders gestaltete Miniaturkarte, ein zu weit gefasster Ausschnitt, farbige Legenden, ausgewählte statt verfügbare Blöcke oder sehr kleine Markierungen können zu Fehlinterpretationen oder fehlenden Treffern führen. Deshalb zuerst einen Testlauf durchführen und die tatsächlich erkannte Markierung prüfen.

Der erste bestätigte farbige Kandidat wird verwendet. Eine Priorisierung nach Preis, Kategorie, Tribüne oder zusammenhängenden Sitzplätzen ist nicht implementiert. In der großen Karte gilt die beschriebene Annahme: farbige runde Punkte sind freie Plätze, graue Punkte nicht. Sollte der Shop farbige Punkte auch für andere Status verwenden, muss die Erkennung angepasst werden.

## cart add und einmaliges Einlernen

Die Wortreihenfolge **cart add** wird jetzt ausdrücklich erkannt. Zusätzlich werden übliche native und Framework-Tooltipattribute, zugeordnete Tooltiptexte, Beschriftungen wie „In den Warenkorb“ / „Add items“ und cart-plus-Symbolmerkmale ausgewertet. Reine Warenkorb-Navigation und Checkout-Schaltflächen sind keine Hinzufügen-Aktion.

Falls der Shop keine auswertbare Beschriftung bereitstellt, kann das sichtbare Symbol einmal eingelernt werden: außerhalb eines laufenden Ablaufs einen Platz manuell auswählen, **cart-add-Symbol einmal einlernen** wählen und den Knopf auswählen. Dieser Lernklick betätigt ihn nicht. Gespeichert wird nur ein eindeutiger CSS-Selektor für die betreffende Shopadresse. Das Ziel darf später zunächst fehlen oder als neues Element mit demselben Merkmal entstehen. Danach die manuelle Auswahl im Shop zurücksetzen und zur ganz herausgezoomten Ausgangsansicht zurückkehren.

Ein gelernter Selektor hat Vorrang. Bei fehlenden oder mehrdeutigen Merkmalen wird nicht auf ein zufälliges anderes Ziel ausgewichen. **Gelerntes Warenkorbziel löschen** entfernt die Zuordnung. Reine CSS-Hover-Tooltips ohne auswertbare Metadaten, geschlossene Shadow DOMs und eingebettete Frames benötigen eine zusätzliche Integration.

## Technische Grenzen

- „Drei Mausradschritte“ bedeutet hier drei synthetische WheelEvents mit jeweils `deltaY=-100`, Pixelmodus und etwa 180 ms Abstand. Das sind keine vertrauenswürdigen Hardwareereignisse. Der tatsächliche Zoomfaktor ist von der Kartenbibliothek abhängig und entspricht nicht garantiert drei physischen Rastungen des eigenen Mausrads. Akzeptiert die Karte diese Ereignisse nicht, wird ohne Auswahlklick gestoppt. Das ist im echten Shop noch zu prüfen.
- Die Startansicht muss vom Benutzer vorbereitet werden. Die Anwendung prüft die sichtbare Änderung, aber nicht, ob ein bestimmter numerischer Zoomfaktor erreicht wurde.
- Chrome erlaubt höchstens zwei Tab-Aufnahmen pro Sekunde; mindestens 550 ms liegen zwischen Aufnahmen. DOM-basierte Blockerkennung kann schneller reagieren, bildbasierte Bestätigung und die Sitzsuche benötigen mehrere Aufnahmen. Es gibt keine garantierte Gesamtlatenz.
- Die Karten- und Blocköffnung werden anhand sichtbarer Bildänderungen geprüft. Diese sind ein Plausibilitätssignal, kein Nachweis des internen Shopzustands. Animationen können stören.
- Maus- und Mausradereignisse werden synthetisch gesendet. Manche Webseiten akzeptieren sie nicht. Gesendete Klicks sind kein Nachweis für eine erfolgreiche Reservierung oder Warenkorbänderung.
- Die Übersicht muss oberhalb/außerhalb überlagernder Shopdialoge sichtbar sein. Der Tab muss sichtbar bleiben. Änderungen von Layout, Zoomverhalten und Farben können eine neue Kalibrierung oder Anpassung erfordern.

## Datenschutz

`activeTab` und `scripting` erlauben Zugriff nach Klick auf das Erweiterungssymbol. `storage` speichert nur ein ausdrücklich eingelerntes Warenkorbziel lokal, nach Origin und Pfad der Shopseite, ohne URL-Parameter. Bildschirmaufnahmen bleiben im Arbeitsspeicher und werden weder gespeichert noch an einen Server gesendet. Keine Zugangsdaten erforderlich.

## Entwicklung und Prüfung

Die Erweiterung benötigt keinen Build. Für Tests Node.js ab Version 20:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Die Browsertests verwenden `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Sie prüfen den gesamten neuen Ablauf mit genau drei Zoomereignissen, SVG-/Canvas-Blockmarkierungen, bestehender und später erscheinender Verfügbarkeit, Kalibrierung nach dem Zoom, Vorrang des Blockklicks, Maskierung der Miniaturkarte, fehlender Blocköffnung, cart-add-Tooltip, Abbruch zwischen den Schritten und nicht reagierendem Mausrad. Die Chrome-Aufnahme-API wird im Test durch echte Browser-Screenshots ersetzt; Tab-Prüfungen werden separat simuliert. Die eigentliche Shopintegration und vollständige Erweiterungsausführung sind damit noch nicht bestätigt.

Für einen manuellen Test `python3 -m http.server 8080 --bind 127.0.0.1` starten und im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen. Die Demo startet ganz herausgezoomt und zeigt ihre Miniaturübersicht nach drei Mausradereignissen.
