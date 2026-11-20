const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { fixture, identity, pageUrl } = require('./availability.fixture.cjs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage(), data = fixture(); let calls = 0, active = 0, maximum = 0, slow = false, status = 200;
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const endpoint = 'https://public-api.eventim.com/seatmap/api/public/availability/' + identity;
    await page.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'www.ticket-onlineshop.com') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><h1>Test</h1><script>let sms={isSeatmapLoaded:()=>true,refreshAvailability(){void fetch(' + JSON.stringify(endpoint) + ').then(r=>r.json());}};window.originalRefresh=sms.refreshAvailability;window.refreshStates=[];window.addEventListener("message",e=>{if(e.data?.type==="refresh-state")window.refreshStates.push(e.data.message);});</script>' });
      const kind = u.pathname.split('/').at(-2);
      if (kind === 'availability') { calls++; active++; maximum = Math.max(maximum, active); if (slow) await new Promise(resolve => setTimeout(resolve, 3000)); }
      await route.fulfill({ status: kind === 'availability' ? status : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Retry-After', ...(status === 429 ? { 'Retry-After': '60' } : {}) }, body: JSON.stringify(data[kind]) });
      if (kind === 'availability') active--;
    });
    await page.addInitScript({ content: ['availability-core.js','preferences.js','cart-flow.js','refresh.js','page-observer.js'].map(n => fs.readFileSync(path.join(__dirname,'../extension',n),'utf8')).join('\n') });
    await page.goto(pageUrl);
    for (const kind of ['seatmap','mapping','availability']) await page.evaluate(async url => (await fetch(url)).json(), `https://public-api.eventim.com/seatmap/api/public/${kind}/${identity}`);
    await page.waitForFunction(() => window.TicketDataObserver.getRequestState().active === 0 && window.TicketDataObserver.getSnapshot());
    calls = 0; maximum = 0; slow = true;
    await page.evaluate(() => window.TicketRefresh.start(0.5));
    for (let i=0; i<150 && calls===0; i++) await page.waitForTimeout(20);
    assert.equal(calls, 1); await page.waitForTimeout(2200);
    assert.equal(calls, 1); assert.equal(maximum, 1);
    assert.equal(await page.evaluate(() => window.TicketDataObserver.getRequestState().active), 1);
    await page.evaluate(() => window.TicketRefresh.stop());
    assert.equal(await page.evaluate(() => sms.refreshAvailability === window.originalRefresh), true);
    await page.waitForTimeout(2200); assert.equal(calls, 1);
    console.log('PASS: a real void-return SDK call starts after half a second; a three-second response never overlaps and stop restores the original method without further added requests');

    slow = false; status = 429;
    await page.evaluate(() => sms.refreshAvailability());
    await page.waitForFunction(() => window.TicketDataObserver.getRequestState().lastStatus === 429);
    const before = calls;
    await page.evaluate(() => window.TicketRefresh.start(0.5));
    await page.waitForTimeout(2200);
    assert.equal(calls, before);
    assert.match(await page.evaluate(() => window.refreshStates.at(-1)), /Shop-Pause/);
    assert.ok(await page.evaluate(() => window.TicketDataObserver.getRequestState().retryUntil - Date.now() > 50000));
    await page.evaluate(() => window.TicketRefresh.stop());
    assert.deepEqual(errors, []);
    console.log('PASS: the observed CORS-exposed Retry-After header blocks additional polling and reports the server pause');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
