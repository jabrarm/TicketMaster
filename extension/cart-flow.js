(() => {
  'use strict';
  function createController(env) {
    let snapshot = null, active = null;
    const used = new Set(), cancelled = new Set();
    const wait = env.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const now = env.now || Date.now;
    const currentSnapshot = () => env.snapshot ? env.snapshot() : snapshot;
    const check = run => { if (run.cancelled || active !== run) throw new Error('Automatik gestoppt. Bereits ausgewählte Plätze bitte im Shop prüfen.'); };
    const ids = selection => selection.map(s => String(s.id));
    const exact = (actual, expected) => actual.length === expected.length && actual.every(id => expected.includes(id));
    async function until(run, predicate) {
      const end = now() + (env.timeout || 15000);
      while (now() < end) { check(run); if (predicate()) return; await wait(75); }
      throw new Error('Der Shop hat die Platzauswahl nicht rechtzeitig bestätigt. Auswahl und Shopfilter bitte prüfen; es wird nichts zum Warenkorb hinzugefügt.');
    }
    const api = {
      version: '1.4.0',
      isBusy: () => Boolean(active),
      updateSnapshot(value) { snapshot = value; },
      getState() {
        const current = currentSnapshot();
        return { version: '1.4.0', hasSnapshot: Boolean(current), inventory: current?.inventory || null,
          seatCount: current?.seats?.length || 0, ageSeconds: current ? Math.round((now() - current.checkedAt) / 1000) : null };
      },
      cancel(runId) { cancelled.add(runId); if (active && active.id === runId) { active.cancelled = true; if (active.prepared) active = null; } return { stage: 'stopped' }; },
      async prepare(config, runId, secured = []) {
        if (typeof runId !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(runId)) throw new Error('Ungültige Automatik-Sitzung.');
        if (cancelled.has(runId)) throw new Error('Diese Automatik-Sitzung wurde bereits gestoppt.');
        if (active || used.has(runId)) throw new Error('Ein Warenkorblauf ist bereits aktiv oder wurde schon ausgeführt.');
        const prefs = env.preferences(); prefs.validate(config);
        snapshot = currentSnapshot();
        if (!snapshot) throw new Error('Im Auswahlmodul fehlen die Sitzdaten. Bitte die Ticketseite neu laden und den Saalplan öffnen.');
        if (env.dataError?.()) throw new Error('Die Shopdaten konnten nicht bestätigt werden: ' + env.dataError());
        if (!env.eventId() || !snapshot.inventory.endsWith('-' + env.eventId())) throw new Error('Die Ticketseite hat gewechselt.');
        if (!Number.isFinite(snapshot.checkedAt) || now() - snapshot.checkedAt > 120000) throw new Error('Der empfangene Datenstand im Auswahlmodul ist älter als zwei Minuten. Bitte den Saalplan neu laden.');
        const plan = prefs.partialCandidates(snapshot, config, config.quantity, secured, now());
        if (!plan) {
          const ranks = prefs.rank(config), matching = snapshot.seats.filter(s => ranks.has(prefs.match(s))).length;
          throw new Error('Die Auswahl findet ' + matching + ' passende Sitzangebote für ' + config.quantity + ' gewünschte Tickets. Bitte Kategorie-Häkchen und Ticketanzahl prüfen.');
        }
        const client = env.client(), selection = env.selection();
        if (!client?.isSeatmapLoaded?.() || typeof client.selectById !== 'function' || typeof selection?.getSelectedSeats !== 'function') throw new Error('Bitte zuerst den Saalplan des Shops öffnen und vollständig laden lassen.');
        if (selection.getSelectedSeats().length) throw new Error('Es sind bereits Plätze im Shop ausgewählt. Bitte diese Auswahl zuerst prüfen oder zurücksetzen.');
        const max = env.maxTickets();
        if (!Number.isInteger(max) || config.quantity > max) throw new Error('Die gewünschte Anzahl überschreitet das bestätigte Shop-Limit.');
        const form = env.form(), button = env.button();
        if (!env.validForm(form) || !button) throw new Error('Der bekannte Warenkorbablauf dieser Ticketseite wurde nicht gefunden.');
        const run = { id: runId, cancelled: false, selected: [] };
        active = run; used.add(runId);
        try {
          for (const seat of plan.seats) {
            check(run);
            snapshot = currentSnapshot();
            if (!snapshot) throw new Error('Die Shopdaten stehen nicht mehr zur Verfügung. Bitte Auswahl im Shop prüfen.');
            if (!prefs.candidates({ ...snapshot, seats: snapshot.seats.filter(s => s.id === seat.id) }, { ...config, quantity: 1 }, now())) throw new Error('Der empfangene Stand ist zu alt oder der Platz wird nicht mehr angeboten. Bereits ausgewählte Plätze bitte im Shop prüfen.');
            const expected = [...run.selected, 's' + seat.id];
            if (!exact(ids(selection.getSelectedSeats()), run.selected)) throw new Error('Die Platzauswahl wurde zwischenzeitlich verändert. Automatik angehalten.');
            client.selectById('s' + seat.id);
            await until(run, () => exact(ids(selection.getSelectedSeats()), expected) && env.cardReady('s' + seat.id));
            run.selected = expected;
          }
          check(run);
          if (!exact(ids(selection.getSelectedSeats()), run.selected) || run.selected.length !== plan.seats.length) throw new Error('Die bestätigte Ticketanzahl stimmt nicht. Kein Warenkorbklick.');
          if (selection.getLostSeatAmount?.() > 0) throw new Error('Der Shop meldet verlorene Plätze. Kein Warenkorbklick.');
          if (!env.validForm(form) || !env.buttonReady(button)) throw new Error('Der Warenkorbknopf ist nicht eindeutig verfügbar. Bitte Auswahl im Shop prüfen.');
          run.prepared = true; run.form = form; run.button = button; run.selection = selection;
          run.result = { count: run.selected.length, adjacent: plan.adjacent,
            seats: plan.seats.map(s => ({ ...s, inventory: snapshot.inventory, version: snapshot.version })) };
          return { stage: 'prepared', ...run.result };
        } catch (error) {
          throw new Error(error.message + (run.selected.length ? ' Bereits bestätigte Auswahl: ' + run.selected.length + '.' : ''));
        } finally { if (active === run && !run.prepared) active = null; }
      },
      submit(runId) {
        const run = active;
        if (!run || run.id !== runId || !run.prepared) throw new Error('Die bestätigte Teilauswahl ist nicht mehr aktiv.');
        check(run);
        try {
          if (!exact(ids(run.selection.getSelectedSeats()), run.selected) || run.selection.getLostSeatAmount?.() > 0 || !env.validForm(run.form) || !env.buttonReady(run.button)) throw new Error('Die bestätigte Platzauswahl oder der Warenkorbknopf hat sich verändert. Keine Übergabe.');
          // The background persists the pending batch before invoking this click.
          // Navigation may destroy this context; never retry an unconfirmed POST.
          run.button.click();
          return { stage: 'submitted', ...run.result };
        } finally { if (active === run) active = null; }
      },
      async start(config, runId) {
        await api.prepare(config, runId); return api.submit(runId);
      }
    };
    return api;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { createController }; return; }
  if (globalThis.TicketCartFlow) return;
  const eventId = () => globalThis.TicketAvailability.eventId(location.href);
  globalThis.TicketCartFlow = createController({
    preferences: () => globalThis.TicketPreferences,
    snapshot: () => globalThis.TicketDataObserver?.getSnapshot() || null,
    dataError: () => globalThis.TicketDataObserver?.getError(),
    eventId,
    client: () => typeof sms !== 'undefined' ? sms : null,
    selection: () => typeof seatSelection !== 'undefined' ? seatSelection : null,
    maxTickets: () => typeof seatSelection !== 'undefined' ? Number(seatSelection.options?.filterBar?.getMaxTicketsAmount?.()) : NaN,
    form: () => document.querySelector('#seatCardForm'),
    button: () => document.querySelectorAll('#add-to-cart').length === 1 ? document.querySelector('#add-to-cart') : null,
    validForm: form => {
      if (!form || form.method.toLowerCase() !== 'post') return false;
      const context = globalThis.TicketAvailability.shop(location.href);
      if (context?.type !== 'event') return false;
      const action = new URL(form.action, location.href), path = context.basePath + 'shoppingcart/addselecteditemsareas/event/' + eventId();
      return action.origin === location.origin && action.pathname === path;
    },
    cardReady: id => [...document.querySelectorAll('#seat-cards-list > li[data-seat-identifier]')].some(card => card.getAttribute('data-seat-identifier') === id && !card.classList.contains('hidden-card') && card.querySelector('input,select')),
    buttonReady: button => !button.disabled && !button.classList.contains('button--disabled') && button.getAttribute('aria-disabled') !== 'true' && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== 'hidden' && getComputedStyle(button).pointerEvents !== 'none'
  });
})();
