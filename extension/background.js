importScripts('availability-core.js', 'cart-session.js');
let goalStore;
const goals = () => goalStore ||= new TicketGoalSessions.Sessions({
  read: async key => (await chrome.storage.session.get(key))[key] || null,
  write: async (key, value) => chrome.storage.session.set({ [key]: value })
});
async function invokeCart(tabId, operation, config, run, secured = []) {
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN',
    func: async (operation, config, run, secured) => {
      try {
        if (operation === 'cancel') return globalThis.TicketCartFlow?.cancel(run) || { stage: 'stopped' };
        if (globalThis.TicketCartFlow?.version !== '1.3.0' || globalThis.TicketDataObserver?.version !== '1.3.0' || globalThis.TicketPreferences?.version !== '1.3.0') throw new Error('Bitte die Ticketseite vollständig neu laden und den Saalplan öffnen.');
        if (operation === 'validate') { globalThis.TicketPreferences.validate(config); return { config: { quantity: config.quantity, adjacent: config.adjacent, groups: config.groups } }; }
        if (operation === 'baseline') return await globalThis.TicketCartReceipt.baseline();
        if (operation === 'open') { if (typeof sms !== 'undefined' && !sms.isSeatmapLoaded()) document.querySelector('#choose-seat-button')?.click(); return { stage: 'opened' }; }
        if (operation === 'prepare') return await globalThis.TicketCartFlow.prepare(config, run, secured);
        if (operation === 'submit') return globalThis.TicketCartFlow.submit(run);
        if (operation === 'start') return await globalThis.TicketCartFlow.start(config, run);
        throw new Error('Unbekannter Warenkorbschritt.');
      } catch (error) { return { stage: 'error', error: error.message }; }
    }, args: [operation, config || null, run || null, secured]
  });
  const result = injection?.result;
  if (!result) throw new Error('Die Antwort des Shop-Tabs fehlt. Bitte den Warenkorb prüfen.');
  return result;
}
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    // Content scripts are not installed retroactively into already open tabs.
    // Both entry points are idempotent, so the toolbar can repair a missing setup.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'MAIN',
      files: ['availability-core.js', 'preferences.js', 'cart-receipt.js', 'cart-flow.js', 'page-observer.js']
    });
    const [inspection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'MAIN',
      func: expected => ({
        requiresReload: Boolean(globalThis.TicketAvailability.eventId(location.href)) &&
          (globalThis.TicketCartFlow?.version !== expected || globalThis.TicketDataObserver?.version !== expected || globalThis.TicketPreferences?.version !== expected),
        expected,
        flow: globalThis.TicketCartFlow?.version || 'ältere Version',
        observer: globalThis.TicketDataObserver?.version || 'ältere Version'
      }),
      args: ['1.3.0']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'ISOLATED',
      files: ['availability-core.js', 'preferences.js', 'preferences-ui.js', 'monitor.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'ISOLATED',
      func: status => {
        if (status?.requiresReload) {
          document.getElementById('ticket-data-monitor')?.remove();
          document.getElementById('ticket-update-notice')?.remove();
          const host = document.createElement('div'); host.id = 'ticket-update-notice';
          host.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2147483647;width:min(440px,calc(100vw - 40px))';
          const root = host.attachShadow({ mode: 'open' });
          const box = document.createElement('section'); box.style.cssText = 'font:15px/1.5 system-ui;background:#12261f;color:#eaf1ed;padding:22px;border:1px solid #638472;border-radius:14px;box-shadow:0 12px 60px #0007';
          const title = document.createElement('strong'); title.textContent = 'Update erkannt – Ticketseite neu laden';
          const message = document.createElement('p'); message.textContent = 'In diesem Tab läuft noch älterer Auswahlcode. Das Erweiterungsupdate allein ersetzt ihn nicht. Lade die Ticketseite neu, öffne den Saalplan und starte danach die Automatik. Deine Präferenzen bleiben gespeichert.';
          const button = document.createElement('button'); button.textContent = 'Ticketseite neu laden';
          button.style.cssText = 'font:inherit;padding:10px 15px;border:0;border-radius:8px;background:#b5e5ba;color:#12261f;cursor:pointer';
          button.onclick = async () => {
            button.disabled = true;
            try { const result = await chrome.runtime.sendMessage({ type: 'cartReload' }); if (result?.error) throw new Error(result.error); }
            catch (error) { message.textContent = 'Bitte die Ticketseite über den normalen Neu-laden-Knopf des Browsers neu laden. ' + error.message; button.disabled = false; }
          };
          box.append(title, message, button); root.append(box); (document.body || document.documentElement).append(host); return;
        }
        if (!window.__ticketDataMonitor) throw new Error('Das Monitor-Skript konnte nicht initialisiert werden.');
        window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle'));
      },
      args: [inspection?.result]
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Ticket-Verfügbarkeit öffnen / schließen' });
  } catch (error) {
    console.error('Ticket-Verfügbarkeit konnte nicht geöffnet werden:', error.message);
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#a63524' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Monitor konnte nicht geöffnet werden: ' + error.message });
  }
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || !['cartStart', 'cartStop', 'cartReload', 'goalBegin', 'goalGet', 'goalStop', 'goalReceipt', 'goalOpen'].includes(message?.type)) return;
  const tabId = sender.tab.id;
  let url; try { url = new URL(sender.url); } catch { return; }
  if (url.origin !== 'https://www.ticket-onlineshop.com') return;
  const context = TicketAvailability.shop(url.href), eventPage = context?.type === 'event', cartPage = context?.type === 'cart';
  if (!eventPage && !cartPage) return;
  if (['cartStart', 'cartStop', 'cartReload', 'goalBegin', 'goalOpen'].includes(message.type) && !eventPage) return;
  (async () => {
    if (message.type === 'cartReload') { await chrome.tabs.reload(tabId); return { stage: 'reloading' }; }
    if (message.type === 'goalBegin') {
      const checked = await invokeCart(tabId, 'validate', message.config);
      if (checked.error) throw new Error(checked.error);
      return { goal: await goals().begin(tabId, crypto.randomUUID(), checked.config, context.eventUrl) };
    }
    const goal = ['goalGet', 'goalStop', 'goalReceipt', 'goalOpen'].includes(message.type) || message.goalId ? await goals().get(tabId) : null;
    if (goal && TicketAvailability.shop(goal.eventUrl)?.baseUrl !== context.baseUrl) throw new Error('Diese Ticketsuche gehört zu einem anderen Shop. Bitte die bisherige Suche in ihrem Tab stoppen.');
    if (goal && eventPage && goal.eventUrl !== context.eventUrl) throw new Error('Diese Ticketsuche gehört zu einer anderen Veranstaltung. Bitte einen neuen Tab verwenden.');
    if (message.type === 'goalGet') return { goal };
    if (['goalStop', 'goalReceipt', 'goalOpen'].includes(message.type) && (!goal || goal.id !== message.goalId)) throw new Error('Die Ticketsuche ist nicht mehr aktiv.');
    if (message.type === 'goalStop') {
      const stopped = await goals().stop(tabId, goal.id);
      if (eventPage && goal.pending?.run) await invokeCart(tabId, 'cancel', null, goal.pending.run).catch(() => {});
      return { goal: stopped };
    }
    if (message.type === 'goalReceipt') {
      if (!cartPage) throw new Error('Die Warenkorbbestätigung muss auf der Warenkorbseite erfolgen.');
      const confirmed = await goals().confirm(tabId, goal.id, message.receipt);
      if (confirmed.status === 'watching') await chrome.tabs.update(tabId, { url: confirmed.eventUrl });
      return { goal: confirmed };
    }
    if (message.type === 'goalOpen') {
      if (goal.status !== 'watching') return { goal };
      return await invokeCart(tabId, 'open');
    }
    if (message.type === 'cartStop') return await invokeCart(tabId, 'cancel', null, message.run);
    if (!message.goalId) return await invokeCart(tabId, 'start', message.config, message.run);
    if (!goal || goal.id !== message.goalId) throw new Error('Die Ticketsuche ist nicht mehr aktiv.');
    const baseline = await invokeCart(tabId, 'baseline');
    if (baseline.error) throw new Error(baseline.error);
    const attempt = await goals().attempt(tabId, goal.id, message.run, baseline);
    try {
      const config = { ...attempt.config, quantity: attempt.target - attempt.confirmed.length };
      const result = await invokeCart(tabId, 'prepare', config, message.run, attempt.secured);
      if (result.error) throw new Error(result.error);
      const ready = await goals().prepared(tabId, goal.id, message.run, result);
      if ((await goals().get(tabId)).status !== 'submitting') throw new Error('Suche gestoppt.');
      // Persist before the native form click: it can navigate away immediately.
      let submitted;
      try { submitted = await invokeCart(tabId, 'submit', null, message.run); }
      catch { return { stage: 'awaitingCart', count: ready.pending.count, goal: ready }; }
      if (submitted.error) throw new Error(submitted.error);
      return { ...submitted, goal: ready };
    } catch (error) {
      await goals().pause(tabId, goal.id, error.message);
      await invokeCart(tabId, 'cancel', null, message.run).catch(() => {});
      throw error;
    }
  })().then(respond, error => respond({ stage: 'error', error: error.message }));
  return true;
});
