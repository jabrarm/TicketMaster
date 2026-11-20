const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(failing = false) {
  let click, message; const calls = [], badges = [], titles = [];
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8'), {
    URL, TicketAvailability: require('../extension/availability-core.js'), importScripts() {}, console: { error() {} }, chrome: {
      runtime: { id: 'test-extension', onMessage: { addListener: fn => { message = fn; } } },
      action: { onClicked: { addListener: fn => { click = fn; } },
        setBadgeText: async value => badges.push(value), setBadgeBackgroundColor: async () => {}, setTitle: async value => titles.push(value) },
      scripting: { executeScript: async arg => { calls.push(arg); if (failing) throw new Error('Seitenzugriff verweigert'); return [{ result: { requiresReload: false } }]; } }
    }
  });
  return { click, calls, badges, titles, message };
}
test('toolbar installs both script worlds before toggling, including in tabs open before installation', async () => {
  const { click, calls, badges } = setup();
  await click({}); assert.equal(calls.length, 0);
  await click({ id: 19 }); assert.equal(calls.length, 4);
  assert.ok(calls.every(x => x.target.tabId === 19));
  assert.equal(calls[0].world, 'MAIN');
  assert.deepEqual(Array.from(calls[0].files), ['availability-core.js', 'preferences.js', 'cart-receipt.js', 'cart-flow.js', 'refresh.js', 'page-observer.js']);
  assert.equal(calls[1].world, 'MAIN');
  assert.equal(calls[2].world, 'ISOLATED');
  assert.deepEqual(Array.from(calls[2].files), ['availability-core.js', 'preferences.js', 'preferences-ui.js', 'monitor.js']);
  const events = [];
  vm.runInNewContext('(' + calls[3].func.toString() + ')()', { window: { __ticketDataMonitor: true, dispatchEvent: event => events.push(event.type) }, CustomEvent: class { constructor(type) { this.type = type; } } });
  assert.deepEqual(events, ['ticket-data-monitor-toggle']);
  assert.equal(badges[0].text, '');
});
test('cart commands reject foreign extensions and non-event pages', () => {
  const { message, calls } = setup();
  const cmd = { type: 'cartStart', run: 'test-run-01' };
  const validUrl = 'https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379';
  assert.equal(message(cmd, { id: 'other', tab: { id: 19 }, url: validUrl }, () => {}), undefined);
  assert.equal(message(cmd, { id: 'test-extension', tab: { id: 19 }, url: 'https://example.org/' }, () => {}), undefined);
  assert.equal(calls.length, 0);
});
test('blocked script injection shows a visible badge and exposes the cause in the toolbar tooltip', async () => {
  const { click, calls, badges, titles } = setup(true);
  await click({ id: 19 });
  assert.equal(calls.length, 1);
  assert.equal(badges[0].text, '!');
  assert.match(titles[0].title, /Seitenzugriff verweigert/);
});
test('a stop received while the pending handoff is written prevents the native form click', async () => {
  const { Sessions } = require('../extension/cart-session.js');
  const prefs = require('../extension/preferences.js');
  const event = 'https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/674382';
  let handle, hold, ready, submitCalls = 0;
  const writing = new Promise(resolve => { ready = resolve; });
  const release = new Promise(resolve => { hold = resolve; });
  let stored;
  const storage = {
    get: async key => ({ [key]: structuredClone(stored) }),
    set: async value => {
      const incoming = Object.values(value)[0];
      if (incoming.status === 'submitting') { ready(); await release; }
      stored = structuredClone(incoming);
    }
  };
  const goalStore = new Sessions({ read: async key => (await storage.get(key))[key], write: async (key, value) => storage.set({ [key]: value }) });
  await goalStore.begin(19, 'goal-01', prefs.defaults(), event);
  const responses = {
    baseline: { valid: true, keys: [] },
    prepare: { stage: 'prepared', count: 1, seats: [{ id: 123 }] },
    cancel: { stage: 'stopped' },
    submit: { stage: 'submitted', count: 1 }
  };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8'), {
    URL, TicketAvailability: require('../extension/availability-core.js'), TicketGoalSessions: { Sessions }, importScripts() {}, console,
    chrome: {
      action: { onClicked: { addListener() {} } },
      runtime: { id: 'test-extension', onMessage: { addListener(fn) { handle = fn; } } },
      storage: { session: storage },
      scripting: { executeScript: async ({ args: [op] }) => {
        if (op === 'submit') submitCalls++;
        return [{ result: responses[op] }];
      } }
    }
  });
  const send = msg => new Promise(resolve => handle(msg, { id: 'test-extension', tab: { id: 19 }, url: event }, resolve));
  const running = send({ type: 'cartStart', goalId: 'goal-01', run: 'run-0001' });
  await writing;
  const stopped = send({ type: 'goalStop', goalId: 'goal-01' });
  hold();
  assert.match((await running).error, /gestoppt/);
  await stopped;
  assert.equal(submitCalls, 0);
  assert.equal(stored.status, 'stopped');
  assert.equal(stored.pending, null);
});
