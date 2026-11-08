# TicketMaster · Verfügbarkeit und Warenkorb 1.1.1

Chrome-Erweiterung für den Werder-Hospitality-Shop: freie Sitze aus strukturierten Daten erkennen, Ticketanzahl und Kategoriepräferenzen einstellen und eine vollständig bestätigte Auswahl an den Warenkorb übergeben. Keine Farberkennung, Zoom-Kalibrierung oder eingelernten Klickpunkte.

## Installieren und starten

1. Den Branch `availability-monitor-v1` bzw. das ZIP der aktuellen Version herunterladen und entpacken.
2. Unter `chrome://extensions` Entwicklermodus aktivieren und **Entpackte Erweiterung laden** wählen. Den Ordner `extension` mit `manifest.json` auswählen. Bei einem Update **Neu laden** anklicken. Angezeigte Version: **1.1.1**. Die zusätzliche Berechtigung `storage` speichert die Einstellungen lokal.
3. Die [Ticketseite](https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379) nach Installation oder Update neu laden. Eine Warteschlange normal durchlaufen und Cookie-Dialoge selbst bedienen.
4. Im Shop **Jetzt Plätze auswählen** öffnen und den Saalplan laden lassen.
5. Auf das Erweiterungssymbol klicken. Für die reine Anzeige **Überwachung starten** wählen.
6. Für die Automatik **Anzahl Tickets** von 1 bis 6 einstellen. Kategorien über die Gruppen-Häkchen komplett auswählen, Unterkategorien bei Bedarf abwählen und Gruppen sowie Unterkategorien mit **↑ / ↓** sortieren. Oben steht die höchste Präferenz. Über das Dreieck lassen sich Unterkategorien ein- und ausklappen.
7. **Nebeneinander bevorzugen; sonst nach Kategoriepräferenz** aktiviert lassen, wenn zuerst eine zusammenhängende Gruppe bevorzugt werden soll. Danach **Automatisch in den Warenkorb** anklicken. Die Automatik prüft passende Angebote aus kürzlich empfangenen Shopantworten durch die normale Platzwahl.

Fehlende Seitenskripte werden beim Klick auf das Erweiterungssymbol nachgeladen, damit sich das Fenster auch in bereits geöffneten Tabs öffnet. Zum Erfassen aller Saalplan-Daten die Ticketseite dennoch nach Installation oder Update neu laden. Nicht unterstützte Seiten erhalten einen Hinweis. Verweigert Chrome die Skriptausführung, erscheint am Erweiterungssymbol ein rotes `!`; der Hinweis beim Darüberfahren nennt den Fehler.

## Kategorien und Präferenzen

Die Kategorien aus der bereitgestellten Grafik sind hinterlegt: Platzkategorie 1 mit vier Unterkategorien, Platzkategorie 2 mit sechs, Platzkategorie 3 mit fünf, Platzkategorie 4 mit einer und Platzkategorie 5 mit den beiden Ost-Steh-Varianten. Die Reihenbereiche der Grafik werden bei einer eindeutigen Zuordnung berücksichtigt.

Die VIP-Gruppe enthält fünf separat auswählbare Unterkategorien:

- VIP-Rang Platin
- Partner des Fußballs.-Lounge
- VIP-Club Ost
- VIP-Club Ost.
- VIP-Rang Gold

Die beiden Ost-Bezeichnungen sind verschiedene Shopkategorien; der abschließende Punkt wird beim Zuordnen nicht entfernt. Andere VIP-Angebote wie „Gold Select“ werden nicht stillschweigend „Gold“ zugeordnet.

Auf der weiterhin verwendeten **Hospitality-Adresse werden VIP-Angebote geliefert**. Die normalen Platzkategorien 1–5 stehen als Einstellungsstruktur bereit, haben dort aber keine passenden Angebote. Ihre Zuordnung erfordert ausdrücklich passende Preis- und Regionsdaten; aus einer Blocknummer oder Farbe wird keine Kategorie geraten. Allgemeine Einlass-/Stehplatzkontingente und Ermäßigungsvarianten werden in dieser Version nicht automatisiert. Nicht zuordenbare Sitzangebote bleiben sichtbar, werden aber nicht automatisch gewählt.

Ticketanzahl, Reihenfolge, Häkchen und Nebeneinander-Präferenz werden lokal in der Erweiterung gespeichert. Nach Neuladen oder Öffnen eines Tabs startet die Automatik niemals selbstständig. Der Blockfilter der Übersicht verändert nur die Anzeige, nicht die Kategoriepräferenzen der Automatik.

Für die Nebeneinander-Präferenz werden dieselbe Saalplan-Reihengruppe, aufeinanderfolgende Sitzpositionen und IDs sowie der geometrische Abstand geprüft. Dies ist eine konservative Ableitung aus dem Saalplan, keine unabhängig bestätigte Sitznummern-Garantie. Existiert unter den gewählten Optionen eine passende Gruppe, wird sie bevorzugt, auch gegenüber einzelnen Sitzen einer höher sortierten Kategorie. Unter passenden Gruppen entscheidet die Kategoriepräferenz. Ohne passende Gruppe werden die bestplatzierten Einzelsitze gewählt; diese können aus unterschiedlichen erlaubten Unterkategorien stammen.

## Automatischer Ablauf und Stoppen

Die Automatik wählt zunächst die gesamte gewünschte Anzahl anhand der Sitz-IDs aus. Jeder Sitz muss in der Auswahl des Shops und als gerenderte Sitzkarte bestätigt sein. Erst dann wird einmal der normale **In den Warenkorb**-Knopf betätigt. Navigation und tatsächliche Reservierung übernimmt der Shop. Eine Übergabemeldung der Erweiterung ersetzt keine Bestätigung des Warenkorbinhalts. Checkout und Zahlung sind nicht automatisiert.

Bereits vor dem Start im Saalplan ausgewählte Plätze verhindern den automatischen Lauf; sie werden nicht eigenständig entfernt. Die Anzahl bezeichnet die in diesem Lauf neu hinzuzufügenden Tickets. Ein bereits bestehender Warenkorb wird nicht geleert. Nach einer Übergabe startet im selben Monitorfenster kein zweiter automatischer Lauf. Bei Fehlern wird nicht automatisch erneut versucht.

**Stoppen** beendet Überwachung und Automatik. Nach Verarbeitung des Stopps werden keine weiteren Sitze ausgewählt und keine Warenkorbübergabe ausgelöst. Bereits ausgeführte Auswahlschritte bleiben im Shop sichtbar und müssen dort bei Bedarf geprüft oder zurückgesetzt werden. Schließen stoppt ebenfalls den Ablauf.

Die passive Überwachung erzeugt keine zusätzlichen Verfügbarkeitsabfragen. Der automatische Auswahllauf erzeugt die normalen Auswahl- und Warenkorbanfragen des Shops. Die Erweiterung lädt die Seite nicht automatisch neu. Sitzdaten und Änderungsprotokoll bleiben nur im Arbeitsspeicher des Tabs.

## Aktualität und Grenzen

- Der erste gültige Datenstand ist für die Änderungsanzeige der Ausgangsbestand und erzeugt keine Neu-verfügbar-Meldung. Ein ausdrücklich gestarteter Warenkorblauf darf auch bereits im Ausgangsbestand freie Sitze wählen.
- Der untersuchte Shop-Adapter ruft alle 20 Sekunden die Aktualisierungsfunktion des Saalplan-Clients auf. Neue Netzwerkdaten hängen zusätzlich vom Client und den API-Antworten ab. Hintergrund-Tabs können gedrosselt werden. Ein WebSocket-Livestream wurde nicht bestätigt.
- Version 1.1.1 behebt das endlose Warten trotz angezeigter Angebote: Eine innerhalb der letzten zwei Minuten empfangene Antwort darf auch bei `expired: true` unverbindliche Kandidaten für die Platzwahl liefern. Jeder Sitz muss danach vom normalen Auswahlablauf des Shops mit einer Sitzkarte bestätigt werden. Ohne die vollständige Bestätigung erfolgt kein Warenkorbklick. Für Neu-verfügbar-Meldungen bleibt die Cache-Ablaufprüfung unverändert streng.
- Liegt der letzte bestätigte Empfang mehr als zwei Minuten zurück oder enthält die Antwort Fehler bzw. unbekannte Daten, startet keine Auswahl. Die Automatik nennt den Wartegrund. Fehler werden nicht als ausverkaufter Bestand behandelt.
- Der Shop hat bei der Untersuchung mehrfach selbst als `expired: true` markierte Antworten geliefert. Ein geladener Saalplan allein beweist keinen aktuellen Datenstand.
- Verfügbarkeit, Mapping-Sperrstatus und Preiskategorie werden geprüft. Buchungsregeln, persönliche Shopfilter und Nutzerberechtigungen können eine Auswahl dennoch verhindern. Zwischen Anzeige und Auswahl kann ein Sitz anderweitig vergeben werden.
- Der Monitor zeigt Block, Reihe, technische Sitz-ID und Kategorie. Die Sitz-ID ist keine Sitznummer. Ton und Systembenachrichtigungen sind nicht enthalten.
- Unterstützt wird ausschließlich `/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/<ID>` auf `www.ticket-onlineshop.com`.

## Technik und Datenschutz

`availability-core.js` verbindet drei vom Shop geladene JSON-Antworten unter `https://public-api.eventim.com/seatmap/api/public/`:

| Antwort | Verwendung |
| --- | --- |
| `seatmap/tixx-1001-<Event-ID>` | Block, Reihe, Geometrie und delta-kodierte Sitz-IDs |
| `mapping/tixx-1001-<Event-ID>` | Sitz-Sperrstatus und delta-kodierte Preiskategorien |
| `availability/tixx-1001-<Event-ID>` | Verfügbarkeit, Datenzeit und Ablaufstatus |

Die Dekodierung folgt dem untersuchten Eventim-Saalplan-Client 6.20.0. Ein Sitz gilt als verfügbar, wenn seine API-Verfügbarkeit `1`, sein Mapping-Status `0` und eine Preiskategorie vorhanden sind. Nicht zusammenpassende Saalplan-Versionen werden nicht gemeinsam ausgewertet. Unbekannte Formate erzeugen einen Fehler.

`page-observer.js` beobachtet ab Dokumentstart `fetch` und `XMLHttpRequest` in der Seitenwelt. Originale Requests und Antworten werden an die Seite weitergereicht. Nur passende Antworten für das aktuelle Event werden zusätzlich gelesen. Die Erweiterung wiederholt keine signierten Requests. Antwortreihenfolge und Datenzeitstempel verhindern, dass verspätete Antworten neuere Daten überschreiben.

`preferences.js` plant eine vollständige Auswahl anhand frischer Daten. `preferences-ui.js` stellt Gruppen, Unterkategorien, Sortierpfeile und Ticketanzahl bereit. `cart-flow.js` verwendet die untersuchten Shop-Funktionen `sms.selectById()` und `seatSelection.getSelectedSeats()`. Es wartet nach jeder Auswahl auf die Sitzkarte, prüft den bekannten Formularpfad des Events und verwendet `#add-to-cart`. Laufkennungen verhindern Wiederholungen desselben Laufs; ein bereits empfangener Stopp verhindert auch einen verspäteten Start.

`monitor.js` läuft als isoliertes Content-Script. Über die Seitenbrücke werden normalisierte Sitzdaten und Statusmeldungen übergeben, keine Cookies, Request-Header, Signaturen oder API-Schlüssel. Warenkorbbefehle gehen über den Service-Worker, der Extension-Absender, Tab und Event-Adresse prüft. Der MAIN-Controller plant selbst noch einmal aus seinem eigenen zuletzt empfangenen Datenstand und den freigegebenen Präferenzen. Seitennachrichten können keine beliebigen IDs oder Browserbefehle einschleusen. Shoptexte werden als Text gerendert.

Die Berechtigungen sind `activeTab`, `scripting` und `storage` sowie die beschränkte Content-Script-Zuordnung zum Shop-Pfad. `storage` speichert ausschließlich Einstellungen. `debugger` und Screenshots werden nicht verwendet. Die frühere Bild- und Klicksteuerung wurde entfernt.

## Entwicklung und Prüfstatus

Node.js ab Version 20 und Chromium werden benötigt. Kein Build und kein Backend erforderlich.

```sh
cd /workspace/TicketMaster
npm ci
npm test
npm run test:browser
```

Die Browserprüfung nutzt `CHROMIUM_PATH`, `/usr/bin/chromium` oder einen installierten Playwright-Browser. Die Tests prüfen Dekodierung, Baseline, Versionswechsel, abgelaufene Daten, Fetch/XHR, Kategoriezuordnung, Sortierung, Nebeneinander-Präferenz, exakte Ticketanzahl, einzelne Shop-Bestätigungen, einmaligen Warenkorbklick und Stoppen mit kontrollierten Shopantworten. Der automatisierte Gesamttest ersetzt die Shopfunktionen und die Extension-Nachrichtenbrücke durch kontrollierte Testgegenstücke.

Am 6. November 2026 stimmten am echten Event `674379` alle 17 dekodierten Sitz-IDs mit den vom Shop-Client als verfügbar erkannten Sitz-IDs überein. Das ist eine Momentaufnahme und keine Reservierungsbestätigung. Die Shopfunktionen und der Warenkorb-Formularpfad wurden lesend untersucht. Es wurden keine echten Plätze ausgewählt oder reserviert; ein echter Warenkorbabschluss mit Version 1.1.1 ist daher noch nicht verifiziert.

Beim lesenden Abgleich am 8. November 2026 wurden alle neun gelieferten Sitzangebote den vorgesehenen VIP-Unterkategorien zugeordnet. Shop-Schnittstelle und Ticketlimit von sechs waren vorhanden. Die API-Antwort war als abgelaufen markiert; Version 1.1.0 lieferte deshalb keine Auswahl. Version 1.1.1 verwendet solche kürzlich empfangenen Listen als Kandidaten und verlangt danach die Shop-Bestätigung. Der entsprechende Fehlerfall ist mit kontrollierten Shopantworten im Browser abgedeckt.

Das tatsächliche Laden einer entpackten Erweiterung ist in der Cloud durch eine Chromium-Administrationsrichtlinie blockiert. Die lokalen Browserprüfungen injizieren die Skripte deshalb zur Laufzeit. Installation und Betrieb in normalem Chrome bleiben Teil des manuellen Tests.
