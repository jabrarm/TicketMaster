const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { fixture } = require('./availability.fixture.cjs');
const source = name => fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8');
const base = '/ols/werderbremen-hospitality/de/tageskarte/channel/shop/';
async function setup(browser, regular = false) {
  const base = regular ? '/ols/werderbremen/de/einzelkarten/channel/shop/' : '/ols/werderbremen-hospitality/de/tageskarte/channel/shop/';
  const event = regular ? '674382' : '674379', startUrl = 'https://www.ticket-onlineshop.com' + base + 'areaplan/venue/event/' + event;
  const page = await browser.newPage(), cdp = await page.context().newCDPSession(page);
  const data = fixture(), backend = { items: [], posts: [], second: false, returns: 0 };
  data.mapping.priceCategories = [{ id: 69, name: 'PK8 VIP-Rang Gold' }, { id: 70, name: 'PK8 VIP-Rang Platin' }];
  for (const part of Object.values(data)) part.seatmapId = event;
  if (regular) for (const category of data.mapping.priceCategories) category.name = 'PK1';
  const cartHtml = () => '<!doctype html><meta charset="utf-8"><title>Warenkorb</title>' + (backend.items.length ? '<ul id="seat-cards-list">' + backend.items.map((item, i) => `<li class="seat-card" data-seat-identifier="cart-${i + 1}" data-seat-id="${item}">Ticket</li>`).join('') + '</ul>' : '<div class="empty-state">Keine Tickets</div>') + '<a id="continue-shopping-button" href="' + base + 'index">Weiter einkaufen</a>';
  const eventHtml = `<!doctype html><meta charset="utf-8"><title>Test-Saalplan</title><button id="choose-seat-button">Jetzt Plätze auswählen</button>
  <form id="seatCardForm" method="post" action="${base}shoppingcart/addselecteditemsareas/event/${event}"><ul id="seat-cards-list"></ul><button id="add-to-cart" type="submit">In den Warenkorb</button></form><script>
  window.selected=[];let mapReady=false;
  const api='https://public-api.eventim.com/seatmap/api/public/';
  let sms={isSeatmapLoaded:()=>mapReady,refreshAvailability:async()=>{await(await fetch(api+'availability/tixx-1001-${event}')).json();},selectById:id=>{window.selected.push({id});const li=document.createElement('li');li.dataset.seatIdentifier=id;const input=document.createElement('input');input.type='hidden';input.name='selected';input.value=id;li.append(input);document.querySelector('#seat-cards-list').append(li);}};
  let seatSelection={getSelectedSeats:()=>window.selected,getLostSeatAmount:()=>0,options:{filterBar:{getMaxTicketsAmount:()=>6}}};
  document.querySelector('#choose-seat-button').onclick=async()=>{if(mapReady)return;for(const kind of ['seatmap','mapping','availability'])await(await fetch(api+kind+'/tixx-1001-${event}')).json();mapReady=true;};
  </script>`;
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith(base + 'shoppingcart/addselecteditemsareas')) {
      const ids = new URLSearchParams(request.postData()).getAll('selected').map(s => Number(s.replace(/^s/, '')));
      backend.posts.push(ids);
      if (!ids.length || ids.some(id => backend.items.includes(id))) return route.fulfill({ status: 400, body: 'Duplicate or empty batch' });
      // Playwright routes only the first request of an HTTP redirect chain.
      // Use a document redirect so the cart GET stays inside this fixture too.
      backend.items.push(...ids); return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><script>location.replace(' + JSON.stringify(base + 'shoppingcart') + ')</script>' });
    }
    if (url.pathname === base + 'shoppingcart') return route.fulfill({ contentType: 'text/html', body: cartHtml() });
    if (url.hostname === 'www.ticket-onlineshop.com') return route.fulfill({ contentType: 'text/html', body: eventHtml });
    const kind = url.pathname.split('/').at(-2);
    const result = kind === 'availability' ? { ...data.availability, timestamp: Date.now(), expired: true, seats: [[1001, 1], [1, backend.second ? 1 : 0], [999, 0], [1000, backend.second ? 1 : 0]] } : data[kind];
    return route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(result) });
  });
  await page.addInitScript({ content: `if(location.pathname.includes('/areaplan/venue/event/')){` + ['availability-core.js', 'preferences.js', 'cart-receipt.js', 'cart-flow.js', 'refresh.js', 'page-observer.js'].map(source).join('\n') + '\n}' });
  const stored = {}, contexts = new Map(); let currentContext, click, handleMessage, installing = Promise.resolve();
  async function evaluate(expression, contextId) {
    const r = await cdp.send('Runtime.evaluate', { expression, ...(contextId ? { contextId } : {}), awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  const sandbox = { console, URL, crypto: globalThis.crypto, chrome: {
    action: { onClicked: { addListener: f => { click = f; } }, setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
    runtime: { id: 'goal-test-extension', onMessage: { addListener: f => { handleMessage = f; } } },
    storage: { session: { get: async key => ({ [key]: structuredClone(stored[key]) }), set: async value => { Object.assign(stored, structuredClone(value)); } } },
    tabs: { reload: async () => page.reload(), update: async (id, value) => { assert.equal(id, 19); backend.returns++; await page.goto(value.url); } },
    scripting: { executeScript: async options => [{ frameId: 0, result: await evaluate(options.files ? options.files.map(source).join('\n') : '(' + options.func.toString() + ')(...' + JSON.stringify(options.args || []) + ')', options.world === 'ISOLATED' ? currentContext : undefined) }] }
  } };
  const context = vm.createContext(sandbox); sandbox.importScripts = (...names) => { for (const n of names) vm.runInContext(source(n), context); }; vm.runInContext(source('background.js'), context);
  cdp.on('Runtime.bindingCalled', event => {
    if (event.name !== 'goalBridge' || !contexts.has(event.executionContextId)) return;
    const { id, message } = JSON.parse(event.payload);
    handleMessage(message, { id: 'goal-test-extension', tab: { id: 19 }, url: contexts.get(event.executionContextId) }, value => {
      void evaluate('window.__answers[' + id + '](' + JSON.stringify(value || {}) + ')', event.executionContextId).catch(() => {});
    });
  });
  page.on('domcontentloaded', () => {
    installing = (async () => {
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'TicketGoalExtension' });
      currentContext = executionContextId; contexts.set(executionContextId, page.url());
      await cdp.send('Runtime.addBinding', { name: 'goalBridge', executionContextId });
      await evaluate(`window.__answers={};window.__n=0;window.chrome={runtime:{sendMessage:message=>new Promise(resolve=>{const id=++window.__n;window.__answers[id]=v=>{delete window.__answers[id];resolve(v);};window.goalBridge(JSON.stringify({id,message}));})},storage:{local:{get:async()=>({}),set:async()=>{}}}};`, executionContextId);
      const cart = new URL(page.url()).pathname === base + 'shoppingcart';
      await evaluate((cart ? ['availability-core.js', 'cart-receipt.js', 'cart-return.js'] : ['availability-core.js', 'preferences.js', 'preferences-ui.js', 'monitor.js']).map(source).join('\n'), executionContextId);
    })(); installing.catch(() => {});
  });
  await page.goto(startUrl); await installing;
  await page.getByRole('button', { name: 'Jetzt Plätze auswählen' }).click({ timeout: 5000 });
  await page.waitForFunction(() => window.TicketDataObserver?.getSnapshot());
  await click({ id: 19 });
  const panel = page.locator('#ticket-data-monitor');
  await panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).fill('2'); await panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).dispatchEvent('change');
  await panel.getByRole('spinbutton', { name: 'Abfrageintervall in Sekunden' }).fill('2'); await panel.getByRole('spinbutton', { name: 'Abfrageintervall in Sekunden' }).dispatchEvent('change');
  await panel.getByRole('button', { name: 'Automatisch in den Warenkorb' }).click();
  try { await page.waitForFunction(() => document.querySelector('#ticket-data-monitor')?.shadowRoot.querySelector('#goal-progress')?.textContent.includes('1 / 2'), null, { timeout: 15000 }); }
  catch (error) {
    console.log('Goal diagnostic', JSON.stringify({ backend, state: stored['ticketGoal:19'], page: await page.evaluate(()=>({path:location.pathname,status:document.querySelector('#ticket-data-monitor')?.shadowRoot.querySelector('#cart-status')?.textContent,progress:document.querySelector('#ticket-data-monitor')?.shadowRoot.querySelector('#goal-progress')?.textContent,body:document.querySelector('#ticket-goal-progress')?.textContent})) })); throw error;
  }
  return { page, backend, state: () => structuredClone(stored['ticketGoal:19']) };
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const first = await setup(browser);
    assert.deepEqual(first.backend.posts, [[1001]]); assert.equal(first.state().confirmed.length, 1); assert.equal(first.backend.returns, 1);
    assert.equal(first.state().config.refreshSeconds, 2);
    assert.equal(await first.page.locator('#ticket-data-monitor').getByRole('spinbutton', { name: 'Abfrageintervall in Sekunden' }).inputValue(), '2');
    await first.page.waitForTimeout(150);
    assert.equal(first.backend.posts.length, 1, 'the still-advertised first seat must not be purchased again');
    first.backend.second = true; await first.page.evaluate(() => sms.refreshAvailability());
    await first.page.waitForFunction(() => document.querySelector('#ticket-goal-progress')?.textContent.includes('2 von 2'), null, { timeout: 15000 });
    assert.deepEqual(first.backend.posts, [[1001], [1002]]); assert.deepEqual(first.backend.items, [1001, 1002]);
    assert.equal(first.state().status, 'completed'); assert.equal(first.backend.returns, 1);
    assert.equal(new URL(first.page.url()).pathname, base + 'shoppingcart');
    console.log('PASS: native form navigation confirms ticket 1, automatically resumes only the remainder, excludes its repeated API offer, later adds neighbouring ticket 2 and stays in the cart at 2/2');
    await first.page.close();
    const stopped = await setup(browser);
    await stopped.page.locator('#ticket-data-monitor').getByRole('button', { name: 'Stoppen', exact: true }).click();
    for (let i = 0; i < 100 && stopped.state().status !== 'stopped'; i++) await stopped.page.waitForTimeout(20);
    assert.equal(stopped.state().status, 'stopped');
    stopped.backend.second = true; await stopped.page.evaluate(() => sms.refreshAvailability()); await stopped.page.waitForTimeout(200);
    assert.deepEqual(stopped.backend.posts, [[1001]]); assert.deepEqual(stopped.backend.items, [1001]);
    console.log('PASS: stopping after the first confirmed ticket preserves it and prevents a later second purchase');
    await stopped.page.close();

    const regular = await setup(browser, true);
    assert.deepEqual(regular.backend.posts, [[1001]]);
    regular.backend.second = true; await regular.page.evaluate(() => sms.refreshAvailability());
    await regular.page.waitForFunction(() => document.querySelector('#ticket-goal-progress')?.textContent.includes('2 von 2'), null, { timeout: 15000 });
    assert.deepEqual(regular.backend.posts, [[1001], [1002]]);
    assert.equal(new URL(regular.page.url()).pathname, '/ols/werderbremen/de/einzelkarten/channel/shop/shoppingcart');
    assert.equal(regular.state().eventUrl, 'https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/674382');
    console.log('PASS: the regular Einzelkarten shop uses its own event, cart and return URLs throughout partial-ticket collection');
    await regular.page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
