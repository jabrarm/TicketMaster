const { test } = require('node:test');
const assert = require('node:assert/strict');
const preferences = require('../extension/preferences.js');
const { createController } = require('../extension/cart-flow.js');
function setup(options = {}) {
  let time = 10000, clicks = 0;
  const chosen = options.existing ? [{ id: 's900' }] : [], calls = [];
  const selected = { getSelectedSeats: () => chosen, getLostSeatAmount: () => options.lost ? 1 : 0 };
  let controller;
  const client = { isSeatmapLoaded: () => true, selectById: id => {
    calls.push(id); if (!options.unconfirmed) chosen.push({ id });
    if (options.cancel) controller.cancel('run-test-01');
  } };
  controller = createController({ preferences: () => preferences, now: () => time, wait: async ms => { time += ms; }, timeout: 300,
    checkSession: () => { if (options.loggedOut) throw new Error('Abgemeldet'); },
    eventId: () => '674379', client: () => client, selection: () => selected, maxTickets: () => options.max || 6,
    form: () => ({}), validForm: () => !options.invalidForm, button: () => ({ click: () => { clicks++; } }),
    cardReady: () => !options.unconfirmed, buttonReady: () => !options.disabled
  });
  controller.updateSnapshot({ inventory: 'tixx-1001-674379', checkedAt: options.old ? time - 120001 : time, stale: Boolean(options.expired), validUntil: options.expired ? time - 1000 : null, seats: [1, 2].map(id => ({ id, category: 'PK8 VIP-Rang Platin', block: 'N1', row: '20' })) });
  return { controller, calls, chosen, clicks: () => clicks, config: { ...preferences.defaults(), quantity: 2 } };
}
test('selects the exact requested IDs one at a time and clicks cart once only after confirmation', async () => {
  const s = setup(); const result = await s.controller.start(s.config, 'run-test-01');
  assert.equal(result.stage, 'submitted'); assert.equal(result.count, 2);
  assert.deepEqual(s.calls, ['s1', 's2']); assert.equal(s.clicks(), 1);
  await assert.rejects(s.controller.start(s.config, 'run-test-01'), /bereits/);
  assert.equal(s.clicks(), 1);
});
test('pre-existing selections, wrong forms and shop limits prevent any new seat selection', async () => {
  for (const options of [{ existing: true }, { invalidForm: true }, { max: 1 }]) {
    const s = setup(options); await assert.rejects(s.controller.start(s.config, 'run-test-01'));
    assert.equal(s.calls.length, 0); assert.equal(s.clicks(), 0);
  }
});
test('a missing confirmation, lost seats or disabled cart button prevents submission', async () => {
  for (const options of [{ unconfirmed: true }, { lost: true }, { disabled: true }]) {
    const s = setup(options); await assert.rejects(s.controller.start(s.config, 'run-test-01'));
    assert.equal(s.clicks(), 0);
  }
});
test('stop before execution and stop during selection both prevent subsequent actions', async () => {
  const early = setup(); early.controller.cancel('run-test-01');
  await assert.rejects(early.controller.start(early.config, 'run-test-01'), /gestoppt/); assert.equal(early.calls.length, 0);
  const during = setup({ cancel: true }); await assert.rejects(during.controller.start(during.config, 'run-test-01'), /gestoppt/);
  assert.equal(during.calls.length, 1); assert.equal(during.clicks(), 0);
});
test('expired cache candidates still require full shop confirmation, and old HTTP snapshots remain blocked', async () => {
  const confirmed = setup({ expired: true });
  assert.equal((await confirmed.controller.start(confirmed.config, 'run-test-01')).stage, 'submitted');
  assert.equal(confirmed.clicks(), 1);
  const rejected = setup({ expired: true, unconfirmed: true });
  await assert.rejects(rejected.controller.start(rejected.config, 'run-test-01'));
  assert.equal(rejected.clicks(), 0);
  const old = setup({ expired: true, old: true });
  await assert.rejects(old.controller.start(old.config, 'run-test-01'));
  assert.equal(old.calls.length, 0); assert.equal(old.clicks(), 0);
});
test('preparing a smaller batch cannot submit until the background explicitly commits it', async () => {
  const s = setup();
  s.controller.updateSnapshot({ inventory: 'tixx-1001-674379', version: '1', checkedAt: 10000, seats: [{ id: 1, category: 'PK8 VIP-Rang Platin', block: 'N1', row: '20' }] });
  const prepared = await s.controller.prepare(s.config, 'run-test-01');
  assert.equal(prepared.count, 1); assert.equal(s.clicks(), 0);
  assert.equal(s.controller.submit('run-test-01').count, 1); assert.equal(s.clicks(), 1);
});

test('known logout after seat selection blocks the click even when the form is ready', async () => {
  const options = {};
  const s = setup(options);
  await s.controller.prepare(s.config, 'run-test-01');
  options.loggedOut = true;
  assert.throws(() => s.controller.submit('run-test-01'), /Abgemeldet/);
  assert.equal(s.clicks(), 0);
});
