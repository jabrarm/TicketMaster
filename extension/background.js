chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    // Content scripts are not installed retroactively into already open tabs.
    // Both entry points are idempotent, so the toolbar can repair a missing setup.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'MAIN',
      files: ['availability-core.js', 'preferences.js', 'cart-flow.js', 'page-observer.js']
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
      args: ['1.1.2']
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
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || !['cartStart', 'cartStop', 'cartReload'].includes(message?.type)) return;
  const tabId = sender.tab.id;
  if (!/^https:\/\/www\.ticket-onlineshop\.com\/ols\/werderbremen-hospitality\/de\/tageskarte\/channel\/shop\/areaplan\/venue\/event\/\d+\/?(?:[?#]|$)/.test(sender.url || '')) return;
  (async () => {
    if (message.type === 'cartReload') { await chrome.tabs.reload(tabId); return { stage: 'reloading' }; }
    const results = await chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN',
      func: async (type, config, run) => {
        try {
          if (!globalThis.TicketCartFlow) throw new Error('Bitte Ticketseite neu laden und Saalplan öffnen.');
          if (type === 'cartStart' && (globalThis.TicketCartFlow.version !== '1.1.2' || globalThis.TicketDataObserver?.version !== '1.1.2' || globalThis.TicketPreferences?.version !== '1.1.2')) throw new Error('Im Ticket-Tab laufen unterschiedliche Erweiterungsversionen. Bitte die Ticketseite vollständig neu laden und den Saalplan öffnen.');
          return type === 'cartStop' ? globalThis.TicketCartFlow.cancel(run) : await globalThis.TicketCartFlow.start(config, run);
        } catch (error) { return { stage: 'error', error: error.message }; }
      },
      args: [message.type, message.config || null, message.run]
    });
    return results[0]?.result;
  })().then(respond, error => respond({ stage: 'error', error: error.message }));
  return true;
});
