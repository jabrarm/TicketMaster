# TicketMaster · Verfügbarkeit und Warenkorb 1.4.7

Chrome-Erweiterung (ab Chrome 116) für den regulären Werder-Einzelkartenshop und den Werder-Hospitality-Shop: freie Sitze aus strukturierten Daten erkennen, Ticketanzahl und Kategoriepräferenzen einstellen und eine bestätigte Auswahl an den jeweils richtigen Warenkorb übergeben. Keine Farberkennung, Zoom-Kalibrierung oder eingelernten Klickpunkte.

## Installieren und starten

1. Das ZIP der aktuellen Version unter `dist/` herunterladen und entpacken.
2. Unter `chrome://extensions` Entwicklermodus aktivieren und **Entpackte Erweiterung laden** wählen. Den Ordner `extension` mit `manifest.json` auswählen. Bei einem Update **Neu laden** anklicken. Angezeigte Version: **1.4.7**. `storage` speichert Einstellungen und den laufenden Suchfortschritt.
3. Den gewünschten Saalplan im [regulären Einzelkartenshop](https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/674382) oder im [Hospitality-Shop](https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379) öffnen. Nach Installation oder Update die Ticketseite neu laden. Eine Warteschlange normal durchlaufen und Cookie-Dialoge selbst bedienen. Für eine andere Veranstaltung oder einen anderen Shop einen neuen Tab verwenden.
4. Auf der Eventseite bleiben. Der Monitor öffnet den Saalplan bei Bedarf über **Jetzt Plätze auswählen**.
5. Auf das Erweiterungssymbol klicken. Für die reine Anzeige **Überwachung starten** wählen.
6. **Aktualisierung alle (Sekunden)** einstellen: 0,5–120 Sekunden in Halbschritten, Standard 20. Für die Automatik **Anzahl Tickets** von 1 bis 6 einstellen. Kategorien über die Gruppen-Häkchen komplett auswählen, Unterkategorien bei Bedarf abwählen und Gruppen sowie Unterkategorien mit **↑ / ↓** sortieren. Oben steht die höchste Präferenz. Über das Dreieck lassen sich Unterkategorien ein- und ausklappen.
7. **Nebeneinander bevorzugen; sonst nach Kategoriepräferenz** aktiviert lassen, wenn zuerst eine zusammenhängende Gruppe bevorzugt werden soll. Danach **Automatisch in den Warenkorb** anklicken. Die Automatik prüft passende Angebote aus kürzlich empfangenen Shopantworten durch die normale Platzwahl.

**Neu in 1.4.7:** Nach einer bestätigten automatischen Übergabe stehen unter dem Ticketfortschritt drei lokale Messwerte in Millisekunden. Die erste Zeit reicht vom ersten Auswahlaufruf bis zur letzten bestätigten Sitzkarte. Die zweite reicht von dort bis zum Klick auf den Shop-Button. Die dritte umfasst Navigation, Laden und Erkennen der neuen Ticketkarten im Warenkorb. Die Messung löst keine zusätzliche Shop-Anfrage aus.

**Neu in 1.4.6:** Verschwindet ein Angebot noch vor der Platzwahl oder lädt der Saalplan noch, wartet die Automatik auf weitere Shopantworten. Nach einer begonnenen Platzwahl mit unklarem Ergebnis pausiert sie zur Prüfung des Warenkorbs.

**Neu in 1.4.5:** Beim Start auf der Eventseite öffnet der Monitor den Saalplan über den normalen Shop-Button. Für eine laufende automatische Suche funktioniert das auch nach einem manuellen Seitenreload im selben Tab. Die Erweiterung markiert Antworten mit unverändertem Zeitstempel und Sitzbestand entsprechend. Treffen die drei Saalplan-Datensätze in anderer Reihenfolge ein, verarbeitet sie einen vollständigen passenden Stand sofort. Bereits dekodierte Kartengeometrie und Preiszuordnungen kann sie bei reinen Verfügbarkeitsupdates wiederverwenden.

**Neu in 1.4.4:** Unter **Platzwahl** stehen **Nach meinen Präferenzen** und **Ohne Präferenzen – erste freie Plätze** zur Auswahl. Ohne Präferenzen nimmt die Automatik die ersten freien Sitzangebote in der Reihenfolge der Shopdaten, bis zur eingestellten Restmenge. Alle gemeldeten Preiskategorien kommen infrage, und mehrere Plätze können getrennt liegen. Jeder Platz wird weiterhin durch den Shop bestätigt. Beim Zurückwechseln stehen die gespeicherten Präferenzen wieder zur Verfügung.

**Neu in 1.4.3:** Das Abfrageintervall lässt sich auf 0,5 Sekunden einstellen. Laufende Shop-Anfragen, Platzauswahl und Serverpausen haben weiterhin Vorrang. Die Übergabe startet nach bestätigter Sitzkarte und aktiver Schaltfläche, sobald der ausstehende Warenkorbschritt gespeichert ist. Der Bestätigungston nutzt eine lokale Audiodatei. Der Monitor bietet **Warenkorbton testen**, und das Erweiterungssymbol signalisiert einen Wiedergabefehler, wenn Chrome nach einer bestätigten Warenkorbübergabe keinen Ton starten kann. Ein verspätet geladenes Präferenzmodul wird beim Öffnen des Monitors nachgeladen. Wenn Module fehlen, erscheint ein Hinweis zum Neuladen der Ticketseite.

**Neu in 1.4.2:** Der Monitor prüft die Anmeldung beim Start, während der Überwachung ungefähr einmal pro Minute und beim Zurückwechseln zum Tab, wenn die letzte Prüfung mindestens 20 Sekunden zurückliegt. **Anmeldung prüfen** löst eine manuelle Kontrolle aus. Die Prüfung nutzt einen regulären Warenkorbabruf. Einen gleichzeitig laufenden Abruf teilt sie mit der Warenkorbvorprüfung. Bei erkannter Abmeldung oder Warteschlange hält der Monitor an. Nach der Anmeldung bzw. der Warteschlange erneut prüfen und die Suche selbst starten. Ein unbekannter Status wird angezeigt und führt allein zu keinem Stopp. Direkt vor dem Warenkorbklick prüft die Erweiterung den zuletzt bekannten Status lokal.

**Neu in 1.4.1:** Sitzkarten werden unmittelbar nach Änderungen im Formular geprüft. Ein kurzer Ping meldet neu freie Sitze aus einer gültigen Shop-Liste. Nach einer bestätigten Warenkorbzugabe ertönt ein Nebelhorn. Standardmäßig wird der Hornklang synthetisch erzeugt. Unter **Erweiterungsoptionen → Warenkorbton** lässt sich eine eigene Weserstadion-Aufnahme auswählen. Die Datei bleibt lokal im Browser.

**Neu in 1.2.0:** Ist beispielsweise das Ziel **2 Tickets**, aber nur **1 passender Platz** verfügbar, wird dieser sofort einzeln ausgewählt und an den Warenkorb übergeben. Erst die Warenkorbseite bestätigt den Fortschritt **1/2**. Danach kehrt die Erweiterung automatisch zu derselben Ticketseite zurück, öffnet den Saalplan und sucht nur das noch fehlende Ticket. Bei **2/2** bleibt sie im Warenkorb. Checkout und Zahlung erfolgen manuell. Die Reservierungsfrist des Shops läuft während der weiteren Suche weiter.

**Neu in 1.3.0:** Der reguläre Shop-Pfad `/ols/werderbremen/de/einzelkarten/channel/shop/` ist zusätzlich freigeschaltet. Saalplan, Formularziel, Warenkorb-Bestätigung und Rückkehradresse werden aus demselben Shop-Kontext abgeleitet. Eine Bestätigung aus dem jeweils anderen Shop wird nicht auf ein laufendes Suchziel angerechnet.

**Neu in 1.4.0:** Das Aktualisierungsintervall lässt sich bis auf zwei Sekunden verkürzen und wird gespeichert. Es gilt während einer ausdrücklich gestarteten Überwachung oder Automatik. Ohne gestartete Überwachung bleibt der normale Shop-Takt unverändert. Im reinen Überwachungsmodus kann das Intervall direkt geändert werden. Während eines automatischen Suchziels sind die Einstellungen gesperrt; zum Ändern zuerst stoppen und anschließend fortsetzen.

Die Erweiterung ruft die normale Shop-Funktion `sms.refreshAvailability()` auf und verändert keine signierten URLs oder Cache-Schlüssel. Laufende API-Anfragen und Platzauswahlen verhindern einen weiteren Aktualisierungsaufruf. Die nativen Shop-Timer laufen weiterhin, ihre Aktualisierungsaufrufe werden während der aktiven Überwachung mit dem eingestellten Takt zusammengeführt. Nach **Stoppen** endet der zusätzliche Timer, und die originale Shop-Funktion wird wiederhergestellt. Ein bereits laufender Request wird nicht abgebrochen.

Das eingestellte Intervall ist der frühestmögliche Abstand zwischen zusätzlichen Aktualisierungen. Der Shop kann unveränderte Daten liefern. Langsame Antworten, Browser-Drosselung und der Shop-Cache können Aktualisierungen verzögern. Lesbare `Retry-After`-Header werden berücksichtigt; bei HTTP 429 wird mindestens 30 Sekunden pausiert. Andere Netzwerk-/Serverfehler führen zu wachsenden Wartezeiten, bis maximal 60 Sekunden ohne längere Servervorgabe. Die Oberfläche zeigt entsprechende Wartegründe. Chrome kann die Timer von Hintergrund-Tabs drosseln.

Fehlende Seitenskripte werden beim Klick auf das Erweiterungssymbol nachgeladen, damit sich das Fenster auch in bereits geöffneten Tabs öffnet. Zum Erfassen aller Saalplan-Daten die Ticketseite dennoch nach Installation oder Update neu laden. Nicht unterstützte Seiten erhalten einen Hinweis. Verweigert Chrome die Skriptausführung, erscheint am Erweiterungssymbol ein rotes `!`; der Hinweis beim Darüberfahren nennt den Fehler.

**Wichtig bei Updates:** Chrome kann den alten Code in einem bereits geöffneten Ticket-Tab erhalten. Ein Erweiterungs-Neuladen allein ersetzt diesen Code nicht. Die Modulversionen werden deshalb geprüft; bei gemischten Versionen erscheint **Update erkannt – Ticketseite neu laden**. Vor einem Erweiterungsupdate eine laufende Suche stoppen, danach die Ticketseite neu laden. Gespeicherte Präferenzen bleiben erhalten.

## Kategorien und Präferenzen

Die Kategorien aus der bereitgestellten Grafik sind hinterlegt: Platzkategorie 1 mit vier Unterkategorien, Platzkategorie 2 mit sechs, Platzkategorie 3 mit fünf, Platzkategorie 4 mit einer und Platzkategorie 5 mit den beiden Ost-Steh-Varianten. Die Reihenbereiche der Grafik werden bei einer eindeutigen Zuordnung berücksichtigt.

Die VIP-Gruppe enthält fünf separat auswählbare Unterkategorien:

- VIP-Rang Platin
- Partner des Fußballs.-Lounge
- VIP-Club Ost
- VIP-Club Ost.
- VIP-Rang Gold

Die beiden Ost-Bezeichnungen sind verschiedene Shopkategorien; der abschließende Punkt wird beim Zuordnen nicht entfernt. Andere VIP-Angebote wie „Gold Select“ werden nicht stillschweigend „Gold“ zugeordnet.

Auf der **Hospitality-Adresse werden VIP-Angebote geliefert**; auf der regulären Einzelkarten-Adresse werden die dort gelieferten Platzkategorien ausgewertet. Eine Unterkategorie wird nur bei passenden Preis-, Regions- und gegebenenfalls Reihendaten zugeordnet. Aus einer Blocknummer oder Farbe wird keine Region geraten.

Ist nur die Oberkategorie, etwa `PK1`, aus den Shopdaten erkennbar, darf ein solches Angebot ausschließlich bei vollständig angehakter Oberkategorie ausgewählt werden. Bereits eine abgewählte Unterkategorie sperrt diese nicht genauer zuordenbaren Angebote. Genau zugeordnete Unterkategorien haben innerhalb ihrer Gruppe Vorrang vor Angeboten, deren Unterkategorie unbekannt ist. Die Oberfläche weist auf diese eingeschränkte Zuordnung hin. Eindeutig widersprüchliche Regionen-/Reihendaten führen nicht zu einem pauschalen Kategorie-Fallback. Allgemeine Einlass-/Stehplatzkontingente und Ermäßigungsvarianten sind weiterhin nicht automatisiert. Sonstige nicht zuordenbare Angebote bleiben sichtbar und kommen im Modus **Ohne Präferenzen** für die automatische Platzwahl infrage.

Platzwahlmodus, Ticketanzahl, Aktualisierungsintervall, Reihenfolge, Häkchen und Nebeneinander-Präferenz werden lokal gespeichert. Eine neue Suche startet nur durch **Automatisch in den Warenkorb**. Ein ausdrücklich gestartetes, noch nicht abgeschlossenes Suchziel wird im selben Tab nach den notwendigen Shop-/Warenkorb-Seitenwechseln mit seinem gespeicherten Intervall fortgesetzt. Ein neuer Tab erhält keine laufende Suche eines anderen Tabs. Der Blockfilter der Übersicht verändert nur die Anzeige, nicht die Kategoriepräferenzen der Automatik.

Für die Nebeneinander-Präferenz werden dieselbe Saalplan-Reihengruppe, aufeinanderfolgende Sitzpositionen und IDs sowie der geometrische Abstand geprüft. Dies ist eine konservative Ableitung aus dem Saalplan, keine unabhängig bestätigte Sitznummern-Garantie. Existiert unter den gewählten Optionen eine passende Gruppe, wird sie bevorzugt, auch gegenüber einzelnen Sitzen einer höher sortierten Kategorie. Unter passenden Gruppen entscheidet die Kategoriepräferenz. Ohne passende Gruppe werden die bestplatzierten Einzelsitze gewählt; diese können aus unterschiedlichen erlaubten Unterkategorien stammen.

Es wird nicht auf die gesamte Zielanzahl gewartet, wenn schon ein Teil verfügbar ist. Nach einem übernommenen Einzelticket wird ein später angebotener Nachbarsitz bevorzugt, sofern die Geometrie und Saalplan-Version das eindeutig erlauben. Andernfalls gilt deine Kategoriepräferenz. Bei getrennten Übernahmen ist Nebeneinandersitzen nicht garantiert.

## Automatischer Ablauf und Stoppen

Die Automatik wählt die aktuell verfügbare Teilmenge, maximal die noch fehlende Anzahl, anhand der Sitz-IDs aus. Jeder Sitz dieser Teilauswahl muss im Shop und als gerenderte Sitzkarte bestätigt sein. Vor der Übergabe liest sie den bestehenden Warenkorb per normalem GET. Der Hintergrundprozess speichert die ausstehende Übergabe vor dem einmaligen Klick auf **In den Warenkorb**, damit der anschließende Seitenwechsel keinen Fortschritt verliert.

Auf der Warenkorbseite wird geprüft, welche Ticket-Einträge gegenüber dem vorherigen Stand hinzugekommen sind. Nur bei einer eindeutigen Bestätigung wird die Teilmenge auf das Suchziel angerechnet. Vorhandene Warenkorbtickets werden nicht als neue Tickets gezählt. Bereits übernommene Sitz-IDs werden bei späteren Angeboten ausgeschlossen. Nach Bestätigung wird nur die Restmenge gesucht. Doppelte Bestätigungen oder ein Neustart des Hintergrundprozesses erhöhen den Zähler nicht erneut.

Bereits vor dem Start im Saalplan ausgewählte Plätze verhindern den automatischen Lauf; sie werden nicht eigenständig entfernt. Die Anzahl bezeichnet die während dieses Suchziels neu hinzuzufügenden Tickets. Ein vorhandener Warenkorb wird nicht geleert. Eine unbestätigte Übergabe wird niemals automatisch wiederholt. Bei unbekanntem Warenkorbformat, unerwarteter Anzahl neuer Einträge oder fehlenden zuvor bestätigten Tickets hält die Suche an. Scheitert bereits die Platzwahl vor der Übergabe, kann die Suche nach Prüfung der Shop-Auswahl manuell neu gestartet werden. Bitte dann den Warenkorb und die Reservierungsfrist prüfen.

**Stoppen** beendet Überwachung und Automatik. Nach Verarbeitung des Stopps werden keine weiteren Sitze ausgewählt und keine Warenkorbübergabe ausgelöst. Bereits ausgeführte Auswahlschritte bleiben im Shop sichtbar und müssen dort bei Bedarf geprüft oder zurückgesetzt werden. Schließen stoppt ebenfalls den Ablauf.

Bereits in den Warenkorb übernommene Tickets bleiben dort. Beim ausdrücklichen Fortsetzen einer gestoppten, eindeutig bestätigten Suche im selben Tab bleibt dieser Fortschritt erhalten. Nach 30 Minuten wird eine laufende Suche angehalten. Ein abgelaufenes oder zwischenzeitlich entferntes, zuvor bestätigtes Ticket wird nicht stillschweigend ersetzt.

Während der gestarteten Überwachung wird der normale Aktualisierungsweg des Shops im gewählten Takt angestoßen. Die Automatik liest zusätzlich den Warenkorb und erzeugt die normalen Auswahl- und Warenkorbanfragen des Shops. Für die Restmenge wechselt sie zurück zur ursprünglichen Ticketseite und öffnet den Saalplan. Sitzdaten und Änderungsprotokoll bleiben im Tab; Suchziel, bestätigte Warenkorbschlüssel, übernommene Sitzdaten und ausstehende Übergaben liegen zusätzlich in `chrome.storage.session`. Sie überleben Seitenwechsel und einen Neustart des Hintergrundprozesses, nicht einen Browserneustart.

## Aktualität und Grenzen

- Der erste gültige Datenstand ist für die Änderungsanzeige der Ausgangsbestand und erzeugt keine Neu-verfügbar-Meldung. Ein ausdrücklich gestarteter Warenkorblauf darf auch bereits im Ausgangsbestand freie Sitze wählen.
- Der untersuchte Shop-Adapter ruft normalerweise alle 20 Sekunden die Aktualisierungsfunktion des Saalplan-Clients auf. Version 1.4.0 ergänzt den konfigurierbaren Takt ab zwei Sekunden bei aktiver Überwachung. Neue Netzwerkdaten hängen zusätzlich vom Client und den API-Antworten ab. Ein WebSocket-Livestream wurde nicht bestätigt.
- Version 1.1.1 behebt das endlose Warten trotz angezeigter Angebote: Eine innerhalb der letzten zwei Minuten empfangene Antwort darf auch bei `expired: true` unverbindliche Kandidaten für die Platzwahl liefern. Jeder Sitz muss danach vom normalen Auswahlablauf des Shops mit einer Sitzkarte bestätigt werden. Ohne die vollständige Bestätigung erfolgt kein Warenkorbklick. Für Neu-verfügbar-Meldungen bleibt die Cache-Ablaufprüfung unverändert streng.
- Liegt der letzte bestätigte Empfang mehr als zwei Minuten zurück oder enthält die Antwort Fehler bzw. unbekannte Daten, startet keine Auswahl. Die Automatik nennt den Wartegrund. Fehler werden nicht als ausverkaufter Bestand behandelt.
- Der Shop hat bei der Untersuchung mehrfach selbst als `expired: true` markierte Antworten geliefert. Ein geladener Saalplan allein beweist keinen aktuellen Datenstand.
- Verfügbarkeit, Mapping-Sperrstatus und Preiskategorie werden geprüft. Buchungsregeln, persönliche Shopfilter und Nutzerberechtigungen können eine Auswahl dennoch verhindern. Zwischen Anzeige und Auswahl kann ein Sitz anderweitig vergeben werden.
- Der Monitor zeigt Block, Reihe, technische Sitz-ID und Kategorie. Die Sitz-ID ist keine Sitznummer.
- Unterstützt werden `/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/<ID>` sowie `/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/<ID>` und deren jeweilige `/shoppingcart`-Seiten auf `www.ticket-onlineshop.com`. Die Prüfung des Warenkorbs nutzt bekannte Ticketkarten und Warenkorbmarkierungen; unbekannte Varianten halten die Suche an. Andere Shop-, Saison- oder Sprachpfade sind nicht pauschal freigegeben.

## Technik und Datenschutz

`availability-core.js` verbindet drei vom Shop geladene JSON-Antworten unter `https://public-api.eventim.com/seatmap/api/public/`:

| Antwort | Verwendung |
| --- | --- |
| `seatmap/tixx-1001-<Event-ID>` | Block, Reihe, Geometrie und delta-kodierte Sitz-IDs |
| `mapping/tixx-1001-<Event-ID>` | Sitz-Sperrstatus und delta-kodierte Preiskategorien |
| `availability/tixx-1001-<Event-ID>` | Verfügbarkeit, Datenzeit und Ablaufstatus |

Die Dekodierung folgt dem untersuchten Eventim-Saalplan-Client 6.20.0. Ein Sitz gilt als verfügbar, wenn seine API-Verfügbarkeit `1`, sein Mapping-Status `0` und eine Preiskategorie vorhanden sind. Nicht zusammenpassende Saalplan-Versionen werden nicht gemeinsam ausgewertet. Unbekannte Formate erzeugen einen Fehler.

`TicketAvailability.shop()` ist die gemeinsame Pfadprüfung für beide explizit unterstützten Shop-Basen. Hintergrundprozess, Formularprüfung, Warenkorb-Leser und Rückkehrskript nutzen diesen Kontext. Ereignis-ID und Shop-Basis müssen zum laufenden Suchziel passen.

`page-observer.js` beobachtet ab Dokumentstart `fetch` und `XMLHttpRequest` in der Seitenwelt. Originale Requests und Antworten werden an die Seite weitergereicht. Nur passende Antworten für das aktuelle Event werden zusätzlich gelesen. Die Erweiterung wiederholt keine signierten Requests. Antwortreihenfolge und Datenzeitstempel verhindern, dass verspätete Antworten neuere Daten überschreiben.

`refresh.js` verwaltet den konfigurierbaren Timer und die kurzzeitig eingesetzte Hülle um die normale Shop-Aktualisierung. Der Observer zählt tatsächlich laufende API-Requests, weil die öffentliche SDK-Funktion bereits vor Abschluss des Requests ohne Promise zurückkehren kann. Deshalb wird auch bei langsamen Antworten keine parallele Aktualisierung gestartet. Befehle sind an die jeweilige Dokumentnavigation und eine Reihenfolge gebunden; ein verspäteter Startbefehl kann einen neueren Stopp nicht rückgängig machen.

`preferences.js` plant eine passende Teilmenge bis zur Restmenge und berücksichtigt bereits gesicherte Sitze. `preferences-ui.js` stellt Gruppen, Unterkategorien, Sortierpfeile und Ticketanzahl bereit. `cart-flow.js` verwendet `sms.selectById()` und `seatSelection.getSelectedSeats()`. Auswahlvorbereitung und Formularübergabe sind getrennt, damit der Hintergrundprozess den ausstehenden Schritt vorher speichern kann. Jede Sitzkarte, der Formularpfad und `#add-to-cart` werden geprüft. Laufkennungen verhindern Wiederholungen; ein bereits empfangener Stopp verhindert auch einen verspäteten Start.

`cart-session.js` verwaltet das Suchziel pro Tab mit serialisierten Zustandsänderungen. `cart-receipt.js` liest Warenkorbkarten; `cart-return.js` meldet den bestätigten Warenkorbstand aus dem isolierten Kontext. Nur eine bestätigte Teilübergabe erlaubt die nächste. Bei unbekanntem Ausgang bleibt die Suche angehalten. Der Hintergrundprozess bestimmt Ziel, Restmenge und Rückkehradresse aus der gespeicherten Sitzung, nicht aus frei übergebenen URLs der Seite.

`monitor.js` läuft als isoliertes Content-Script. Über die Seitenbrücke werden normalisierte Sitzdaten und Statusmeldungen übergeben, keine Cookies, Request-Header, Signaturen oder API-Schlüssel. Warenkorbbefehle gehen über den Service-Worker, der Extension-Absender, Tab, Event-Adresse und Modulversionen prüft. Der MAIN-Controller liest den Datenstand direkt vom Beobachter über `TicketDataObserver.getSnapshot()`; er ist nicht mehr auf eine separat initialisierte Kopie angewiesen. Auch ein erst nach den Netzwerkantworten erzeugter Controller erhält den vollständigen Stand. Vor jedem Auswahlschritt wird er erneut gelesen. Fehlende Daten, zu alte Daten und zu wenige passende Angebote werden mit unterschiedlichen Meldungen erklärt. Seitennachrichten können keine beliebigen IDs oder Browserbefehle einschleusen. Shoptexte werden als Text gerendert.

Die Berechtigungen sind `activeTab`, `scripting`, `storage` und `offscreen` für die Tonausgabe über Seitenwechsel hinweg sowie die beschränkte Content-Script-Zuordnung zu Saalplan und Warenkorb der beiden Werder-Shops. `storage.local` speichert Einstellungen und `storage.session` den laufenden Suchfortschritt, keine Cookies, Zugangsdaten oder Signaturen. `debugger` und Screenshots werden nicht verwendet.

## Entwicklung und Prüfstatus

Node.js ab Version 20 und Chromium werden benötigt. Kein Build und kein Backend erforderlich.

```sh
cd /workspace/TicketMaster
npm ci
npm test
npm run test:browser
```

Die Browserprüfung nutzt `CHROMIUM_PATH`, `/usr/bin/chromium` oder einen installierten Playwright-Browser. Die Tests prüfen Dekodierung, Baseline, Versionswechsel, abgelaufene Daten, Fetch/XHR, Kategoriezuordnung, Sortierung, Nebeneinander-Präferenz, exakte Ticketanzahl, einzelne Shop-Bestätigungen, einmaligen Warenkorbklick und Stoppen mit kontrollierten Shopantworten. Der automatisierte Gesamttest ersetzt die Shopfunktionen und die Extension-Nachrichtenbrücke durch kontrollierte Testgegenstücke.

`tests/worlds.browser.cjs` ergänzt eine Prüfung mit tatsächlich getrennten Chrome-MAIN- und ISOLATED-Ausführungskontexten. Sie verwendet den tatsächlichen Hintergrund-Handler mit einem kontrollierten Chrome-API-Adapter. Getestet werden ein nach dem Erweiterungsupdate stehengebliebener alter Controller, der ausdrücklich ausgelöste Seitenreload und ein neuer Controller, dessen Beobachter die Netzwerkdaten schon vor seiner Erzeugung empfangen hat. Auch der vollständige Nachrichtenweg von der isolierten Oberfläche über den Hintergrund-Handler zur Platzwahl wird damit geprüft. Die Shop-Seitenauswahl selbst bleibt in diesem Test simuliert.

`tests/goal.browser.cjs` prüft den vollständigen Ablauf über tatsächliche Formular-POSTs und Browser-Seitenwechsel gegen kontrollierte Shopseiten: nur ein verfügbares Ticket bei Ziel zwei, Warenkorbbestätigung, automatische Rückkehr, späteres zweites Ticket, Ausschluss des erneut angebotenen ersten Sitzes, Abschluss bei 2/2 sowie Stoppen nach dem ersten Ticket. Die Shop-Buchung selbst wird dabei simuliert.

Der Test wird auch für den regulären Pfad mit Event `674382` und `PK1`-Angeboten ausgeführt. Er prüft ausdrücklich, dass Formular-POST, Warenkorbseite und Rückkehr im regulären Shop bleiben. Ein separater Test stellt sicher, dass ein nur als `PK1` zugeordnetes Angebot nach einer Unterkategorie-Abwahl nicht mehr automatisch gewählt wird.

`tests/refresh.test.cjs` prüft Zeitabstände, langsame Requests trotz Void-Rückgabe, Zusammenführen nativer Timer, Wiederherstellung beim Stoppen, verspätete Befehle und Server-Wartefristen. `tests/refresh.browser.cjs` prüft den Zwei-Sekunden-Start mit echten Browserrequests gegen kontrollierte Antworten, fehlende Überlappung bei langsamer Antwort und einen CORS-lesbaren `Retry-After`-Header. Einstellungen und ihre Übernahme nach Warenkorb-Seitenwechseln sind ebenfalls abgedeckt. Die Tests erzeugen keine Zwei-Sekunden-Abfragen gegen den echten Ticketserver.

Am 6. November 2026 stimmten am echten Hospitality-Event `674379` alle 17 dekodierten Sitz-IDs mit den vom Shop-Client als verfügbar erkannten Sitz-IDs überein. Das ist eine Momentaufnahme und keine Reservierungsbestätigung. Shopfunktionen, Warenkorb-Formularpfad und leerer Warenkorb wurden lesend untersucht. Es wurden keine echten Plätze ausgewählt oder reserviert; ein echter Mehrschritt-Warenkorbabschluss mit Version 1.4.0 ist daher noch nicht verifiziert.

Die reguläre Event-Adresse `674382` wurde im Cloud-Browser zur Veranstaltungsübersicht weitergeleitet. Dort konnten deshalb keine Live-Sitzdaten oder Zugangsbedingungen verifiziert werden. Der leere reguläre Warenkorb wurde lesend geöffnet und vom Warenkorb-Leser als gültig erkannt. Der Auswahl- und Rückkehrablauf ist mit kontrollierten Daten geprüft; Anmeldung, Verkaufsfreigabe und tatsächliche Buchbarkeit bestimmt weiterhin der Shop.

Beim lesenden Abgleich am 8. November 2026 wurden alle neun gelieferten Sitzangebote den vorgesehenen VIP-Unterkategorien zugeordnet. Shop-Schnittstelle und Ticketlimit von sechs waren vorhanden. Die API-Antwort war als abgelaufen markiert; Version 1.1.0 lieferte deshalb keine Auswahl. Version 1.1.1 verwendet solche kürzlich empfangenen Listen als Kandidaten und verlangt danach die Shop-Bestätigung. Der entsprechende Fehlerfall ist mit kontrollierten Shopantworten im Browser abgedeckt.

Das tatsächliche Laden einer entpackten Erweiterung ist in der Cloud durch eine Chromium-Administrationsrichtlinie blockiert. Die lokalen Browserprüfungen injizieren die Skripte deshalb zur Laufzeit. Installation und Betrieb in normalem Chrome bleiben Teil des manuellen Tests.
