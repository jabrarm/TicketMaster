const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createController, createTracker } = require('../extension/refresh.js');
function clock() {
  let time = 0, id = 0; const tasks = new Map();
  return { now: () => time, schedule: (fn, ms) => { const key = ++id; tasks.set(key, { at: time + ms, fn }); return key; }, unschedule: key => tasks.delete(key),
    async advance(ms) { const end = time + ms; while (true) { const item = [...tasks].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!item) break; time = item[1].at; tasks.delete(item[0]); item[1].fn(); await Promise.resolve(); await Promise.resolve(); } time = end; await Promise.resolve(); }, tasks };
}
test('half-second updates do not overlap even when the SDK returns void and the network takes five seconds', async () => {
  const c = clock(), tracker = createTracker(c.now), calls = []; let sequence = 0;
  const proto = { isSeatmapLoaded: () => true, refreshAvailability() { calls.push(c.now()); const request = { sequence: ++sequence }; tracker.begin(request); c.schedule(() => tracker.end(request, 200), 5000); } };
  const client = Object.create(proto), original = client.refreshAvailability;
  const control = createController({ ...c, client: () => client, state: tracker.state });
  control.start(0.5); await c.advance(5500);
  assert.deepEqual(calls, [500, 5500]);
  control.stop(); assert.equal(client.refreshAvailability, original); assert.equal(Object.hasOwn(client, 'refreshAvailability'), false);
  await c.advance(20000); assert.equal(calls.length, 2);
  client.refreshAvailability(); assert.equal(calls.length, 3, 'normal shop method still works after stop');
});
test('native timer calls coalesce with the configured timer and interval changes do not leave the old cooldown', async () => {
  const c = clock(), calls = [];
  const client = { isSeatmapLoaded: () => true, refreshAvailability: () => { calls.push(c.now()); } };
  const original = client.refreshAvailability, control = createController({ ...c, client: () => client, state: () => ({ active: 0, retryUntil: 0 }) });
  control.start(20); await c.advance(20000); await client.refreshAvailability(); assert.deepEqual(calls, [20000]);
  control.start(2); await c.advance(2000); assert.deepEqual(calls, [20000, 22000]);
  await client.refreshAvailability(); assert.equal(calls.length, 2);
  control.stop(); assert.equal(client.refreshAvailability, original);
});
test('HTTP 429 Retry-After pauses both additional updates and the wrapped native timer', async () => {
  const c = clock(), tracker = createTracker(c.now), calls = []; let sequence = 0;
  const client = { isSeatmapLoaded: () => true, refreshAvailability() { calls.push(c.now()); const request = { sequence: ++sequence }; tracker.begin(request); tracker.end(request, calls.length === 1 ? 429 : 200, calls.length === 1 ? '60' : null); } };
  const control = createController({ ...c, client: () => client, state: tracker.state });
  control.start(2); await c.advance(2000); assert.equal(tracker.state().retryUntil, 62000);
  await c.advance(20000); await client.refreshAvailability(); assert.equal(calls.length, 1);
  await c.advance(39999); assert.equal(calls.length, 1);
  await c.advance(1); assert.equal(calls.length, 2); assert.equal(tracker.state().failures, 0);
  control.stop();
});
test('request tracking honours date headers and does not let an older success erase a newer failure', () => {
  const now = 1700000000000, tracker = createTracker(() => now), old = { sequence: 1 }, recent = { sequence: 2 };
  tracker.begin(old); tracker.begin(recent); tracker.end(recent, 503, new Date(now + 90000).toUTCString()); tracker.end(old, 200);
  assert.equal(tracker.state().active, 0); assert.equal(tracker.state().retryUntil, now + 90000); assert.equal(tracker.state().failures, 1);
});
test('selection in progress pauses polling and invalid frequencies are rejected', async () => {
  const c = clock(); let busy = true, calls = 0;
  const control = createController({ ...c, client: () => ({ isSeatmapLoaded: () => true, refreshAvailability: () => { calls++; } }), state: () => ({ active: 0, retryUntil: 0 }), selectionBusy: () => busy });
  assert.throws(() => control.start(0.25)); assert.throws(() => control.start(121)); assert.throws(() => control.start(2.25));
  control.start(2); await c.advance(2000); assert.equal(calls, 0); busy = false; await c.advance(2000); assert.equal(calls, 1); control.stop();
});
test('late start and stop commands cannot override a more recent user action', () => {
  const c = clock(), client = { isSeatmapLoaded: () => true, refreshAvailability() {} };
  const control = createController({ ...c, client: () => client, state: () => ({ active: 0, retryUntil: 0 }) });
  control.start(2, 1); control.stop(2); control.start(2, 1); assert.equal(control.state().running, false);
  control.start(2, 3); control.stop(2); assert.equal(control.state().running, true); control.stop(4);
});
