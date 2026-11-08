(() => {
  'use strict';
  if (window.__ticketDataMonitor) return;
  const channel = 'ticket-data-monitor-v1', { Tracker, eventId } = globalThis.TicketAvailability;
  const tracker = new Tracker();
  let host, ui, running = false, last = null, change = null, error = '', changes = [];
  let preferences, config = globalThis.TicketPreferences.defaults(), armed = false, inFlight = false, runId = null, cartMessage = '', submitted = false;
  const text = (tag, value, parent) => {
    const node = document.createElement(tag); node.textContent = value; parent?.append(node); return node;
  };
  const decode = value => {
    const area = document.createElement('textarea'); area.innerHTML = String(value).replace(/</g, '&lt;'); return area.value;
  };
  const clock = time => new Date(time).toLocaleTimeString('de-DE');
  function mount() {
    if (host?.isConnected) return;
    host = document.createElement('div'); host.id = 'ticket-data-monitor';
    ui = host.attachShadow({ mode: 'open' });
    ui.innerHTML = `<style>
      :host{all:initial;position:fixed;z-index:2147483647;right:20px;top:20px;font:14px/1.45 system-ui,sans-serif;color:#eaf1ed;width:min(540px,calc(100vw - 40px));color-scheme:dark}
      *{box-sizing:border-box}section{background:#12261f;border:1px solid #4e6b5e;border-radius:16px;box-shadow:0 12px 60px #0007;overflow:hidden}
      header{padding:18px 20px;border-bottom:1px solid #395346;display:flex;align-items:center;justify-content:space-between}h1{font-size:18px;margin:0}p{margin:8px 0}button,select{font:inherit;border:1px solid #638472;border-radius:8px;padding:8px 12px;background:#203d30;color:inherit;cursor:pointer}button:focus-visible,select:focus-visible{outline:3px solid #b5e5ba}button:disabled{opacity:.5;cursor:default}.close{padding:4px 10px}
      main{padding:16px 20px;max-height:75vh;overflow:auto}.controls{display:flex;gap:8px;flex-wrap:wrap}.primary{background:#b5e5ba;color:#12261f;font-weight:650}.muted{color:#b0c6b8;font-size:12px}.status{padding:10px 0;overflow-wrap:anywhere}.error{color:#ffcf99}.count{font-size:28px;font-weight:700}label{display:block;margin:12px 0}select{margin-left:8px;max-width:75%}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #395346;vertical-align:top}td small{display:block;color:#b0c6b8}.new{background:#284e36}h2{font-size:14px;margin:18px 0 8px}ul{padding-left:20px;font-size:12px}.footer{border-top:1px solid #395346;padding-top:12px}
      fieldset{border:1px solid #395346;border-radius:10px;margin:14px 0;padding:12px}legend{font-weight:650}input[type=number]{width:65px;padding:6px;background:#203d30;color:inherit;border:1px solid #638472;border-radius:6px}input[type=checkbox]{accent-color:#b5e5ba}.checkline{display:flex;align-items:center;gap:8px;margin:7px 0;flex:1}.prefgroup{border-top:1px solid #395346;padding:8px 0}.prefgroup summary{display:flex;gap:4px;align-items:center;cursor:pointer}.prefgroup summary::before{content:'▸'}.prefgroup[open]>summary::before{content:'▾'}.prefchild{display:flex;gap:4px;align-items:center;padding-left:14px;font-size:12px}.order{padding:3px 7px}summary:focus-visible{outline:2px solid #b5e5ba}#cart-status{padding:10px;border:1px solid #638472;border-radius:8px}
    </style><section aria-label="Ticket-Verfügbarkeit"><header><div><h1>Ticket-Verfügbarkeit</h1><span class="muted">Shopdaten · ohne Farberkennung</span></div><button class="close" aria-label="Schließen">×</button></header><main>
      <div class="controls"><button id="start" class="primary">Überwachung starten</button><button id="stop" disabled>Stoppen</button></div>
      <p id="status" class="status" role="status" aria-live="polite"></p><p id="checked" class="muted"></p>
      <div id="preferences"></div><button id="auto">Automatisch in den Warenkorb</button><p id="cart-status" role="status" aria-live="polite">Automatik ist ausgeschaltet. Erst Anzahl und Präferenzen einstellen.</p>
      <div><span id="count" class="count">–</span> <span id="count-label">gemeldete freie Sitze</span></div>
      <label>Block <select id="block" aria-label="Block filtern"><option value="">Alle Blöcke</option></select></label>
      <table><thead><tr><th>Block / Reihe</th><th>Sitz-ID</th><th>Kategorie</th></tr></thead><tbody id="seats"></tbody></table>
      <h2>Änderungen seit dem Start</h2><ul id="changes"></ul>
      <p class="muted footer">Die Erweiterung beobachtet die vom geöffneten Shop geladenen Daten. Aktualisierungen hängen vom Shop ab. Sitz-IDs sind keine Sitznummern. Stehplatzkontingente sind nicht enthalten. Eine Reservierung ist erst nach Bestätigung des Shops gesichert.</p>
    </main></section>`;
    (document.body || document.documentElement).append(host);
    ui.querySelector('.close').onclick = () => { stop(); host.remove(); };
    ui.querySelector('#start').onclick = start;
    ui.querySelector('#stop').onclick = stop;
    ui.querySelector('#block').onchange = render;
    preferences = globalThis.TicketPreferencePanel.create(ui.querySelector('#preferences'), value => { config = value; render(); });
    config = preferences.get();
    preferences.lock(armed || inFlight);
    ui.querySelector('#auto').onclick = () => {
      if (submitted || armed || inFlight) return;
      config = preferences.get();
      try { globalThis.TicketPreferences.validate(config); if (![...globalThis.TicketPreferences.rank(config)].length) throw new Error('Bitte mindestens eine Unterkategorie auswählen.'); }
      catch (e) { cartMessage = e.message; render(); return; }
      if (!running) start();
      armed = true; runId = crypto.randomUUID(); preferences.lock(true);
      cartMessage = 'Automatik wartet auf ' + config.quantity + ' passende, aktuelle Plätze. Nebeneinander wird ' + (config.adjacent ? 'bevorzugt.' : 'nicht vorausgesetzt.');
      render(); void maybeCart();
    };
    render();
  }
  function start() {
    tracker.reset(); last = null; change = null; error = ''; changes = []; running = true;
    render(); window.postMessage({ channel, type: 'request' }, location.origin);
  }
  function stop() {
    running = false; armed = false;
    if (inFlight && typeof chrome !== 'undefined') {
      chrome.runtime.sendMessage({ type: 'cartStop', run: runId }).catch(() => {});
      cartMessage = 'Stoppen angefordert. Bereits ausgewählte Plätze bitte im Shop prüfen.';
    }
    if (!inFlight) preferences?.lock(false);
    render();
  }
  async function maybeCart() {
    if (!armed || inFlight || !running) return;
    if (!last || error) { cartMessage = error ? 'Automatik wartet: ' + error : 'Automatik wartet auf die Sitzangebote des Shops.'; render(); return; }
    const plan = globalThis.TicketPreferences.candidates(last, config);
    if (!plan) {
      const tooOld = Date.now() - last.checkedAt > 120000;
      cartMessage = tooOld ? 'Automatik wartet: Seit über zwei Minuten keine Shopantwort. Bitte den Saalplan neu laden.' : 'Automatik wartet: Nicht genügend Sitzangebote für ' + config.quantity + ' Tickets in deinen gewählten Unterkategorien.';
      render(); return;
    }
    const currentRun = runId;
    const placement = config.quantity === 1 ? 'nach Kategoriepräferenz' : plan.adjacent ? 'nebeneinander nach Saalplan' : 'nach Kategoriepräferenz, einzeln verteilt';
    inFlight = true; cartMessage = 'Prüfe ' + config.quantity + (config.quantity === 1 ? ' Sitzangebot ' : ' Sitzangebote ') + placement + ' durch die Platzwahl im Shop. Warenkorbübergabe erst nach Bestätigung …'; render();
    try {
      const result = await chrome.runtime.sendMessage({ type: 'cartStart', run: currentRun, config });
      if (result?.stage !== 'submitted') throw new Error(result?.error || 'Die Übergabe wurde nicht bestätigt. Bitte Auswahl und Warenkorb im Shop prüfen.');
      submitted = true; cartMessage = result.count + ' bestätigte Plätze an den Warenkorbablauf des Shops übergeben. Den tatsächlichen Warenkorbinhalt bitte dort prüfen.';
    } catch (e) { cartMessage = 'Automatik angehalten: ' + e.message + ' Kein automatischer Wiederholungsversuch.'; }
    finally { armed = false; inFlight = false; preferences?.lock(false); render(); }
  }
  function render() {
    if (!ui || !host.isConnected) return;
    ui.querySelector('#start').disabled = running || !eventId(location.href); ui.querySelector('#stop').disabled = !running;
    ui.querySelector('#auto').disabled = armed || inFlight || submitted || !eventId(location.href);
    ui.querySelector('#cart-status').textContent = cartMessage || 'Automatik ist ausgeschaltet. Erst Anzahl und Präferenzen einstellen.';
    preferences?.snapshot(last);
    const status = ui.querySelector('#status');
    const stale = last && Date.now() - last.checkedAt > 120000;
    const expired = last?.stale || (last && Number.isFinite(last.validUntil) && last.validUntil < Date.now());
    status.classList.toggle('error', Boolean(error || stale || expired));
    status.textContent = !eventId(location.href) ? 'Diese Adresse wird noch nicht unterstützt. Öffne den Saalplan im Werder-Hospitality-Shop; die Adresse muss mit /areaplan/venue/event/<ID> enden.'
      : !running ? 'Gestoppt. Mit „Überwachung starten“ einen neuen Ausgangsbestand erfassen.'
      : error || (expired ? 'Die Shop-Liste ist als abgelaufen markiert. Angezeigte Sitze sind unverbindliche Angebote; die Automatik lässt jeden Sitz durch den Shop bestätigen.'
        : stale ? 'Seit über zwei Minuten keine bestätigte Aktualisierung. Der angezeigte Stand kann veraltet sein.'
        : !last ? 'Warte auf Shopdaten. Öffne den Saalplan; falls nötig, lade die Ticketseite neu.'
          : change?.baseline ? 'Ausgangsbestand erfasst. Warte auf die nächste Aktualisierung des Shops.'
            : `Shopdaten aktualisiert · ${change?.added.length || 0} neu frei · ${change?.removed.length || 0} nicht mehr frei.`);
    ui.querySelector('#checked').textContent = last ? 'Letzter bestätigter Datenempfang: ' + clock(last.checkedAt) : 'Noch kein bestätigter Datenstand.';
    ui.querySelector('#count').textContent = last ? String(last.seats.length) : '–';
    ui.querySelector('#count-label').textContent = expired || stale ? 'Sitzangebote aus der zuletzt empfangenen Shop-Liste' : 'gemeldete freie Sitze';
    const filter = ui.querySelector('#block'), selected = filter.value;
    filter.replaceChildren(); const all = text('option', 'Alle Blöcke', filter); all.value = '';
    const blocks = new Map((last?.seats || []).map(x => [String(x.blockId), x.block]));
    for (const [id, name] of blocks) { const option = text('option', decode(name), filter); option.value = id; }
    filter.value = blocks.has(selected) ? selected : '';
    const body = ui.querySelector('#seats'); body.replaceChildren();
    const added = new Set(change?.added.map(x => x.id) || []);
    for (const seat of last?.seats || []) {
      if (filter.value && String(seat.blockId) !== filter.value) continue;
      const row = document.createElement('tr'); row.classList.toggle('new', added.has(seat.id));
      const block = text('td', decode(seat.block), row); text('small', 'Reihe ' + decode(seat.row), block);
      text('td', String(seat.id), row); text('td', decode(seat.category), row); body.append(row);
    }
    if (!body.children.length) { const row = text('tr', '', body); const cell = text('td', last ? 'Keine freien Sitze im angezeigten Datenstand.' : 'Sitzdaten werden erwartet.', row); cell.colSpan = 3; }
    const log = ui.querySelector('#changes'); log.replaceChildren();
    if (!changes.length) text('li', 'Noch keine Änderungen erkannt. Der Ausgangsbestand löst keine Meldung aus.', log);
    for (const entry of changes) text('li', entry, log);
  }
  window.addEventListener('message', event => {
    if (!running || event.source !== window || event.origin !== location.origin || event.data?.channel !== channel) return;
    const data = event.data;
    if (data.type === 'error' || data.type === 'waiting') { error = String(data.message).slice(0, 300); render(); void maybeCart(); return; }
    if (data.type !== 'snapshot') return;
    const s = data.snapshot;
    // The page bridge never authorizes extension API calls or ticket actions.
    if (!s || !/^tixx-\d+-\d+$/.test(s.inventory) || !s.inventory.endsWith('-' + eventId(location.href)) ||
        !Number.isFinite(s.checkedAt) || s.checkedAt > Date.now() + 1000 || !Array.isArray(s.seats) || s.seats.length > 100000 ||
        s.seats.some(x => !x || !Number.isSafeInteger(x.id) || typeof x.block !== 'string' || typeof x.row !== 'string' || typeof x.category !== 'string')) return;
    try {
      const next = tracker.update(s);
      if (s.stale || (Number.isFinite(s.validUntil) && s.validUntil < Date.now())) { last = s; change = null; error = ''; render(); void maybeCart(); return; }
      if (!next) return;
      last = s; change = next; error = '';
      if (next.baseline) changes = [];
      for (const seat of next.added) changes.unshift(clock(s.checkedAt) + ' · Neu frei: Block ' + decode(seat.block) + ', Reihe ' + decode(seat.row) + ', Sitz-ID ' + seat.id);
      if (next.removed.length) changes.unshift(clock(s.checkedAt) + ' · ' + next.removed.length + ' Sitze nicht mehr als frei gemeldet.');
      changes = changes.slice(0, 100); render(); void maybeCart();
    } catch { error = 'Unvollständiger Datenstand. Der letzte gültige Stand bleibt angezeigt.'; render(); }
  });
  window.addEventListener('ticket-data-monitor-toggle', () => {
    if (host?.isConnected) { stop(); host.remove(); } else mount();
  });
  setInterval(() => { if (running) render(); }, 15000);
  window.__ticketDataMonitor = true;
})();
