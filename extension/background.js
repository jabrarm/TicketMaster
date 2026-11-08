chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle'))
    });
  } catch (error) {
    console.error('Ticket-Verfügbarkeit konnte nicht geöffnet werden:', error.message);
  }
});
