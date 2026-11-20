const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, identity, pageUrl } = require('./availability.fixture.cjs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    let data = fixture(), failure = false, unchanged = false, delayNext = false, release;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'www.ticket-onlineshop.com') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Controlled shop fixture</title><h1>Test-Saalplan</h1>' });
      const kind = url.pathname.split('/').at(-2); requests.push(kind);
      const body = JSON.stringify(data[kind]);
      if (delayNext) { delayNext = false; await new Promise(resolve => { release = resolve; }); }
      return route.fulfill({ status: unchanged ? 304 : failure ? 503 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: unchanged ? '' : body });
    });
    const scripts = ['availability-core.js', 'preferences.js', 'cart-receipt.js', 'cart-flow.js', 'refresh.js', 'page-observer.js', 'preferences-ui.js', 'monitor.js'].map(name => fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8')).join('\n');
    await page.addInitScript({ content: `
      window.pings = 0;
      window.chrome.runtime = { sendMessage: async ({ type }) => { if (type === 'availabilityPing') window.pings++; } };
    ` + scripts });
    await page.goto(pageUrl);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle')));
    const panel = page.locator('#ticket-data-monitor');
    await panel.getByRole('button', { name: 'Überwachung starten' }).click();
    const waitStatus = text => page.waitForFunction(text => document.querySelector('#ticket-data-monitor').shadowRoot.querySelector('#status').textContent.includes(text), text);
    await waitStatus('Warte auf');
    const load = async (kind, xhr = false) => {
      const url = `https://public-api.eventim.com/seatmap/api/public/${kind}/${identity}`;
      const result = await page.evaluate(async ({ url, xhr }) => {
        if (!xhr) return (await fetch(url)).json();
        return new Promise((resolve, reject) => { const request = new XMLHttpRequest(); request.open('GET', url); request.onload = () => resolve(JSON.parse(request.responseText)); request.onerror = reject; request.send(); });
      }, { url, xhr });
      assert.ok(result.seatmapId, 'the shop can still consume the original response');
    };
    await load('seatmap'); await load('mapping'); await load('availability');
    await waitStatus('Ausgangsbestand');
    assert.equal(await panel.locator('#count').textContent(), '2');
    assert.equal(await panel.locator('#seats tr').count(), 2);
    assert.match(await panel.locator('#changes').textContent(), /Noch keine/);
    assert.deepEqual(requests, ['seatmap', 'mapping', 'availability']);
    assert.equal(await page.evaluate(() => window.pings), 0);
    console.log('PASS: incomplete sources wait; first joined snapshot renders a baseline without alerts or additional requests');

    data.availability = { ...data.availability, timestamp: 2000, seats: [[1001, 1], [1, 1], [999, 1], [1000, 0]] };
    await load('availability', true); await waitStatus('1 neu frei');
    assert.match(await panel.locator('#changes').textContent(), /Sitz-ID 1002/);
    assert.equal(await page.evaluate(() => window.pings), 1);
    assert.match(await panel.locator('#changes').textContent(), /1 Sitze nicht mehr/);
    assert.equal(await panel.locator('#seats tr.new').count(), 1);
    await panel.getByLabel('Block filtern').selectOption('11');
    assert.equal(await panel.locator('#seats tr').count(), 2);
    console.log('PASS: XHR updates detect the new seat, exclude the blocked seat, record a removal and support block filtering');

    failure = true; await load('availability'); await waitStatus('HTTP 503');
    assert.equal(await panel.locator('#count').textContent(), '2');
    failure = false;
    data.availability = { ...data.availability, timestamp: 3000, expired: true, seats: [[1001, 1], [1, 1], [999, 1], [1000, 1]] };
    await load('availability'); await waitStatus('abgelaufen');
    assert.doesNotMatch(await panel.locator('#changes').textContent(), /Sitz-ID 3001/);
    assert.equal(await page.evaluate(() => window.pings), 1);
    data.availability = { ...data.availability, timestamp: 4000, expired: false };
    await load('availability'); await waitStatus('1 neu frei');
    assert.match(await panel.locator('#changes').textContent(), /Sitz-ID 3001/);
    console.log('PASS: network errors retain the previous inventory; expired responses never trigger additions; fresh data resumes comparison');

    await panel.getByRole('button', { name: 'Stoppen', exact: true }).click();
    data.availability = { ...data.availability, timestamp: 5000, seats: [] };
    await load('availability');
    await waitStatus('Gestoppt');
    assert.equal(await panel.locator('#count').textContent(), '3');
    await panel.getByRole('button', { name: 'Überwachung starten' }).click();
    await waitStatus('Ausgangsbestand');
    assert.equal(await panel.locator('#count').textContent(), '0');
    assert.match(await panel.locator('#changes').textContent(), /Noch keine/);
    console.log('PASS: stop suppresses updates and restart establishes a fresh baseline, including zero seats');

    data.mapping.priceCategories[1].name = '&lt;img src=x onerror=alert(1)&gt;';
    await load('mapping');
    data.availability = { ...data.availability, timestamp: 6000, seats: [[1001, 1]] };
    await load('availability'); await waitStatus('1 neu frei');
    assert.equal(await panel.locator('img').count(), 0);
    assert.match(await panel.locator('#seats').textContent(), /<img src=x onerror=alert\(1\)>/);
    await page.evaluate(() => {
      window.postMessage({ channel: 'ticket-data-monitor-v1', type: 'snapshot', snapshot: { inventory: 'tixx-1001-999', version: '7', timestamp: 9999, checkedAt: Date.now(), seats: [] } }, location.origin);
      window.postMessage({ channel: 'ticket-data-monitor-v1', type: 'snapshot', snapshot: { inventory: 'tixx-1001-674379', version: '7', timestamp: 9999, checkedAt: Date.now(), seats: [null] } }, location.origin);
    });
    await page.waitForTimeout(100);
    assert.equal(await panel.locator('#count').textContent(), '1');
    assert.deepEqual(errors, []);
    delayNext = true;
    data.availability = { ...data.availability, timestamp: 7000, seats: [] };
    const oldResponse = load('availability');
    await page.waitForTimeout(100);
    assert.equal(typeof release, 'function');
    data.availability = { ...data.availability, timestamp: 8000, seats: [[1001, 1], [1, 1]] };
    await load('availability'); await waitStatus('1 neu frei');
    release(); await oldResponse;
    await page.waitForTimeout(100);
    assert.equal(await panel.locator('#count').textContent(), '2');
    unchanged = true;
    await page.evaluate(async url => { const response = await fetch(url); if (response.status !== 304) throw new Error('Expected 304'); }, `https://public-api.eventim.com/seatmap/api/public/availability/${identity}`);
    await waitStatus('unverändert');
    assert.equal(await panel.locator('#count').textContent(), '2');
    console.log('PASS: delayed older responses cannot overwrite the latest inventory; HTTP 304 confirms unchanged availability');
    await panel.getByRole('button', { name: 'Schließen' }).click();
    assert.equal(await page.locator('#ticket-data-monitor').count(), 0);
    console.log('PASS: labels render as text; foreign-event and malformed messages are ignored; closing removes the monitor');

    const late = await browser.newPage();
    await late.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Already open ticket page</title><h1>Shop</h1>' }));
    await late.goto(pageUrl);
    await late.evaluate(() => window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle')));
    assert.equal(await late.locator('#ticket-data-monitor').count(), 0, 'reproduces the old silent click before script installation');
    const inject = async () => {
      for (const name of ['availability-core.js', 'preferences.js', 'cart-receipt.js', 'cart-flow.js', 'refresh.js', 'page-observer.js', 'availability-core.js', 'preferences.js', 'preferences-ui.js', 'monitor.js']) {
        await late.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8') });
      }
      await late.evaluate(() => window.dispatchEvent(new CustomEvent('ticket-data-monitor-toggle')));
    };
    await inject();
    assert.equal(await late.locator('#ticket-data-monitor').count(), 1);
    await inject();
    assert.equal(await late.locator('#ticket-data-monitor').count(), 0, 'one click closes rather than double-toggling');
    await inject();
    assert.equal(await late.locator('#ticket-data-monitor').count(), 1);
    await late.locator('#ticket-data-monitor').getByRole('button', { name: 'Überwachung starten' }).click();
    await late.waitForFunction(() => document.querySelector('#ticket-data-monitor').shadowRoot.querySelector('#status').textContent.includes('Warte auf'));
    console.log('PASS: toolbar-style late injection opens the monitor in an already loaded tab; repeated injection remains idempotent');
    await late.goto('https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/');
    await inject();
    const unsupported = late.locator('#ticket-data-monitor');
    assert.match(await unsupported.locator('#status').textContent(), /nicht unterstützt/);
    assert.equal(await unsupported.locator('#start').isDisabled(), true);
    console.log('PASS: unsupported shop pages show a visible explanation instead of silently waiting for data');
    await late.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
