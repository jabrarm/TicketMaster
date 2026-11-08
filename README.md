# TicketMaster · Verfügbarkeit und Warenkorb 1.3.0

Chrome-Erweiterung für den regulären Werder-Einzelkartenshop und den Werder-Hospitality-Shop: freie Sitze aus strukturierten Daten erkennen, Ticketanzahl und Kategoriepräferenzen einstellen und eine bestätigte Auswahl an den jeweils richtigen Warenkorb übergeben. Keine Farberkennung, Zoom-Kalibrierung oder eingelernten Klickpunkte.

## Installieren und starten

1. Den Branch `availability-monitor-v1` bzw. das ZIP der aktuellen Version herunterladen und entpacken.
2. Unter `chrome://extensions` Entwicklermodus aktivieren und **Entpackte Erweiterung laden** wählen. Den Ordner `extension` mit `manifest.json` auswählen. Bei einem Update **Neu laden** anklicken. Angezeigte Version: **1.3.0**. `storage` speichert Einstellungen und den laufenden Suchfortschritt.
3. Den gewünschten Saalplan im [regulären Einzelkartenshop](https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/674382) oder im [Hospitality-Shop](https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379) öffnen. Nach Installation oder Update die Ticketseite neu laden. Eine Warteschlange normal durchlaufen und Cookie-Dialoge selbst bedienen. Für eine andere Veranstaltung oder einen anderen Shop einen neuen Tab verwenden.
4. Im Shop **Jetzt Plätze auswählen** öffnen und den Saalplan laden lassen.
5. Auf das Erweiterungssymbol klicken. Für die reine Anzeige **Überwachung starten** wählen.
6. Für die Automatik **Anzahl Tickets** von 1 bis 6 einstellen. Kategorien über die Gruppen-Häkchen komplett auswählen, Unterkategorien bei Bedarf abwählen und Gruppen sowie Unterkategorien mit **↑ / ↓** sortieren. Oben steht die höchste Präferenz. Über das Dreieck lassen sich Unterkategorien ein- und ausklappen.
7. **Nebeneinander bevorzugen; sonst nach Kategoriepräferenz** aktiviert lassen, wenn zuerst eine zusammenhängende Gruppe bevorzugt werden soll. Danach **Automatisch in den Warenkorb** anklicken. Die Automatik prüft passende Angebote aus kürzlich empfangenen Shopantworten durch die normale Platzwahl.

**Neu in 1.2.0:** Ist beispielsweise das Ziel **2 Tickets**, aber nur **1 passender Platz** verfügbar, wird dieser sofort einzeln ausgewählt und an den Warenkorb übergeben. Erst die Warenkorbseite bestätigt den Fortschritt **1/2**. Danach kehrt die Erweiterung automatisch zu derselben Ticketseite zurück, öffnet den Saalplan und sucht nur das noch fehlende Ticket. Bei **2/2** bleibt sie im Warenkorb. Checkout und Zahlung erfolgen manuell. Die Reservierungsfrist des Shops läuft während der weiteren Suche weiter.

**Neu in 1.3.0:** Der reguläre Shop-Pfad `/ols/werderbremen/de/einzelkarten/channel/shop/` ist zusätzlich freigeschaltet. Saalplan, Formularziel, Warenkorb-Bestätigung und Rückkehradresse werden aus demselben Shop-Kontext abgeleitet. Eine Bestätigung aus dem jeweils anderen Shop wird nicht auf ein laufendes Suchziel angerechnet.

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

Ist nur die Oberkategorie, etwa `PK1`, aus den Shopdaten erkennbar, darf ein solches Angebot ausschließlich bei vollständig angehakter Oberkategorie ausgewählt werden. Bereits eine abgewählte Unterkategorie sperrt diese nicht genauer zuordenbaren Angebote. Genau zugeordnete Unterkategorien haben innerhalb ihrer Gruppe Vorrang vor Angeboten, deren Unterkategorie unbekannt ist. Die Oberfläche weist auf diese eingeschränkte Zuordnung hin. Eindeutig widersprüchliche Regionen-/Reihendaten führen nicht zu einem pauschalen Kategorie-Fallback. Allgemeine Einlass-/Stehplatzkontingente und Ermäßigungsvarianten sind weiterhin nicht automatisiert. Sonstige nicht zuordenbare Angebote bleiben sichtbar, werden aber nicht automatisch gewählt.

Ticketanzahl, Reihenfolge, Häkchen und Nebeneinander-Präferenz werden lokal gespeichert. Eine neue Suche startet nur durch **Automatisch in den Warenkorb**. Ein ausdrücklich gestartetes, noch nicht abgeschlossenes Suchziel wird im selben Tab nach den notwendigen Shop-/Warenkorb-Seitenwechseln fortgesetzt. Ein neuer Tab erhält keine laufende Suche eines anderen Tabs. Der Blockfilter der Übersicht verändert nur die Anzeige, nicht die Kategoriepräferenzen der Automatik.

Für die Nebeneinander-Präferenz werden dieselbe Saalplan-Reihengruppe, aufeinanderfolgende Sitzpositionen und IDs sowie der geometrische Abstand geprüft. Dies ist eine konservative Ableitung aus dem Saalplan, keine unabhängig bestätigte Sitznummern-Garantie. Existiert unter den gewählten Optionen eine passende Gruppe, wird sie bevorzugt, auch gegenüber einzelnen Sitzen einer höher sortierten Kategorie. Unter passenden Gruppen entscheidet die Kategoriepräferenz. Ohne passende Gruppe werden die bestplatzierten Einzelsitze gewählt; diese können aus unterschiedlichen erlaubten Unterkategorien stammen.

Es wird nicht auf die gesamte Zielanzahl gewartet, wenn schon ein Teil verfügbar ist. Nach einem übernommenen Einzelticket wird ein später angebotener Nachbarsitz bevorzugt, sofern die Geometrie und Saalplan-Version das eindeutig erlauben. Andernfalls gilt deine Kategoriepräferenz. Bei getrennten Übernahmen ist Nebeneinandersitzen nicht garantiert.

## Automatischer Ablauf und Stoppen

Die Automatik wählt die aktuell verfügbare Teilmenge, maximal die noch fehlende Anzahl, anhand der Sitz-IDs aus. Jeder Sitz dieser Teilauswahl muss im Shop und als gerenderte Sitzkarte bestätigt sein. Vor der Übergabe liest sie den bestehenden Warenkorb per normalem GET. Der Hintergrundprozess speichert die ausstehende Übergabe vor dem einmaligen Klick auf **In den Warenkorb**, damit der anschließende Seitenwechsel keinen Fortschritt verliert.

Auf der Warenkorbseite wird geprüft, welche Ticket-Einträge gegenüber dem vorherigen Stand hinzugekommen sind. Nur bei einer eindeutigen Bestätigung wird die Teilmenge auf das Suchziel angerechnet. Vorhandene Warenkorbtickets werden nicht als neue Tickets gezählt. Bereits übernommene Sitz-IDs werden bei späteren Angeboten ausgeschlossen. Nach Bestätigung wird nur die Restmenge gesucht. Doppelte Bestätigungen oder ein Neustart des Hintergrundprozesses erhöhen den Zähler nicht erneut.

Bereits vor dem Start im Saalplan ausgewählte Plätze verhindern den automatischen Lauf; sie werden nicht eigenständig entfernt. Die Anzahl bezeichnet die während dieses Suchziels neu hinzuzufügenden Tickets. Ein vorhandener Warenkorb wird nicht geleert. Eine unbestätigte Übergabe wird niemals automatisch wiederholt. Bei unbekanntem Warenkorbformat, unerwarteter Anzahl neuer Einträge oder fehlenden zuvor bestätigten Tickets hält die Suche an. Bitte dann den Warenkorb und die Reservierungsfrist prüfen.

**Stoppen** beendet Überwachung und Automatik. Nach Verarbeitung des Stopps werden keine weiteren Sitze ausgewählt und keine Warenkorbübergabe ausgelöst. Bereits ausgeführte Auswahlschritte bleiben im Shop sichtbar und müssen dort bei Bedarf geprüft oder zurückgesetzt werden. Schließen stoppt ebenfalls den Ablauf.

Bereits in den Warenkorb übernommene Tickets bleiben dort. Beim ausdrücklichen Fortsetzen einer gestoppten, eindeutig bestätigten Suche im selben Tab bleibt dieser Fortschritt erhalten. Nach 30 Minuten wird eine laufende Suche angehalten. Ein abgelaufenes oder zwischenzeitlich entferntes, zuvor bestätigtes Ticket wird nicht stillschweigend ersetzt.

Die passive Überwachung erzeugt keine zusätzlichen Verfügbarkeitsabfragen. Die Automatik liest den Warenkorb und erzeugt die normalen Auswahl- und Warenkorbanfragen des Shops. Für die Restmenge wechselt sie zurück zur ursprünglichen Ticketseite und öffnet den Saalplan. Sitzdaten und Änderungsprotokoll bleiben im Tab; Suchziel, bestätigte Warenkorbschlüssel, übernommene Sitzdaten und ausstehende Übergaben liegen zusätzlich in `chrome.storage.session`. Sie überleben Seitenwechsel und einen Neustart des Hintergrundprozesses, nicht einen Browserneustart.

## Aktualität und Grenzen

- Der erste gültige Datenstand ist für die Änderungsanzeige der Ausgangsbestand und erzeugt keine Neu-verfügbar-Meldung. Ein ausdrücklich gestarteter Warenkorblauf darf auch bereits im Ausgangsbestand freie Sitze wählen.
- Der untersuchte Shop-Adapter ruft alle 20 Sekunden die Aktualisierungsfunktion des Saalplan-Clients auf. Neue Netzwerkdaten hängen zusätzlich vom Client und den API-Antworten ab. Hintergrund-Tabs können gedrosselt werden. Ein WebSocket-Livestream wurde nicht bestätigt.
- Version 1.1.1 behebt das endlose Warten trotz angezeigter Angebote: Eine innerhalb der letzten zwei Minuten empfangene Antwort darf auch bei `expired: true` unverbindliche Kandidaten für die Platzwahl liefern. Jeder Sitz muss danach vom normalen Auswahlablauf des Shops mit einer Sitzkarte bestätigt werden. Ohne die vollständige Bestätigung erfolgt kein Warenkorbklick. Für Neu-verfügbar-Meldungen bleibt die Cache-Ablaufprüfung unverändert streng.
- Liegt der letzte bestätigte Empfang mehr als zwei Minuten zurück oder enthält die Antwort Fehler bzw. unbekannte Daten, startet keine Auswahl. Die Automatik nennt den Wartegrund. Fehler werden nicht als ausverkaufter Bestand behandelt.
- Der Shop hat bei der Untersuchung mehrfach selbst als `expired: true` markierte Antworten geliefert. Ein geladener Saalplan allein beweist keinen aktuellen Datenstand.
- Verfügbarkeit, Mapping-Sperrstatus und Preiskategorie werden geprüft. Buchungsregeln, persönliche Shopfilter und Nutzerberechtigungen können eine Auswahl dennoch verhindern. Zwischen Anzeige und Auswahl kann ein Sitz anderweitig vergeben werden.
- Der Monitor zeigt Block, Reihe, technische Sitz-ID und Kategorie. Die Sitz-ID ist keine Sitznummer. Ton und Systembenachrichtigungen sind nicht enthalten.
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

`preferences.js` plant eine passende Teilmenge bis zur Restmenge und berücksichtigt bereits gesicherte Sitze. `preferences-ui.js` stellt Gruppen, Unterkategorien, Sortierpfeile und Ticketanzahl bereit. `cart-flow.js` verwendet `sms.selectById()` und `seatSelection.getSelectedSeats()`. Auswahlvorbereitung und Formularübergabe sind getrennt, damit der Hintergrundprozess den ausstehenden Schritt vorher speichern kann. Jede Sitzkarte, der Formularpfad und `#add-to-cart` werden geprüft. Laufkennungen verhindern Wiederholungen; ein bereits empfangener Stopp verhindert auch einen verspäteten Start.

`cart-session.js` verwaltet das Suchziel pro Tab mit serialisierten Zustandsänderungen. `cart-receipt.js` liest Warenkorbkarten; `cart-return.js` meldet den bestätigten Warenkorbstand aus dem isolierten Kontext. Nur eine bestätigte Teilübergabe erlaubt die nächste. Bei unbekanntem Ausgang bleibt die Suche angehalten. Der Hintergrundprozess bestimmt Ziel, Restmenge und Rückkehradresse aus der gespeicherten Sitzung, nicht aus frei übergebenen URLs der Seite.

`monitor.js` läuft als isoliertes Content-Script. Über die Seitenbrücke werden normalisierte Sitzdaten und Statusmeldungen übergeben, keine Cookies, Request-Header, Signaturen oder API-Schlüssel. Warenkorbbefehle gehen über den Service-Worker, der Extension-Absender, Tab, Event-Adresse und Modulversionen prüft. Der MAIN-Controller liest den Datenstand direkt vom Beobachter über `TicketDataObserver.getSnapshot()`; er ist nicht mehr auf eine separat initialisierte Kopie angewiesen. Auch ein erst nach den Netzwerkantworten erzeugter Controller erhält den vollständigen Stand. Vor jedem Auswahlschritt wird er erneut gelesen. Fehlende Daten, zu alte Daten und zu wenige passende Angebote werden mit unterschiedlichen Meldungen erklärt. Seitennachrichten können keine beliebigen IDs oder Browserbefehle einschleusen. Shoptexte werden als Text gerendert.

Die Berechtigungen sind `activeTab`, `scripting` und `storage` sowie die beschränkte Content-Script-Zuordnung zu Saalplan und Warenkorb der beiden Werder-Shops. `storage.local` speichert Einstellungen und `storage.session` den laufenden Suchfortschritt, keine Cookies, Zugangsdaten oder Signaturen. `debugger` und Screenshots werden nicht verwendet.

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

Am 6. November 2026 stimmten am echten Hospitality-Event `674379` alle 17 dekodierten Sitz-IDs mit den vom Shop-Client als verfügbar erkannten Sitz-IDs überein. Das ist eine Momentaufnahme und keine Reservierungsbestätigung. Shopfunktionen, Warenkorb-Formularpfad und leerer Warenkorb wurden lesend untersucht. Es wurden keine echten Plätze ausgewählt oder reserviert; ein echter Mehrschritt-Warenkorbabschluss mit Version 1.3.0 ist daher noch nicht verifiziert.

Die reguläre Event-Adresse `674382` wurde im Cloud-Browser zur Veranstaltungsübersicht weitergeleitet. Dort konnten deshalb keine Live-Sitzdaten oder Zugangsbedingungen verifiziert werden. Der leere reguläre Warenkorb wurde lesend geöffnet und vom Warenkorb-Leser als gültig erkannt. Der Auswahl- und Rückkehrablauf ist mit kontrollierten Daten geprüft; Anmeldung, Verkaufsfreigabe und tatsächliche Buchbarkeit bestimmt weiterhin der Shop.

Beim lesenden Abgleich am 8. November 2026 wurden alle neun gelieferten Sitzangebote den vorgesehenen VIP-Unterkategorien zugeordnet. Shop-Schnittstelle und Ticketlimit von sechs waren vorhanden. Die API-Antwort war als abgelaufen markiert; Version 1.1.0 lieferte deshalb keine Auswahl. Version 1.1.1 verwendet solche kürzlich empfangenen Listen als Kandidaten und verlangt danach die Shop-Bestätigung. Der entsprechende Fehlerfall ist mit kontrollierten Shopantworten im Browser abgedeckt.

Das tatsächliche Laden einer entpackten Erweiterung ist in der Cloud durch eine Chromium-Administrationsrichtlinie blockiert. Die lokalen Browserprüfungen injizieren die Skripte deshalb zur Laufzeit. Installation und Betrieb in normalem Chrome bleiben Teil des manuellen Tests.
