(() => {
  'use strict';
  if (window.__ticketDataObserver) return;
  if (!globalThis.TicketAvailability.eventId(location.href)) return;
  window.__ticketDataObserver = true;
  const { endpoint, Inventory } = globalThis.TicketAvailability;
  const inventory = new Inventory();
  const requests = globalThis.TicketRefreshTools.createTracker();
  const channel = 'ticket-data-monitor-v1';
  let latest = null;
  globalThis.TicketDataObserver = Object.freeze({
    version: '1.4.2',
    getSnapshot: () => inventory.last ? structuredClone(inventory.last) : null,
    getError: () => latest?.type === 'error' ? latest.message : null,
    getRequestState: () => requests.state()
  });
  let sequence = 0;
  const handled = new Map();
  const fresh = target => {
    const key = target.inventory + ':' + target.kind;
    if (target.sequence < (handled.get(key) || 0)) return false;
    handled.set(key, target.sequence); return true;
  };
  const send = payload => window.postMessage({ channel, ...payload }, location.origin);
  const report = message => { latest = { type: 'error', message }; send(latest); };
  const accept = (target, data) => {
    if (!fresh(target)) return;
    try {
      const snapshot = inventory.accept(target.kind, data, target.inventory);
      if (snapshot) { globalThis.TicketCartFlow?.updateSnapshot(snapshot); latest = { type: 'snapshot', snapshot }; send(latest); }
      else if (new Set(Object.values(inventory.parts).map(x => String(x.seatmapVersion))).size > 1) report('Saalplan-Versionen passen noch nicht zusammen. Warte auf Shopdaten.');
    } catch (error) { report(error.message); }
  };
  const unchanged = target => {
    if (target.kind === 'availability' && inventory.parts.availability) accept(target, inventory.parts.availability);
  };
  const receive = async (target, response) => {
    try {
      if (response.status === 304) { unchanged(target); return; }
      if (!response.ok) { if (fresh(target)) report('Shopdaten konnten nicht geladen werden (HTTP ' + response.status + ').'); return; }
      const text = await response.text();
      if (text.length > 8000000) throw new Error('Saalplan-Daten überschreiten das unterstützte Format.');
      accept(target, JSON.parse(text));
    } catch { if (fresh(target)) report('Shopantwort konnte nicht als Sitzdaten gelesen werden.'); }
    finally { requests.end(target, response.status, response.headers.get('Retry-After')); }
  };
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const target = endpoint(typeof args[0] === 'string' || args[0] instanceof URL ? String(args[0]) : args[0]?.url, location.href);
    if (target) { target.sequence = ++sequence; requests.begin(target); }
    let result;
    try { result = Reflect.apply(originalFetch, this, args); }
    catch (error) { if (target) requests.end(target, 0); throw error; }
    if (target) result.then(response => {
      try { void receive(target, response.clone()); }
      catch { requests.end(target, 0); if (fresh(target)) report('Shopantwort konnte nicht gelesen werden.'); }
    }, () => { requests.end(target, 0); if (fresh(target)) report('Netzwerkfehler beim Laden der Shopdaten.'); });
    return result;
  };
  const originalOpen = XMLHttpRequest.prototype.open, originalSend = XMLHttpRequest.prototype.send;
  const targets = new WeakMap();
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const result = Reflect.apply(originalOpen, this, [method, url, ...rest]);
    targets.set(this, endpoint(String(url), location.href)); return result;
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const target = targets.get(this);
    if (target) { target.sequence = ++sequence; requests.begin(target); }
    if (target) this.addEventListener('loadend', () => {
      try {
      if (this.status === 304) unchanged(target);
      else if (this.status < 200 || this.status >= 300) { if (fresh(target)) report('Shopdaten konnten nicht geladen werden (HTTP ' + this.status + ').'); }
      else {
        try {
          const data = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
          accept(target, data);
        } catch { if (fresh(target)) report('Shopantwort konnte nicht als Sitzdaten gelesen werden.'); }
      }
      } finally { requests.end(target, this.status, this.status >= 400 ? this.getResponseHeader('Retry-After') : null); }
    }, { once: true });
    try { return Reflect.apply(originalSend, this, args); }
    catch (error) { if (target) requests.end(target, 0); throw error; }
  };
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.channel !== channel || event.data.type !== 'request') return;
    if (latest?.type === 'snapshot') send({ ...latest, snapshot: { ...latest.snapshot,
      stale: latest.snapshot.stale || (Number.isFinite(latest.snapshot.validUntil) && latest.snapshot.validUntil < Date.now()) } });
    else if (latest) send(latest);
    else send({ type: 'waiting', message: 'Warte auf Saalplan-Daten. Öffne „Jetzt Plätze auswählen“. Falls nötig, lade die Ticketseite neu.' });
  });
})();
