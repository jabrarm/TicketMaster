# TicketMaster · Bereichswächter

Lokale Chrome-/Edge-Erweiterung für den Ablauf **grauer Bereich verändert sich → Doppelklick auf die Änderung → Einkaufswagen unten rechts**. Sie läuft im bereits geöffneten, angemeldeten Browser. Kein Server und keine Zugangsdaten erforderlich.

## Installieren

1. Dieses Projekt auf den eigenen Rechner herunterladen oder klonen.
2. In Chrome `chrome://extensions` öffnen (Edge: `edge://extensions`).
3. Entwicklermodus einschalten, **Entpackte Erweiterung laden** wählen und den Ordner `extension` auswählen. Eine ZIP-Datei vorher entpacken.
4. Die Erweiterung an die Symbolleiste anheften.

## Auf der Ticketseite verwenden

1. [Saalplan öffnen](https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379), gegebenenfalls anmelden und warten, bis alles geladen ist.
2. Das Erweiterungssymbol anklicken. Das Bedienfeld erscheint oben rechts, damit der Einkaufswagen unten rechts frei bleibt.
3. **Grauen Bereich markieren**: Ein kleines Rechteck über die relevanten grauen Plätze/Linien ziehen. Der gewählte Bereich wird vollständig überwacht; bereits farbige Plätze lösen nicht aus.
4. **Einkaufswagen unten rechts wählen**: Das gewünschte Einkaufswagen-Symbol einmal auswählen. Dieser Auswahlklick betätigt den Warenkorb noch nicht. Das Ziel muss bereits sichtbar sein.
5. Zuerst **Überwachung starten**, ohne die automatische Klickfolge anzuhaken. Eine erkannte Änderung wird gemeldet; es wird nichts angeklickt.
6. Für den automatischen Ablauf **Klickfolge automatisch ausführen** aktivieren und neu starten, während der relevante Platz grau ist. Bei einer bestätigten Änderung wird an der erkannten Position doppelt geklickt und nach mindestens 250 ms der ausgewählte Einkaufswagen betätigt. Ein deaktivierter Warenkorb wird bis zu drei Sekunden abgewartet.

Die Überwachung stoppt nach dem ersten Treffer. **Escape** oder **Stoppen** bricht ab, auch zwischen Doppelklick und Folgeklick. Nach Scrollen oder Änderung der Fenstergröße müssen beide Ziele neu gewählt werden. Den Tab sichtbar und die Ansicht unverändert lassen; die Erweiterung aktualisiert die Ticketseite nicht selbst.

## Geschwindigkeit und Grenzen

- Bildbasierte Erkennung, unabhängig davon, ob der Saalplan als Canvas, SVG oder HTML angezeigt wird. Chrome erlaubt höchstens zwei Tab-Aufnahmen pro Sekunde. Aufnahmen erfolgen im Abstand von mindestens 550 ms; eine Änderung muss in zwei aufeinanderfolgenden Bildern bestehen. Reaktion typischerweise nach etwa 0,6–1,2 Sekunden plus Aufnahme-/Verarbeitungszeit. Keine garantierte Latenz. Diese Version ist noch nicht auf minimale Latenz für den konkreten Saalplan optimiert.
- Ausgangspunkt sind hell- bis mittelgraue Pixel (RGB 100–245 mit geringer Farbdifferenz). Mindestens zwölf deutlich veränderte Pixel in einer 12×12-Pixel-Zelle lösen aus. Animationen, schwebende Menüs, Tooltips oder eine verschobene Karte können ebenfalls als Änderung erscheinen. Kleine, ruhige Bereiche und den Testmodus verwenden.
- Der Doppelklick trifft die stärkste lokale Veränderung innerhalb des markierten Bereichs. Nicht mehrere unzusammenhängende Bereiche gleichzeitig markieren.
- Die Erweiterung sendet synthetische Mausereignisse. Manche Shops akzeptieren diese nicht, insbesondere bei eingebetteten Frames oder Prüfungen auf echte Eingaben. In diesem Fall ist eine Anpassung an die konkrete Seite erforderlich. Die Warenkorbposition wird vor dem Folgeklick auf das ursprünglich gewählte Seitenelement geprüft; bei verändertem Ziel wird abgebrochen.
- Ein Einkaufswagen, der erst nach dem Doppelklick erscheint, ist in dieser ersten Version noch nicht auswählbar. Checkout, Zahlung und automatisches Neuladen sind nicht implementiert.
- Die echte Ticketseite war aus der Entwicklungsumgebung durch die Netzwerkrichtlinie gesperrt (HTTP 403 beim Proxy-Verbindungsaufbau). Das Verhalten auf dieser Seite ist **noch nicht verifiziert**; es wurden keine echten Tickets ausgewählt oder Warenkörbe verändert.

## Datenschutz

Die Erweiterung benötigt nur `activeTab` und `scripting`. Sie erhält Zugriff nach dem Klick auf ihr Symbol. Aufnahmen des sichtbaren Tabs werden lokal verarbeitet, nicht gespeichert und nicht an einen Server geschickt. Auswahl und Referenzbild bleiben nur bis zum Schließen/Neuladen im Arbeitsspeicher.

## Entwickeln und prüfen

Node.js und npm verwenden; die Erweiterung selbst benötigt keine npm-Pakete und keinen Build.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Der Browsertest nutzt `CHROMIUM_PATH`, falls gesetzt, andernfalls vorhandenes `/usr/bin/chromium` oder den Playwright-Browser. Er prüft auf einer lokalen Testseite die Bildauswertung, den Testmodus, die einmalige Klickfolge, Escape und ungültige Koordinaten nach Größenänderung. Die Chrome-Aufnahme-API wird dabei durch echte Browser-Screenshots ersetzt; ihre Tab-Prüfungen werden separat mit simulierten API-Antworten getestet. Der vollständige Erweiterungsbetrieb und das Verhalten im echten Shop müssen zusätzlich im eigenen Browser geprüft werden.

Für einen manuellen Funktionstest:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Dann im eigenen Browser `http://127.0.0.1:8080/tests/demo.html` öffnen, die Erweiterung starten und die mittlere Linie überwachen. Das lokale Testprogramm führt keine Netzwerkaktionen aus.
