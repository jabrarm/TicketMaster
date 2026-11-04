# TicketMaster · Alternative ohne Block-Farberkennung

Version **0.8** ergänzt einen neuen Standardmodus: **Einmal eingelernte Blockpunkte nacheinander öffnen → freien Platz im großen Saalplan erkennen → Platz anklicken → cart add anklicken.** Die Farbe der Blöcke wird dabei nicht ausgewertet. Blocknamen müssen nicht eingegeben werden.

Diese Variante umgeht die unzuverlässige Farberkennung der Miniaturübersicht. Sie prüft ausschließlich die von dir aufgenommenen Blockpunkte, nicht automatisch jeden Stadionblock. Ohne freien Platz wird zum nächsten Punkt gewechselt; nach einer Runde beginnt die Prüfung erneut. Pro Durchlauf wird höchstens ein Platz ausgewählt und dem Warenkorb hinzugefügt.

## Installieren / aktualisieren

1. Auf GitHub **Code → Download ZIP** wählen und entpacken.
2. Unter `chrome://extensions` bzw. `edge://extensions` Entwicklermodus aktivieren und den Ordner `extension` als entpackte Erweiterung laden.
3. Zum Aktualisieren den bisherigen Erweiterungsordner ersetzen, **Neu laden** anklicken und auch die Ticketseite neu laden. Angezeigte Version: **0.8.0**.
4. Die neue Version enthält zusätzlich die Chrome-Berechtigung `debugger` für die optionale Browser-Steuerung. Chrome kann deshalb eine erneute Berechtigungsbestätigung oder Aktivierung verlangen. Die Nutzung dieser Eingabeart ist standardmäßig ausgeschaltet. Chromium erlaubt die Debugger-Berechtigung nicht als nachträglich optionale Manifestberechtigung; sie muss bereits im Manifest stehen ([Chromium-Definition](https://github.com/chromium/chromium/blob/main/chrome/common/extensions/permissions/chrome_api_permissions.cc#L188)).

## Neuer Standard: Blockpunkte einmal aufnehmen

1. Ticketseite vollständig laden, bestehende Platzauswahl zurücksetzen und die Karte ganz herauszoomen.
2. Erweiterung öffnen. **Eingelernte Blockpunkte nacheinander prüfen** ist der Standardmodus.
3. **Großen Kartenbereich markieren** wählen und den großen Saalplan ohne Kopfzeile mit einem Rechteck umrahmen.
4. **Block, Platz und cart add automatisch anklicken** aktivieren, wenn der vollständige Ablauf gewünscht ist. Ohne Häkchen wird nur vorbereitet und geprüft.
5. **Ablauf starten**: Der Wächter zoomt genau zweimal hinein und sucht die Miniaturübersicht. Wird sie nicht automatisch erkannt, ihren Bereich auf Aufforderung markieren. Dabei wird nicht erneut gezoomt.
6. Beim ersten Durchlauf pausiert der Wächter für die Einrichtung. **Blockpunkte einmal aufnehmen** wählen und in der Miniaturübersicht nacheinander auf die Mittelpunkte der gewünschten Blöcke klicken. Die Nummern zeigen die spätere Prüfreihenfolge. Diese Lernklicks öffnen die Blöcke noch nicht. Mit **Enter** oder **Fertig** abschließen.
7. Der laufende Ablauf setzt danach automatisch fort: erster Blockpunkt → Sitzsuche → gegebenenfalls nächster Blockpunkt. Es gibt keine erneuten anfänglichen Zoomschritte.

Die Punkte werden lokal für die betreffende Shopadresse gespeichert. Bei gleichem Fenster und unverändertem Ausschnitt können sie bei späteren Starts wiederverwendet werden. Der Wächter vergleicht Fenstergröße und Miniaturrechteck mit der Kalibrierung. Passen sie nicht, werden die Punkte erneut angefordert. Die Form des Miniaturplans selbst wird dabei nicht semantisch überprüft: Bei veränderter Anordnung, anderem Inhalt oder verschobenen Blöcken müssen die Punkte neu aufgenommen werden.

**Wartezeit je Block** ist auf vier Sekunden eingestellt und lässt sich zwischen zwei und 15 Sekunden wählen. Eine kurze Zeit reagiert schneller, kann aber langsam geladene Plätze übersehen. Der Wächter bleibt im selben Durchlauf bei der Miniaturansicht und wechselt über die gespeicherten Punkte zwischen Blöcken. Die Miniaturübersicht muss währenddessen sichtbar und an derselben Stelle bleiben.

Nach einer bestätigten Blocköffnung wird nach freien farbigen runden Punkten gesucht. Ein bereits erfolgreich geöffneter Block kann in späteren Runden auch ohne erneute Bildänderung geprüft werden, damit später auftauchende Plätze erkannt werden. Hat hingegen kein Punkt jemals eine bestätigte Platzansicht geöffnet, wird nach der ersten Runde abgebrochen. Ohne bestätigten freien Sitz erfolgt kein Warenkorbklick.

Vor jedem neuen Start wieder zur ganz herausgezoomten Ausgangsansicht zurückkehren. Die Anwendung setzt weder den Ausgangszoom noch die Platzauswahl selbst zurück.

## Optionale echte Browser-Eingaben

Die bisherige Eingabeart sendet JavaScript-Mausereignisse. Manche Karten ignorieren diese. Die neue optionale Eingabeart verwendet Chrome DevTools Protocol über `chrome.debugger` und sendet Mausradbewegung, Mausbewegung, Drücken und Loslassen direkt an den aktiven Browsertab.

1. **Echte Browser-Eingaben verwenden (optional)** aktivieren.
2. **Browser-Steuerung verbinden** anklicken, **bevor** Kartenbereich und Blockpunkte eingerichtet werden. Chrome zeigt während der Verbindung eine Debugging-Leiste; dadurch kann sich die Größe des Seitenbereichs ändern.
3. Danach die normale Einrichtung und den Ablauf wie oben durchführen.

Die Verbindung bleibt beim Stoppen der Suche bestehen, damit die Debugging-Leiste die Kalibrierung nicht bei jedem Durchlauf verschiebt. **Stoppen/Escape** beendet jedoch die laufende Eingabesitzung und verhindert weitere Schritte. Schließen des Wächters oder Abschalten der Option trennt die Verbindung. Ein bereits ausgeführter Klick kann dadurch nicht rückgängig gemacht werden. Entwicklertools, andere Debugger oder Browserrichtlinien können die Verbindung verhindern; dann zeigt der Wächter einen Fehler und startet nicht.

Der Eingabekanal akzeptiert nur Mausradschritte und einfache Klicks für die zugehörige Sitzung im aktiven Tab. Eingaben nach Sitzungsende oder aus einem anderen Tab werden abgewiesen. Beim Verlassen der Seitenherkunft oder bei neuer Seitennavigation wird die Steuerung beendet. Es werden keine beliebigen DevTools-Kommandos aus der Webseite entgegengenommen.

**Prüfgrenze:** Die Befehlsfolge und der vollständige neue Ablauf wurden mit echten CDP-Eingaben an einer lokalen Testseite verifiziert, die untrusted JavaScript-Eingaben ablehnt. In diesem Test ersetzt eine Brücke die Chrome-API für Verbindung und Berechtigungen. Der vollständige Betrieb als geladene Debugger-Erweiterung ist in der Cloud durch eine Chromium-Administrationsrichtlinie gegen entpackte Erweiterungen blockiert und deshalb **nicht verifiziert**. Die optionale Eingabeart und ihr Verhalten im echten Shop bleiben entsprechend zu prüfen.

## Platzauswahl und cart add

Die Reihenfolge bleibt fest: **Block öffnen → Platz erkennen → Platz klicken → cart add suchen und klicken**. Die Miniaturübersicht wird bei der Sitzsuche maskiert. Eine Aufnahme muss eine veränderte große Kartenansicht nach dem Blockklick zeigen; eine Änderung allein in der Miniaturkarte reicht nicht. Bei einem bereits in diesem Durchlauf bestätigten Block darf die Sitzsuche auch im unveränderten geöffneten Block weiterlaufen.

Freie Punkte werden anhand von Farbe und annähernd runder Form erkannt und in zwei Aufnahmen bestätigt. Es gilt weiterhin die Annahme aus den bereitgestellten Bildern: farbiger Punkt = frei, grauer Punkt = nicht frei. Verwendet der Shop andere Farben/Status oder sind Punkte zu klein, muss die Platzerkennung angepasst werden.

Der Hinzufügen-Knopf darf am Anfang fehlen. Unterstützt werden **cart add**, übliche native und Framework-Tooltipattribute, zugeordnete Tooltiptexte, Beschriftungen wie „In den Warenkorb“ / „Add items“ und cart-plus-Symbolmerkmale. Nach acht Sekunden ohne eindeutige sichtbare aktive Schaltfläche bzw. bei mehreren passenden Zielen wird abgebrochen. Reine Warenkorb-Navigation und Checkout zählen nicht als Hinzufügen-Aktion.

Ein unbeschriftetes Hinzufügen-Symbol kann weiterhin über **cart-add-Symbol bei Bedarf einmal einlernen** aufgenommen werden. Der Lernklick betätigt es nicht. Gespeichert wird ein eindeutiger CSS-Selektor. Danach die manuelle Platzauswahl zurücksetzen und zur Ausgangsansicht zurückkehren. Ein gelernter Selektor hat Vorrang und kann über **Gelerntes Warenkorbziel löschen** entfernt werden.

## Bisheriger Modus und Diagnose

**Bisherige automatische Farberkennung** bleibt als Alternative verfügbar. Nur in diesem Modus werden farbige Blockmarkierungen aus der Miniaturübersicht automatisch ausgewertet. Er ist unabhängig von der Punktliste und hat weiterhin die dokumentierten Grenzen bei unbekannten SVG-/Canvas-Darstellungen und Farben.

Die aktuelle Übersicht kann ohne Zoom oder Auswahlklick mit **Aktuelle Übersicht prüfen · ohne Zoom/Klicks** geprüft werden. Ein grünes Zielzeichen zeigt den geplanten Klickpunkt; das Vorschaubild lässt sich über **Diagnosebild speichern** lokal als PNG herunterladen. Rote Rechtecke kennzeichnen ausdrücklich nicht verfügbare, aus der Bildsuche ausgeschlossene Bereiche.

## Grenzen und Bedienung

- Nur die aufgenommenen Blockpunkte werden geprüft. Preis, Kategorie, bevorzugte Reihe und zusammenhängende Plätze werden nicht ausgewertet.
- Zwei Mausradschritte bedeuten zwei Eingabeereignisse mit `deltaY=-100`; der tatsächliche Zoomfaktor hängt vom Shop ab. Die native und synthetische Eingabeart können unterschiedlich reagieren. Bei ausbleibender sichtbarer Kartenänderung wird vor der Auswahl gestoppt.
- Während des Ablaufs den sichtbaren Tab und die Browseransicht unverändert lassen. Escape, Stoppen, Tabwechsel, Scrollen der Seite oder Größenänderung stoppen weitere Aktionen. Die bestehenden Punkte müssen bei geändertem Layout neu kalibriert werden.
- Screenshots werden mindestens 550 ms auseinander aufgenommen, um das Chrome-Limit von zwei Aufnahmen pro Sekunde einzuhalten. Ein Umlauf dauert daher mindestens die Anzahl der Punkte mal Wartezeit zuzüglich Lade-/Verarbeitungszeit. Eine geringe Zahl gezielt ausgewählter Blockpunkte ist schneller.
- Navigation auf eine neue Seite, verschwindende Miniaturübersichten, eingebettete Frames und geschlossene Shadow DOMs können den Ablauf verhindern. Eine reine Bildänderung ist nur eine Plausibilitätsprüfung der Blocköffnung.
- Der echte Ticketshop ist weiterhin nicht verifiziert: Die Cloud-Netzwerkrichtlinie blockiert die Domain mit HTTP 403. Lokale Tests beweisen keine erfolgreiche Reservierung im echten Shop. Das tatsächliche Ergebnis prüfen.
- Es wird höchstens ein Platz pro Durchlauf ausgewählt. Checkout und Zahlung werden nicht automatisiert.

## Datenschutz

Die normalen Berechtigungen sind `activeTab`, `scripting` und `storage`. Gespeichert werden ausschließlich die ausdrücklich eingelernten relativen Blockpunkte samt Kalibriergeometrie sowie gegebenenfalls der Warenkorbselektor, nach Origin und Pfad der Shopadresse, ohne URL-Parameter. Keine Zugangsdaten erforderlich.

`debugger` ist die zusätzliche Berechtigung für die optionale direkte Browser-Eingabe und ermöglicht technisch weitreichenden Zugriff auf den verbundenen Tab. Der implementierte Kanal nutzt feste Input-Kommandos und bindet diese an den aktiven Tab und eine laufende Sitzung. Screenshots bleiben im Arbeitsspeicher. Nur über **Diagnosebild speichern** wird der Miniatur-Ausschnitt als lokale PNG-Datei gespeichert. Es werden keine Aufnahmen oder Kalibrierungen an einen Server übertragen.

## Entwicklung und Prüfstatus

Die Erweiterung benötigt keinen Build. Für Tests Node.js ab Version 20:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Die Browserprüfung verwendet `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Geprüft sind unter anderem:

- feste Punkte ohne Blockfarberkennung, Weitergehen vom leeren zum verfügbaren grauen Block, kontinuierliche Suche nach späteren Plätzen und Abbruch bei fehlgeschlagener Blocköffnung;
- genau zwei anfängliche Zoomschritte, Aufnahme ohne echten Blockklick und Speicherung/Wiederherstellung der Kalibrierung;
- bisherige SVG-/Canvas-Farberkennung, konkave Formen, moderne Farben, überlagerte Beschriftungen und präzise Ausschlüsse;
- dynamisches cart add, versteckte/deaktivierte/mehrdeutige Ziele, Abbruch zwischen den Schritten;
- native CDP-Ereignisse mit `isTrusted=true` im vollständigen neuen Ablauf, Abweisen beendeter Sitzungen/fremder Tabs sowie Trennen beim Schließen; die Chrome-API-Anbindung wird dafür ausdrücklich durch eine Testbrücke ersetzt.

`npm run test:native-extension` prüft die tatsächliche Chrome-Erweiterungsanbindung in einem isolierten Profil mit einer lokalen HTTP-Testseite. **Dieser optionale Test ist hier durch die Administrationsrichtlinie gegen das Laden entpackter Erweiterungen blockiert** und wird nicht als bestanden dargestellt. Der Test umgeht die Richtlinie nicht. Chrome-Test-Ladeschalter betreffen nur das temporäre Testprofil, nicht den normalen Erweiterungsbetrieb.

Für einen manuellen Test `python3 -m http.server 8080 --bind 127.0.0.1` starten und im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen.
