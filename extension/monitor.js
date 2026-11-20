(() => {
  'use strict';
  if (window.__ticketDataMonitor || !globalThis.TicketPreferences || !globalThis.TicketAvailability ||
      !globalThis.TicketPreferencePanel) return;
  const channel = 'ticket-data-monitor-v1', { Tracker, eventId } = globalThis.TicketAvailability;
  const tracker = new Tracker();
  const blockOrder = new Intl.Collator('de', { numeric: true });
  let sortedSnapshot, sortedSeats = [];
  let host, ui, running = false, last = null, change = null, error = '', changes = [];
  let preferences, config = globalThis.TicketPreferences.defaults(), armed = false, inFlight = false, runId = null, cartMessage = '', submitted = false;
  let goal = null, actionEpoch = 0, deferredSnapshot = null;
  let refreshMessage = '', refreshRevision = 0, renderFrame = null;
  let session = null, sessionCheck = null, checkedSessionAt = 0, sessionBusy = false;
  const sessionBlocked = state => state?.state === 'loggedOut' || state?.state === 'queue';
  const sessionLabels = {
    loggedIn: 'Anmeldung vom Shop bestätigt.',
    loggedOut: 'Abgemeldet. Bitte im Shop anmelden, anschließend erneut prüfen und die Suche starten.',
    queue: 'Shop-Warteschlange. Bitte im Shop warten, anschließend erneut prüfen und die Suche starten.',
    unknown: 'Anmeldung konnte nicht geprüft werden. Bitte den Kontostatus im Shop prüfen.'
  };
  function applySession(result) {
    if (!result || result.checkedAt < (session?.checkedAt || 0)) return;
    if (result.state !== 'unknown' || !sessionBlocked(session)) session = result;
    if (sessionBlocked(session) && (running || armed || inFlight)) stop(sessionLabels[session.state]);
    else queueRender();
  }
  function checkSession(force = false) {
    if (sessionCheck) return sessionCheck;
    if ((!force && Date.now() - checkedSessionAt < 20000) || !globalThis.chrome?.runtime?.sendMessage) return;
    checkedSessionAt = Date.now();
    sessionBusy = true; queueRender();
    sessionCheck = chrome.runtime.sendMessage({ type: 'sessionCheck' })
      .then(result => applySession(result?.session || { state: 'unknown', checkedAt: Date.now() }))
      .catch(() => applySession({ state: 'unknown', checkedAt: Date.now() }))
      .finally(() => { sessionBusy = false; sessionCheck = null; queueRender(); });
    return sessionCheck;
  }
  function queueRender() {
    if (renderFrame !== null) return;
    renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); });
  }
  const refreshCommand = () => ({ documentToken: performance.timeOrigin, revision: refreshRevision = Math.max(refreshRevision + 1, performance.now()) });
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
      <p id="session-status" role="status" aria-live="polite"></p><div class="controls"><button id="session-check">Anmeldung prüfen</button><button id="sound-test">Warenkorbton testen</button></div>
      <p id="sound-status" class="muted" role="status"></p>
      <p id="status" class="status" role="status" aria-live="polite"></p><p id="checked" class="muted"></p><p id="refresh-status" class="muted" role="status"></p>
      <div id="preferences"></div><p class="muted">Verfügbare Einzeltickets werden sofort übernommen. Danach wird nur die noch fehlende Anzahl gesucht. Die Reservierungsfrist des Shops läuft dabei weiter.</p><p id="goal-progress" role="status"></p><p id="handoff-timing" class="muted"></p><button id="auto">Automatisch in den Warenkorb</button><p id="cart-status" role="status" aria-live="polite">Automatik ist ausgeschaltet. Erst Anzahl und Präferenzen einstellen.</p>
      <div><span id="count" class="count">–</span> <span id="count-label">gemeldete freie Sitze</span></div>
      <label>Block <select id="block" aria-label="Block filtern"><option value="">Alle Blöcke</option></select></label>
      <table><thead><tr><th>Block / Reihe</th><th>Sitz-ID</th><th>Kategorie</th></tr></thead><tbody id="seats"></tbody></table>
      <h2>Änderungen seit dem Start</h2><ul id="changes"></ul>
      <p class="muted footer">Die Erweiterung beobachtet die vom geöffneten Shop geladenen Daten. Aktualisierungen hängen vom Shop ab. Sitz-IDs sind keine Sitznummern. Stehplatzkontingente sind nicht enthalten. Eine Reservierung ist erst nach Bestätigung des Shops gesichert.</p>
    </main></section>`;
    (document.body || document.documentElement).append(host);
    ui.querySelector('.close').onclick = () => { stop(); host.remove(); };
    ui.querySelector('#start').onclick = () => start();
    ui.querySelector('#stop').onclick = () => stop();
    ui.querySelector('#session-check').onclick = () => void checkSession(true);
    const soundTest = ui.querySelector('#sound-test'), soundStatus = ui.querySelector('#sound-status');
    soundTest.onclick = async () => {
      soundTest.disabled = true;
      soundStatus.textContent = 'Warenkorbton wird getestet …';
      try {
        const result = await chrome.runtime.sendMessage({ type: 'soundTest' });
        if (!result?.playing) throw new Error(result?.error || 'Keine Antwort von der Tonausgabe.');
        soundStatus.textContent = 'Chrome hat die Wiedergabe gestartet.';
      } catch (error) { soundStatus.textContent = 'Ton fehlgeschlagen. ' + error.message; }
      finally { soundTest.disabled = false; }
    };
    ui.querySelector('#block').onchange = render;
    preferences = globalThis.TicketPreferencePanel.create(ui.querySelector('#preferences'), value => {
      const interval = config.refreshSeconds ?? 20; config = value;
      if (running && interval !== (config.refreshSeconds ?? 20)) updateRefresh();
      render();
    });
    config = preferences.get();
    preferences.lock(armed || inFlight);
    ui.querySelector('#auto').onclick = async () => {
      if (submitted || armed || inFlight || sessionBlocked(session)) return;
      const epoch = ++actionEpoch;
      config = preferences.get();
      try { globalThis.TicketPreferences.validate(config); if (config.selectionMode !== 'first' && !globalThis.TicketPreferences.rank(config).size) throw new Error('Bitte mindestens eine Unterkategorie auswählen.'); }
      catch (e) { cartMessage = e.message; render(); return; }
      inFlight = true; preferences.lock(true); render();
      try {
        const started = await chrome.runtime.sendMessage({ type: 'goalBegin', config });
        if (!started?.goal) throw new Error(started?.error || 'Die Suche konnte nicht gespeichert werden.');
        if (epoch !== actionEpoch) { await chrome.runtime.sendMessage({ type: 'goalStop', goalId: started.goal.id }); inFlight = false; preferences.lock(false); render(); return; }
        goal = started.goal;
        if (goal.status === 'completed') { submitted = true; inFlight = false; armed = false; preferences.lock(false); cartMessage = 'Die gewünschte Ticketanzahl ist bereits im Warenkorb bestätigt.'; render(); return; }
        if (!running) start();
        armed = true; runId = null; inFlight = false; deferredSnapshot = null;
        cartMessage = 'Suche nach ' + config.quantity + ' Tickets gestartet. Auch einzelne passende Angebote werden sofort im Shop geprüft.';
        void maybeCart(); queueRender();
      } catch (e) { inFlight = false; preferences.lock(false); cartMessage = e.message; render(); }
    };
    render();
  }
  function start() {
    if (sessionBlocked(session)) return;
    tracker.reset(); last = null; change = null; error = ''; changes = []; running = true;
    render(); window.postMessage({ channel, type: 'request' }, location.origin);
    updateRefresh(true);
    void checkSession();
  }
  function updateRefresh(openMap = false) {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    void chrome.runtime.sendMessage({ type: 'refreshStart', seconds: config.refreshSeconds ?? 20, openMap, ...refreshCommand() }).then(result => {
      if (result?.error) { refreshMessage = 'Aktualisierung konnte nicht gestartet werden: ' + result.error; render(); }
    }).catch(e => { refreshMessage = 'Aktualisierung nicht bestätigt: ' + e.message; render(); });
  }
  function stop(reason) {
    actionEpoch++;
    running = false; armed = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) void chrome.runtime.sendMessage({ type: 'refreshStop', ...refreshCommand() }).catch(() => {});
    refreshMessage = 'Zusätzliche Aktualisierung gestoppt. Der normale Shop-Takt bleibt bestehen.';
    if (goal && typeof chrome !== 'undefined') {
      void chrome.runtime.sendMessage({ type: 'goalStop', goalId: goal.id }).then(result => { if (result?.goal) goal = result.goal; }).catch(() => {});
      cartMessage = 'Suche gestoppt. Bereits hinzugefügte Tickets bleiben im Warenkorb.';
    }
    if (inFlight && typeof chrome !== 'undefined') {
      chrome.runtime.sendMessage({ type: 'cartStop', run: runId }).catch(() => {});
      cartMessage = 'Stoppen angefordert. Bereits ausgewählte Plätze bitte im Shop prüfen.';
    }
    if (reason) cartMessage = reason;
    if (!inFlight) preferences?.lock(false);
    render();
  }
  async function maybeCart() {
    if (!armed || inFlight || !running || sessionBlocked(session) || (last && last === deferredSnapshot)) return;
    if (!last || error) { cartMessage = error ? 'Automatik wartet: ' + error : 'Automatik wartet auf die Sitzangebote des Shops.'; render(); return; }
    const remaining = goal ? goal.target - goal.confirmed.length : config.quantity;
    if (remaining < 1 || !globalThis.TicketPreferences.hasCandidate(last, config, goal?.secured)) {
      const tooOld = Date.now() - last.checkedAt > 120000;
      cartMessage = tooOld ? 'Automatik wartet: Seit über zwei Minuten keine Shopantwort. Warte auf die nächste Aktualisierung.' : 'Automatik wartet auf die noch fehlenden ' + remaining + ' Tickets. Bereits im Warenkorb bestätigte Plätze werden nicht erneut gewählt.';
      queueRender(); return;
    }
    const currentRun = crypto.randomUUID(), offerSnapshot = last, epoch = actionEpoch;
    runId = currentRun;
    let keepWatching = false;
    inFlight = true;
    cartMessage = 'Der Shop prüft passende Sitzangebote. Warenkorbübergabe erst nach bestätigter Platzwahl …';
    queueRender();
    try {
      const result = await chrome.runtime.sendMessage({ type: 'cartStart', run: currentRun, config, goalId: goal?.id });
      if (epoch !== actionEpoch) return;
      if (result?.stage === 'waiting' && (!result.goal || result.goal.status === 'watching')) {
        if (result.goal) goal = result.goal;
        deferredSnapshot = offerSnapshot;
        cartMessage = result.message;
        keepWatching = true;
        return;
      }
      if (result?.session) {
        applySession(result.session);
        return;
      }
      if (!['submitted', 'awaitingCart'].includes(result?.stage)) throw new Error(result?.error || 'Die Übergabe wurde nicht bestätigt. Bitte Auswahl und Warenkorb im Shop prüfen.');
      if (result.goal) goal = result.goal;
      submitted = true; cartMessage = result.count + ' bestätigte Plätze an den Warenkorbablauf des Shops übergeben. Erst die Warenkorbseite bestätigt den Fortschritt; danach wird nur die Restmenge gesucht.';
    } catch (e) {
      if (epoch === actionEpoch) cartMessage = 'Automatik angehalten: ' + e.message + ' Kein automatischer Wiederholungsversuch.';
    } finally {
      if (!keepWatching) { armed = false; preferences?.lock(false); }
      inFlight = false;
      if (keepWatching && last !== offerSnapshot && !error && globalThis.TicketPreferences.hasCandidate(last, config, goal?.secured)) void maybeCart();
      queueRender();
    }
  }
  function render() {
    if (!ui || !host.isConnected) return;
    const supported = Boolean(eventId(location.href)), blocked = sessionBlocked(session);
    ui.querySelector('#start').disabled = running || blocked || !supported; ui.querySelector('#stop').disabled = !running;
    ui.querySelector('#auto').disabled = armed || inFlight || submitted || blocked || !supported;
    const sessionStatus = ui.querySelector('#session-status');
    sessionStatus.classList.toggle('error', blocked);
    sessionStatus.textContent = supported ? (session ? sessionLabels[session.state] + ' · ' + clock(session.checkedAt) : 'Anmeldung noch nicht geprüft.') : '';
    ui.querySelector('#session-check').hidden = !supported;
    ui.querySelector('#sound-test').hidden = !supported;
    ui.querySelector('#session-check').disabled = sessionBusy;
    ui.querySelector('#cart-status').textContent = cartMessage || 'Automatik ist ausgeschaltet. Erst Anzahl und Präferenzen einstellen.';
    ui.querySelector('#refresh-status').textContent = refreshMessage;
    ui.querySelector('#goal-progress').textContent = goal ? goal.confirmed.length + ' / ' + goal.target + ' Tickets zuletzt im Warenkorb bestätigt.' : '';
    ui.querySelector('#handoff-timing').textContent = globalThis.TicketAvailability.formatTimings(goal?.timings);
    preferences?.snapshot(last);
    const status = ui.querySelector('#status');
    const stale = last && Date.now() - last.checkedAt > 120000;
    const expired = last?.stale || (last && Number.isFinite(last.validUntil) && last.validUntil < Date.now());
    status.classList.toggle('error', Boolean(error || stale || expired));
    status.textContent = !eventId(location.href) ? 'Diese Seite wird noch nicht unterstützt. Öffne mit „Jetzt Plätze auswählen“ den Saalplan im regulären Werder-Einzelkartenshop oder im Werder-Hospitality-Shop. Unterstützt werden deren Adressen mit /areaplan/venue/event/<ID>.'
      : !running ? 'Gestoppt. Mit „Überwachung starten“ einen neuen Ausgangsbestand erfassen.'
      : error || (stale ? 'Seit über zwei Minuten wurde keine Sitzliste empfangen. Die Automatik wartet auf die nächste Shopantwort.'
        : expired ? 'Der Shop meldet einen abgelaufenen Listenstand. Die Automatik prüft passende Sitzangebote über die normale Platzwahl.'
        : !last ? 'Warte auf Shopdaten. Öffne den Saalplan; falls nötig, lade die Ticketseite neu.'
          : change?.baseline ? 'Ausgangsbestand erfasst. Warte auf die nächste Aktualisierung des Shops.'
            : change?.unchanged ? 'Shopantwort empfangen. Der Zeitstempel und die freien Sitzplätze sind unverändert.'
            : `Shopdaten aktualisiert · ${change?.added.length || 0} neu frei · ${change?.removed.length || 0} nicht mehr frei.`);
    ui.querySelector('#checked').textContent = last ? 'Letzter bestätigter Datenempfang: ' + clock(last.checkedAt) : 'Noch kein bestätigter Datenstand.';
    ui.querySelector('#count').textContent = last ? String(last.seats.length) : '–';
    ui.querySelector('#count-label').textContent = expired || stale ? 'Sitzangebote aus der zuletzt empfangenen Shop-Liste' : 'gemeldete freie Sitze';
    const filter = ui.querySelector('#block'), selected = filter.value;
    filter.replaceChildren(); const all = text('option', 'Alle Blöcke', filter); all.value = '';
    if (last !== sortedSnapshot) {
      sortedSnapshot = last;
      sortedSeats = last ? [...last.seats].sort((a, b) => blockOrder.compare(a.block, b.block) || a.id - b.id) : [];
    }
    const blocks = new Map(sortedSeats.map(x => [String(x.blockId), x.block]));
    for (const [id, name] of blocks) { const option = text('option', decode(name), filter); option.value = id; }
    filter.value = blocks.has(selected) ? selected : '';
    const body = ui.querySelector('#seats'); body.replaceChildren();
    const added = new Set(change?.added.map(x => x.id) || []);
    for (const seat of sortedSeats) {
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
    if (data.type === 'refresh-state') {
      const message = String(data.message || '').slice(0, 300);
      if (message !== refreshMessage) { refreshMessage = message; ui.querySelector('#refresh-status').textContent = message; }
      return;
    }
    if (data.type === 'error' || data.type === 'waiting') { error = String(data.message).slice(0, 300); render(); void maybeCart(); return; }
    if (data.type !== 'snapshot') return;
    const s = data.snapshot;
    // The controller verifies Shop data independently before selecting tickets.
    if (!s || !/^tixx-\d+-\d+$/.test(s.inventory) || !s.inventory.endsWith('-' + eventId(location.href)) ||
        !Number.isFinite(s.checkedAt) || s.checkedAt > Date.now() + 1000 || !Array.isArray(s.seats) || s.seats.length > 100000 ||
        s.seats.some(x => !x || !Number.isSafeInteger(x.id) || typeof x.block !== 'string' || typeof x.row !== 'string' || typeof x.category !== 'string')) return;
    try {
      const next = tracker.update(s);
      if (s.stale || (Number.isFinite(s.validUntil) && s.validUntil < Date.now())) { last = s; change = null; error = ''; void maybeCart(); queueRender(); return; }
      if (!next) return;
      const unchanged = last && last.version === s.version && last.timestamp === s.timestamp && !next.added.length && !next.removed.length;
      last = s; change = { ...next, unchanged }; error = '';
      void maybeCart();
      if (next.added.length && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) void chrome.runtime.sendMessage({ type: 'availabilityPing' }).catch(() => {});
      if (next.baseline) changes = [];
      const received = clock(s.checkedAt);
      const entries = next.added.slice(-100).reverse().map(seat => received + ' · Neu frei: Block ' + decode(seat.block) + ', Reihe ' + decode(seat.row) + ', Sitz-ID ' + seat.id);
      if (next.removed.length) entries.unshift(received + ' · ' + next.removed.length + ' Sitze nicht mehr als frei gemeldet.');
      changes = entries.concat(changes).slice(0, 100);
      queueRender();
    } catch { error = 'Unvollständiger Datenstand. Der letzte gültige Stand bleibt angezeigt.'; render(); }
  });
  window.addEventListener('ticket-data-monitor-toggle', () => {
    if (host?.isConnected) { stop(); host.remove(); } else mount();
  });
  setInterval(() => { if (running) render(); }, 15000);
  setInterval(() => { if (running) void checkSession(); }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (running && !document.hidden) void checkSession();
  });
  window.__ticketDataMonitor = true;
  async function resumeGoal() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage || !eventId(location.href)) return;
    const epoch = actionEpoch;
    const result = await chrome.runtime.sendMessage({ type: 'goalGet' });
    if (epoch !== actionEpoch) return;
    if (!result?.goal) return;
    goal = result.goal; mount(); config = goal.config; preferences.set(config);
    if (goal.status === 'watching') {
      start(); armed = true; preferences.lock(true); cartMessage = goal.confirmed.length + ' von ' + goal.target + ' Tickets bestätigt. Suche wird für die Restmenge fortgesetzt.';
      void maybeCart(); queueRender();
    } else { cartMessage = goal.message || 'Warenkorbübergabe noch unbestätigt. Bitte den Warenkorb prüfen; kein automatischer Wiederholungsversuch.'; submitted = goal.status === 'completed' || Boolean(goal.pending); render(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void resumeGoal().catch(() => {}); }, { once: true });
  else void resumeGoal().catch(() => {});
})();
