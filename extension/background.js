chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    // Content scripts are not installed retroactively into already open tabs.
    // Both entry points are idempotent, so the toolbar can repair a missing setup.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'MAIN',
      files: ['availability-core.js', 'page-observer.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, world: 'ISOLATED',
      files: ['availability-core.js', 'monitor.js']
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
