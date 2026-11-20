const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { fixture, identity, pageUrl } = require('./availability.fixture.cjs');
const source = name => fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8');
async function setup(browser, legacy) {
  const page = await browser.newPage(); const data = fixture();
  data.mapping.priceCategories[1].name = 'PK8 VIP-Rang Platin'; data.availability.expired = true;
  const html = `<!doctype html><h1>Shop</h1><form id="seatCardForm" method="post" action="/ols/werderbremen-hospitality/de/tageskarte/channel/shop/shoppingcart/addselecteditemsareas/event/674379"><ul id="seat-cards-list"></ul><button id="add-to-cart">In den Warenkorb</button></form><script>
    window.selected=[];window.cartCalls=0;
    let sms={isSeatmapLoaded:()=>true,selectById:id=>{window.selected.push({id});const li=document.createElement('li');li.dataset.seatIdentifier=id;const input=document.createElement('input');input.value=id;li.append(input);document.querySelector('#seat-cards-list').append(li);}};
    let seatSelection={getSelectedSeats:()=>window.selected,getLostSeatAmount:()=>0,options:{filterBar:{getMaxTicketsAmount:()=>6}}};
    document.querySelector('#add-to-cart').onclick=e=>{e.preventDefault();window.cartCalls++;};</script>`;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if(url.pathname.endsWith('/shoppingcart'))return route.fulfill({contentType:'text/html',body:'<!doctype html><div class="empty-state">Keine Tickets</div><a id="continue-shopping-button">Weiter einkaufen</a>'});
    return url.hostname === 'www.ticket-onlineshop.com' ? route.fulfill({ contentType: 'text/html', body: html }) : route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data[url.pathname.split('/').at(-2)]) });
  });
  await page.goto(pageUrl);
  const cdp = await page.context().newCDPSession(page);
  const { frameTree } = await cdp.send('Page.getFrameTree');
  const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'TicketExtensionTest' });
  async function evaluate(expression, world = 'MAIN') {
    const result = await cdp.send('Runtime.evaluate', { expression, ...(world === 'MAIN' ? {} : { contextId: executionContextId }), awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  let click, handleMessage, reloads = 0; const commands = [], stored = {};
  const sandbox = { console, URL, crypto: globalThis.crypto, chrome: {
    storage: { session: { get: async key => ({ [key]: structuredClone(stored[key]) }), set: async data => { Object.assign(stored, structuredClone(data)); } } },
    action: { onClicked: { addListener: fn => { click = fn; } }, setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    runtime: { id: 'worlds-test-extension', onMessage: { addListener: fn => { handleMessage = fn; } } },
    tabs: { reload: async id => { assert.equal(id, 19); reloads++; } },
    scripting: { executeScript: async options => {
      assert.equal(options.target.tabId, 19);
      const expression = options.files ? options.files.map(source).join('\n') : '(' + options.func.toString() + ')(...' + JSON.stringify(options.args || []) + ')';
      return [{ frameId: 0, result: await evaluate(expression, options.world) }];
    } }
  } };
  const context = vm.createContext(sandbox);
  sandbox.importScripts = (...names) => { for (const name of names) vm.runInContext(source(name), context); };
  vm.runInContext(source('background.js'), context);
  await cdp.send('Runtime.addBinding', { name: 'ticketBridgeCall', executionContextId });
  cdp.on('Runtime.bindingCalled', event => {
    if (event.name !== 'ticketBridgeCall' || event.executionContextId !== executionContextId) return;
    const { id, message } = JSON.parse(event.payload); commands.push(message.type);
    const reply = value => { void evaluate('window.__replies[' + id + '](' + JSON.stringify(value || {}) + ')', 'ISOLATED').catch(() => {}); };
    handleMessage(message, { id: 'worlds-test-extension', tab: { id: 19 }, url: pageUrl }, reply);
  });
  await evaluate(`window.__replies={};window.__nextReply=0;window.chrome={runtime:{sendMessage:message=>new Promise(resolve=>{const id=++window.__nextReply;window.__replies[id]=value=>{delete window.__replies[id];resolve(value);};window.ticketBridgeCall(JSON.stringify({id,message}));})},storage:{local:{get:async()=>({}),set:async()=>{}}}};`, 'ISOLATED');
  if (legacy) {
    // Represents the old MAIN globals left alive by an extension-only update.
    await evaluate(`window.oldStarts=0;window.__ticketDataObserver=true;window.TicketCartFlow={version:'1.1.1',start:async()=>{window.oldStarts++;throw new Error('Noch nicht genügend aktuelle, passende Plätze verfügbar.');},cancel:()=>({stage:'stopped'})};`);
  } else {
    // An unrelated page CommonJS global must not swallow extension modules.
    await evaluate('window.module = { exports: {} };');
    // Preferences UI may have been injected before its data module.
    await evaluate(source('preferences-ui.js'), 'ISOLATED');
    // The observer receives the full inventory before the cart module exists.
    await evaluate(['availability-core.js', 'preferences.js', 'refresh.js', 'page-observer.js'].map(source).join('\n'));
    for (const kind of ['seatmap', 'mapping', 'availability']) await page.evaluate(async url => (await fetch(url)).json(), `https://public-api.eventim.com/seatmap/api/public/${kind}/${identity}`);
    await page.waitForFunction(() => window.TicketDataObserver?.getSnapshot());
  }
  await click({ id: 19 });
  return { page, cdp, evaluate, commands, reloads: () => reloads };
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const old = await setup(browser, true);
    const notice = old.page.locator('#ticket-update-notice');
    assert.match(await notice.locator('strong').textContent(), /Update erkannt/);
    assert.equal(await old.page.evaluate(() => window.oldStarts), 0);
    await notice.getByRole('button', { name: 'Ticketseite neu laden' }).click();
    await old.page.waitForTimeout(100);
    assert.equal(old.reloads(), 1); assert.equal(old.commands.filter(c => c === 'cartReload').length, 1);
    assert.equal(await old.page.evaluate(() => window.cartCalls), 0);
    console.log('PASS: a mixed-version tab shows an explicit update notice; the actual background handler reloads the sender tab only on click and never invokes the obsolete controller');
    await old.page.close();

    const current = await setup(browser, false);
    assert.equal(await current.evaluate('typeof window.TicketCartFlow', 'ISOLATED'), 'undefined');
    assert.equal(await current.evaluate('typeof window.chrome.runtime', 'MAIN'), 'undefined');
    const state = await current.page.evaluate(() => window.TicketCartFlow.getState());
    assert.equal(state.hasSnapshot, true); assert.equal(state.seatCount, 2);
    const panel = current.page.locator('#ticket-data-monitor');
    await panel.getByRole('button', { name: 'Automatisch in den Warenkorb' }).click();
    await current.page.waitForFunction(() => window.cartCalls === 1);
    await current.page.waitForFunction(() => document.querySelector('#ticket-data-monitor').shadowRoot.querySelector('#cart-status').textContent.includes('bestätigte Plätze'));
    assert.deepEqual(await current.page.evaluate(() => window.selected.map(s => s.id)), ['s1001']);
    assert.equal(await current.page.evaluate(() => window.TicketRefresh.state().running), true);
    assert.equal(current.commands.filter(c => c === 'cartStart').length, 1);
    console.log('PASS: real MAIN and ISOLATED worlds exchange messages through the actual background handler; early UI injection and a page CommonJS global do not block initialization or confirmed selection');
    await current.page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
