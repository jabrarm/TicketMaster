importScripts('native-host.js');
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || '')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['detector.js', 'cart.js', 'zoom.js','overview.js', 'content.js'] });
  } catch (error) {
    console.error('Bereichswächter konnte nicht geöffnet werden:', error.message);
  }
});

// captureVisibleTab has a Chrome limit of two calls per second. Only capture
// the selected tab and never return a screenshot of another active tab.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab) return;
  if (['nativeConnect','nativeBegin','nativeInput','nativeEnd','nativeDisconnect'].includes(message.type)) {
    if (sender.id !== chrome.runtime.id) return;
    const tabId=sender.tab.id;
    (async()=>{
      if(message.type==='nativeConnect')return TicketNativeHost.connect(tabId);
      if(message.type==='nativeBegin')return TicketNativeHost.begin(tabId,message.connection);
      if(message.type==='nativeInput')return TicketNativeHost.input(tabId,message.connection,message.run,message.kind,message.point);
      if(message.type==='nativeEnd')return TicketNativeHost.end(tabId,message.connection,message.run);
      return TicketNativeHost.disconnect(tabId,message.connection);
    })().then(respond,error=>respond({error:error.message}));
    return true;
  }
  if (message.type !== 'capture') return;
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
