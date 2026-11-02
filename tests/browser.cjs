const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const executablePath = process.env.CHROMIUM_PATH || (require('node:fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0}#seat{position:absolute;left:100px;top:100px;width:150px;height:20px;background:rgb(235,235,235)}#next{position:absolute;left:300px;top:300px}</style><div id="seat"></div><button id="next">Weiter</button>`);
    await page.evaluate(() => {
      window.events = [];
      document.querySelector('#seat').addEventListener('dblclick', () => events.push('double'));
      document.querySelector('#next').addEventListener('click', () => events.push('next'));
    });
    await page.exposeFunction('captureForTest', async () => ({ data: `data:image/png;base64,${(await page.screenshot()).toString('base64')}` }));
    await page.evaluate(() => { window.chrome = { runtime: { sendMessage: () => window.captureForTest() } }; });
    for (const file of ['detector.js', 'content.js']) await page.addScriptTag({ content: await fs.readFile(path.join(__dirname, '../extension', file), 'utf8') });
    const host = page.locator('#tm-watcher-host');
    async function select() {
      await host.locator('#area').click();
      await page.mouse.move(95, 95); await page.mouse.down(); await page.mouse.move(255, 125); await page.mouse.up();
      await host.locator('#next').click(); await page.mouse.click(325, 310);
    }
    await select();
    await host.locator('#start').click();
    await page.waitForFunction(() => document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Testmodus aktiv'));
    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(100,110,0)');
    await page.waitForFunction(() => document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Keine Klicks'), null, { timeout: 5000 });
    assert.deepEqual(await page.evaluate(() => events), []);
    console.log('PASS: test mode detects the changed gray region without clicking');

    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(235,235,235)');
    await page.evaluate(() => {
      document.querySelector('#next').disabled = true;
      document.querySelector('#seat').addEventListener('dblclick', () => setTimeout(() => document.querySelector('#next').disabled = false, 650), { once: true });
    });
    await host.locator('#automatic').check(); await host.locator('#start').click();
    await page.waitForFunction(() => document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Aktiv'));
    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(100,110,0)');
    await page.waitForFunction(() => events.length === 2, null, { timeout: 5000 });
    assert.deepEqual(await page.evaluate(() => events), ['double', 'next']);
    await page.waitForTimeout(1200);
    assert.deepEqual(await page.evaluate(() => events), ['double', 'next']);
    console.log('PASS: double click and follow-up click execute once in order; disabled cart is awaited');

    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(235,235,235)');
    await host.locator('#start').click(); await page.keyboard.press('Escape');
    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(100,110,0)');
    await page.waitForTimeout(1300);
    assert.deepEqual(await page.evaluate(() => events), ['double', 'next']);
    console.log('PASS: Escape prevents subsequent actions');

    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(235,235,235)');
    await page.evaluate(() => document.querySelector('#seat').addEventListener('dblclick', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), { once: true }));
    await host.locator('#start').click();
    await page.waitForFunction(() => document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Aktiv'));
    await page.locator('#seat').evaluate(el => el.style.background = 'rgb(100,110,0)');
    await page.waitForFunction(() => events.length === 3, null, { timeout: 5000 });
    await page.waitForTimeout(600);
    assert.deepEqual(await page.evaluate(() => events), ['double', 'next', 'double']);
    console.log('PASS: Escape between double click and cart prevents the cart action');

    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await host.locator('#start').click();
    assert.match(await host.locator('output').textContent(), /Markiere zuerst/);
    console.log('PASS: viewport changes invalidate old click coordinates');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
