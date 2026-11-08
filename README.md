# TicketMaster · Verfügbarkeitsmonitor 1.0

Chrome-Erweiterung für den Werder-Hospitality-Shop. Sie liest strukturierte Sitzdaten, die der geöffnete Shop selbst lädt. Keine Farberkennung, Zoom-Kalibrierung oder eingelernten Klickpunkte.

## Installieren und starten

1. Den Ordner `extension` herunterladen bzw. das bereitgestellte ZIP entpacken.
2. Unter `chrome://extensions` den Entwicklermodus aktivieren und **Entpackte Erweiterung laden** wählen. Den Ordner mit `manifest.json` auswählen. Bei einem Update **Neu laden** anklicken.
3. Die [Ticketseite](https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379) öffnen und **nach Installation oder Update neu laden**. Eine Warteschlange normal durchlaufen.
4. Im Shop **Jetzt Plätze auswählen** öffnen. Die Seite muss ihren Saalplan laden können.
5. Auf das Erweiterungssymbol klicken und **Überwachung starten** wählen.

Der Monitor zeigt die vom Shop gemeldeten freien Sitze mit Block, Reihe, technischer Sitz-ID und Kategorie. Die Sitz-ID ist **keine Sitznummer**. Über den Blockfilter lässt sich die Anzeige eingrenzen. Allgemeine Einlass-/Stehplatzkontingente sind in dieser Version nicht enthalten.

Der erste gültige Datenstand ist der Ausgangsbestand und erzeugt keine Änderungsmeldung. Später neu gemeldete Sitze werden hervorgehoben und im Änderungsprotokoll aufgeführt; wegfallende Sitze werden ebenfalls erfasst. Ein zuvor verschwundener Sitz kann bei erneutem Auftauchen wieder als neu gelten. Ein anderer Saalplan oder eine neue Saalplan-Version beginnt mit einem neuen Ausgangsbestand.

**Stoppen** beendet die Anzeige weiterer Änderungen. **Überwachung starten** beginnt einen neuen Vergleich mit dem dann zuletzt empfangenen Stand. Schließen stoppt den Monitor. Die Seite lädt ihre Daten unabhängig davon weiter; die Erweiterung erzeugt keine zusätzlichen API-Abfragen und lädt die Seite nicht automatisch neu. Bei jedem Seitenneuladen muss die Überwachung neu gestartet werden. Daten und Protokoll bleiben nur im Arbeitsspeicher des Tabs.

## Aktualität und Grenzen

- Aktualisierungen hängen vom Shop ab. Der untersuchte Shop-Adapter ruft alle 20 Sekunden die Aktualisierungsfunktion des Saalplan-Clients auf; wann daraus neue Netzwerkdaten entstehen, hängt auch vom Client und den API-Antworten ab. Hintergrund-Tabs können gedrosselt werden. Dies ist kein bestätigter WebSocket-Livestream.
- Als abgelaufen markierte API-Daten werden ausdrücklich angezeigt und lösen keine Verfügbarkeitsmeldungen aus. Der Vergleich setzt erst mit gültigen Daten fort.
- Netzwerk- und Formatfehler gelten nicht als ausverkaufter Bestand. Der Monitor zeigt den letzten empfangenen Stand mit einem Fehlerhinweis. Nach zwei Minuten ohne bestätigten Empfang erscheint ein Hinweis auf möglicherweise veraltete Daten.
- Der Monitor berücksichtigt Verfügbarkeit, den Sperrstatus der Sitzzuordnung und eine vorhandene Preiskategorie. Er bildet nicht alle möglichen Buchungsregeln, Nutzerberechtigungen oder persönlichen Filter des Shops nach. Freie Sitze können zwischen Anzeige und Auswahl anderweitig vergeben werden.
- Der Monitor zeigt Änderungen im geöffneten Tab. Es gibt derzeit keinen Ton, keine Systembenachrichtigung, keine automatische Platzauswahl und keinen Warenkorbklick.
- Unterstützt wird der Pfad `/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/<ID>` auf `www.ticket-onlineshop.com`. Andere Shops sind noch nicht untersucht.

## Technischer Ansatz

`availability-core.js` verbindet drei vom Shop geladene JSON-Antworten unter `https://public-api.eventim.com/seatmap/api/public/`:

| Antwort | Verwendung |
| --- | --- |
| `seatmap/tixx-1001-<Event-ID>` | Block- und Reihenzuordnung sowie delta-kodierte Sitz-IDs |
| `mapping/tixx-1001-<Event-ID>` | Sitz-Sperrstatus und delta-kodierte Preiskategorien |
| `availability/tixx-1001-<Event-ID>` | Delta-kodierte Sitz-IDs, Verfügbarkeitsstatus, Datenzeit und Ablaufstatus |

Die Dekodierung folgt dem beobachteten Format des Eventim-Saalplan-Clients 6.20.0. Ein Sitz gilt für die Anzeige als verfügbar, wenn seine API-Verfügbarkeit `1`, sein Mapping-Status `0` und eine Preiskategorie vorhanden sind. Nicht zusammenpassende Saalplan-Versionen werden nicht gemeinsam ausgewertet. Unbekannte Formate führen zu einer Fehlermeldung.

`page-observer.js` läuft ab Dokumentstart in der Seitenwelt und beobachtet `fetch` und `XMLHttpRequest`. Originale Requests und Antworten werden an die Seite weitergereicht; nur passende Antworten für das aktuelle Event werden zusätzlich gelesen. Die Erweiterung wiederholt keine signierten Requests. Antwortreihenfolge und Datenzeitstempel verhindern, dass verspätete Antworten neuere Daten überschreiben.

`monitor.js` läuft als isoliertes Content-Script. Über die Seitenbrücke werden ausschließlich normalisierte Sitzdaten und Statusmeldungen übergeben, keine Cookies, Request-Header, Signaturen oder API-Schlüssel. Seitennachrichten werden als untrusted behandelt und autorisieren keine Browser- oder Ticketaktionen. Shoptexte werden als Text gerendert.

Die Berechtigungen sind `activeTab` und `scripting` sowie die beschränkte Content-Script-Zuordnung zum genannten Shop-Pfad. `debugger`, Screenshots und dauerhafte Speicherung werden nicht verwendet. Die frühere Bild- und Klicksteuerung wurde entfernt.

## Entwicklung und Prüfung

Node.js ab Version 20 und Chromium werden benötigt. Kein Build und kein Backend erforderlich.

```sh
cd /workspace/TicketMaster
npm ci
npm test
npm run test:browser
```

Die Browserprüfung nutzt `CHROMIUM_PATH`, vorhandenes `/usr/bin/chromium` oder einen installierten Playwright-Browser. Die lokalen Tests prüfen Dekodierung, Baseline, Versionswechsel, Sitzänderungen, Fehler, abgelaufene Daten, Fetch/XHR und die Anzeige mit kontrollierten Shopantworten.

Bei der Untersuchung am 6. November 2026 wurden am echten Event `674379` 17 Sitz-IDs aus den Netzwerkantworten dekodiert. Sie stimmten vollständig mit den vom Shop-Client als verfügbar erkannten Sitz-IDs überein. Das ist eine Momentaufnahme und keine Reservierungsbestätigung. Echte spätere Freigaben wurden nicht provoziert; ihre Erkennung wird mit kontrollierten Daten getestet.

In einem weiteren Beobachtungsdurchlauf lieferte der Shop mehrfach selbst als `expired: true` markierte Verfügbarkeitsantworten. Die Erweiterung zeigte diese als abgelaufen an und unterdrückte Änderungsmeldungen. Ein geladener Saalplan allein beweist daher keinen aktuellen Datenstand.

Die Browserprüfung injiziert die Skripte zur Laufzeit. Das tatsächliche Laden der entpackten Erweiterung ist in dieser Cloud durch die Chromium-Administrationsrichtlinie blockiert und bleibt lokal in Chrome zu prüfen. Es wurden keine echten Plätze ausgewählt oder reserviert.

Installation in normalem Chrome und die Reihenfolge der MAIN-/ISOLATED-Content-Scripts sind daher Teil des manuellen Installationstests. Wenn nach Installation keine Daten ankommen: Ticketseite neu laden, Saalplan öffnen und den Monitor starten. Bei Formatfehlern die Erweiterung an das geänderte Shopformat anpassen; Fehler nicht als leeren Bestand behandeln.
