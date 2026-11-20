(() => {
  'use strict';
  function createTracker(now = Date.now) {
    const active = new Set(); let failures = 0, retryUntil = 0, lastStatus = null, sequence = 0;
    return {
      begin(target) { active.add(target); },
      end(target, status, retryAfter) {
        if (!active.delete(target) || target.sequence < sequence) return;
        sequence = target.sequence; lastStatus = status;
        if (status === 304 || status >= 200 && status < 300) { failures = 0; retryUntil = 0; return; }
        failures++;
        const raw = String(retryAfter || '').trim();
        const delay = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) * 1000 : Date.parse(raw) - now();
        const backoff = Math.min(60000, 2000 * 2 ** Math.min(failures, 5));
        retryUntil = Math.max(retryUntil, now() + Math.max(backoff, status === 429 ? 30000 : 0, Number.isFinite(delay) ? delay : 0));
      },
      state: () => ({ active: active.size, failures, retryUntil, lastStatus })
    };
  }
  const preferences = () => typeof window === 'undefined' && typeof module !== 'undefined' && module.exports ? require('./preferences.js') : globalThis.TicketPreferences;
  function createController(env) {
    const now = env.now || Date.now, schedule = env.schedule || setTimeout, unschedule = env.unschedule || clearTimeout;
    let running = false, seconds = 20, timer = null, bound = null, original = null, wrapper = null, owned = false, busy = false, nextAllowed = 0, lastStarted = null, retryAt = 0, revision = -Infinity;
    const acceptRevision = value => {
      if (value === undefined) return true;
      if (!Number.isFinite(value)) throw new Error('Ungültige Aktualisierungssitzung.');
      if (value < revision) return false;
      revision = value; return true;
    };
    let lastMessage;
    const emit = message => {
      if (message === lastMessage) return;
      lastMessage = message;
      env.emit?.({ running, seconds, message });
    };
    const displaySeconds = () => String(seconds).replace('.', ',');
    function detach() {
      if (bound?.refreshAvailability === wrapper) {
        if (owned) bound.refreshAvailability = original; else delete bound.refreshAvailability;
      }
      bound = original = wrapper = null;
    }
    function attach(client) {
      if (client === bound && client.refreshAvailability === wrapper) return;
      detach(); bound = client; original = client.refreshAvailability;
      owned = Object.prototype.hasOwnProperty.call(client, 'refreshAvailability');
      wrapper = function (...args) { return trigger(args); }; client.refreshAvailability = wrapper;
    }
    async function trigger(args = []) {
      if (!running) return;
      const client = env.client();
      if (!client?.isSeatmapLoaded?.() || typeof client.refreshAvailability !== 'function') { emit('Warte auf den vollständig geladenen Saalplan.'); return; }
      attach(client);
      const state = env.state();
      const blockedUntil = Math.max(state.retryUntil || 0, retryAt);
      if (blockedUntil > now()) { emit('Shop-Pause: Nächster Versuch frühestens ' + new Date(blockedUntil).toLocaleTimeString('de-DE') + '.'); return; }
      if (busy || state.active > 0 || env.selectionBusy?.()) { emit('Eine Shopanfrage oder Platzauswahl läuft noch; keine parallele Aktualisierung.'); return; }
      if (now() < nextAllowed) return;
      lastStarted = now(); nextAllowed = lastStarted + seconds * 1000; busy = true;
      try {
        emit('Aktualisierung alle ' + displaySeconds() + ' Sekunden über den normalen Shop-Ablauf.');
        await Reflect.apply(original, bound, args);
      } catch {
        retryAt = now() + 30000; emit('Aktualisierung fehlgeschlagen; nächster Versuch frühestens in 30 Sekunden.');
      } finally { busy = false; }
    }
    function tick() {
      if (!running) return;
      timer = null; void trigger(); if (running) timer = schedule(tick, seconds * 1000);
    }
    return {
      version: '1.4.3',
      start(value, commandRevision) {
        if (!preferences().validRefreshSeconds(value)) throw new Error('Das Abfrageintervall muss in Halbschritten zwischen 0,5 und 120 Sekunden liegen.');
        if (!acceptRevision(commandRevision)) return { running, seconds };
        seconds = value; running = true;
        nextAllowed = lastStarted === null ? 0 : lastStarted + seconds * 1000;
        if (timer !== null) unschedule(timer);
        const client = env.client();
        if (client?.isSeatmapLoaded?.() && typeof client.refreshAvailability === 'function') attach(client);
        timer = schedule(tick, seconds * 1000);
        emit('Aktualisierung alle ' + displaySeconds() + ' Sekunden. Der Shop kann unveränderte Cache-Daten liefern.');
        return { running, seconds };
      },
      stop(commandRevision) { if (!acceptRevision(commandRevision)) return { running, seconds }; running = false; if (timer !== null) unschedule(timer); timer = null; detach(); emit('Zusätzliche Aktualisierung gestoppt. Der Shop aktualisiert wieder in seinem normalen Takt.'); return { running, seconds }; },
      state: () => ({ running, seconds, busy })
    };
  }
  if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) { module.exports = { createTracker, createController }; return; }
  if (globalThis.TicketRefresh) return;
  globalThis.TicketRefreshTools = { createTracker, createController };
  globalThis.TicketRefresh = createController({
    client: () => { try { return typeof sms !== 'undefined' ? sms : null; } catch { return null; } },
    state: () => globalThis.TicketDataObserver?.getRequestState?.() || { active: 1, retryUntil: 0 },
    selectionBusy: () => globalThis.TicketCartFlow?.isBusy?.() || false,
    emit: state => window.postMessage({ channel: 'ticket-data-monitor-v1', type: 'refresh-state', ...state }, location.origin)
  });
})();
