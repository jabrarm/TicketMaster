chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || '')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['detector.js', 'cart.js', 'content.js'] });
  } catch (error) {
    console.error('Bereichswächter konnte nicht geöffnet werden:', error.message);
  }
});

// captureVisibleTab has a Chrome limit of two calls per second. Only capture
// the selected tab and never return a screenshot of another active tab.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'capture' || !sender.tab) return;
  (async () => {
    const [active] = await chrome.tabs.query({ active: true, windowId: sender.tab.windowId });
    if (active?.id !== sender.tab.id) throw new Error('Der überwachte Tab muss sichtbar bleiben.');
    const data = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    const [after] = await chrome.tabs.query({ active: true, windowId: sender.tab.windowId });
    if (after?.id !== sender.tab.id) throw new Error('Tab während der Aufnahme gewechselt.');
    return { data };
  })().then(respond, (error) => respond({ error: error.message }));
  return true;
});
