chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    // Content scripts are not installed retroactively into already open tabs.
    // Both entry points are idempotent, so the toolbar can repair a missing setup.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'MAIN',
      files: ['availability-core.js', 'preferences.js', 'cart-flow.js', 'page-observer.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'ISOLATED',
      files: ['availability-core.js', 'preferences.js', 'preferences-ui.js', 'monitor.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'ISOLATED',
      func: () => {
        if (!window.__ticketDataMonitor) throw new Error('Das Monitor-Skript konnte nicht initialisiert werden.');
        window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle'));
      }
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
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || !['cartStart', 'cartStop'].includes(message?.type)) return;
  const tabId = sender.tab.id;
  if (!/^https:\/\/www\.ticket-onlineshop\.com\/ols\/werderbremen-hospitality\/de\/tageskarte\/channel\/shop\/areaplan\/venue\/event\/\d+\/?(?:[?#]|$)/.test(sender.url || '')) return;
  (async () => {
    const results = await chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN',
      func: async (type, config, run) => {
        try {
          if (!globalThis.TicketCartFlow) throw new Error('Bitte Ticketseite neu laden und Saalplan öffnen.');
          return type === 'cartStop' ? globalThis.TicketCartFlow.cancel(run) : await globalThis.TicketCartFlow.start(config, run);
        } catch (error) { return { stage: 'error', error: error.message }; }
      },
      args: [message.type, message.config || null, message.run]
    });
    return results[0]?.result;
  })().then(respond, error => respond({ stage: 'error', error: error.message }));
  return true;
});
