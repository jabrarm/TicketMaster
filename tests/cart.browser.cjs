const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, identity, pageUrl } = require('./availability.fixture.cjs');
const scripts = ['availability-core.js', 'preferences.js', 'cart-flow.js', 'page-observer.js', 'preferences-ui.js', 'monitor.js'].map(name => fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8')).join('\n');
async function setup(browser, delay = 0, expired = false) {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const data = fixture();
  data.mapping.priceCategories = [{ id: 69, name: 'PK8 VIP-Rang Gold' }, { id: 70, name: 'PK8 VIP-Rang Platin' }];
  data.availability.seats = [[1001, 1], [1, 1], [999, 0], [1000, 1]];
  data.availability.expired = expired;
  if (expired) data.availability.expiryTimestamp = Date.now() - 1000;
  const html = `<!doctype html><title>Controlled ticket shop</title><h1>Test-Saalplan</h1>
    <form id="seatCardForm" method="post" action="/ols/werderbremen-hospitality/de/tageskarte/channel/shop/shoppingcart/addselecteditemsareas/event/674379">
    <ul id="seat-cards-list"></ul><button id="add-to-cart" type="submit">In den Warenkorb</button></form>
    <script>
    window.selected=[]; window.cartCalls=0;
    let sms={isSeatmapLoaded:()=>true,selectById:id=>{
      window.selected.push({id});setTimeout(()=>{const li=document.createElement('li');li.dataset.seatIdentifier=id;const input=document.createElement('input');input.type='hidden';input.name='selected';input.value=id;li.append(input);document.querySelector('#seat-cards-list').append(li);},${delay});
    }};
    let seatSelection={getSelectedSeats:()=>window.selected,getLostSeatAmount:()=>0,options:{filterBar:{getMaxTicketsAmount:()=>6}}};
    document.querySelector('#add-to-cart').onclick=e=>{e.preventDefault();window.cartCalls++;window.cart=window.selected.map(s=>s.id);};
    </script>`;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.ticket-onlineshop.com') return route.fulfill({ contentType: 'text/html', body: html });
    return route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data[url.pathname.split('/').at(-2)]) });
  });
  await page.addInitScript({ content: `window.commands=[];window.savedPrefs=null;
    window.chrome={runtime:{sendMessage:async message=>{window.commands.push(message);return message.type==='cartStop'?globalThis.TicketCartFlow.cancel(message.run):globalThis.TicketCartFlow.start(message.config,message.run);}},storage:{local:{get:async()=>({ticketPreferencesV1:window.savedPrefs}),set:async data=>{window.savedPrefs=data.ticketPreferencesV1;}}}};
    ` + scripts });
  await page.goto(pageUrl);
  for (const kind of ['seatmap', 'mapping', 'availability']) await page.evaluate(async url => (await fetch(url)).json(), `https://public-api.eventim.com/seatmap/api/public/${kind}/${identity}`);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle')));
  const panel = page.locator('#ticket-data-monitor');
  return { page, panel, errors };
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const { page, panel, errors } = await setup(browser);
    await panel.getByRole('checkbox', { name: 'VIP auswählen', exact: true }).uncheck();
    for (const name of ['VIP-Rang Platin auswählen', 'VIP-Rang Gold auswählen']) await panel.getByRole('checkbox', { name, exact: true }).check();
    assert.equal(await panel.getByRole('checkbox', { name: 'VIP auswählen', exact: true }).evaluate(el => el.indeterminate), true);
    assert.equal(await panel.getByRole('checkbox', { name: 'VIP-Club Ost. auswählen', exact: true }).isChecked(), false);
    for (let i = 0; i < 5; i++) await panel.getByRole('button', { name: 'VIP nach oben', exact: true }).click();
    for (let i = 0; i < 4; i++) await panel.getByRole('button', { name: 'VIP-Rang Gold nach oben', exact: true }).click();
    await panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).fill('2');
    await panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).dispatchEvent('change');
    const config = await page.evaluate(() => window.savedPrefs);
    assert.equal(config.quantity, 2); assert.equal(config.groups[0].id, 'vip'); assert.equal(config.groups[0].children[0].id, 'vip-gold');
    assert.equal(config.groups[0].children.filter(c => c.enabled).length, 2);
    console.log('PASS: category-wide selection, child exclusions, parent indeterminate state, priority arrows and ticket count persist correctly');
    await panel.getByRole('button', { name: 'Automatisch in den Warenkorb', exact: true }).click();
    await page.waitForFunction(() => window.cartCalls === 1);
    assert.deepEqual(await page.evaluate(() => window.cart.slice().sort()), ['s1001', 's1002']);
    assert.equal(await page.evaluate(() => window.commands.filter(c => c.type === 'cartStart').length), 1);
    assert.match(await panel.locator('#cart-status').textContent(), /2 bestätigte Plätze/);
    assert.equal(await panel.getByRole('button', { name: 'Automatisch in den Warenkorb', exact: true }).isDisabled(), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: '/tmp/ticket-preferences.png', fullPage: true });
    console.log('PASS: preferred adjacent pair is selected through the shop interface, both seat cards are confirmed, cart is clicked exactly once');
    await page.close();

    const pending = await setup(browser, 500);
    await pending.panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).fill('2');
    await pending.panel.getByRole('spinbutton', { name: 'Anzahl Tickets' }).dispatchEvent('change');
    await pending.panel.getByRole('button', { name: 'Automatisch in den Warenkorb', exact: true }).click();
    await pending.page.waitForFunction(() => window.selected.length === 1);
    await pending.panel.getByRole('button', { name: 'Stoppen', exact: true }).click();
    await pending.page.waitForFunction(() => document.querySelector('#ticket-data-monitor').shadowRoot.querySelector('#cart-status').textContent.includes('Automatik angehalten'));
    assert.equal(await pending.page.evaluate(() => window.selected.length), 1);
    assert.equal(await pending.page.evaluate(() => window.cartCalls), 0);
    assert.deepEqual(pending.errors, []);
    console.log('PASS: stop during an unconfirmed selection prevents the next seat and any cart submission');
    await pending.page.close();

    const cached = await setup(browser, 0, true);
    await cached.panel.getByRole('button', { name: 'Automatisch in den Warenkorb', exact: true }).click();
    await cached.page.waitForFunction(() => window.cartCalls === 1);
    assert.deepEqual(await cached.page.evaluate(() => window.cart), ['s1001']);
    assert.equal(await cached.page.evaluate(() => window.commands.filter(c => c.type === 'cartStart').length), 1);
    assert.match(await cached.panel.locator('#count-label').textContent(), /Sitzangebote/);
    assert.match(await cached.panel.locator('#cart-status').textContent(), /1 bestätigte Plätze/);
    assert.deepEqual(cached.errors, []);
    console.log('PASS: screenshot regression — an armed run with visible expired-cache offers starts selection and submits only after the shop seat card is confirmed');
    await cached.page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
