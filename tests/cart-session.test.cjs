const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Sessions } = require('../extension/cart-session.js');
const preferences = require('../extension/preferences.js');
const url = 'https://www.ticket-onlineshop.com/ols/werderbremen-hospitality/de/tageskarte/channel/shop/areaplan/venue/event/674379';
const receipt = keys => ({ valid: true, keys, entries: keys.map(key => ({ key, seatId: null })) });
async function setup() {
  const values = new Map();
  const storage = { read: async k => structuredClone(values.get(k)), write: async (k, v) => { values.set(k, structuredClone(v)); } };
  const sessions = new Sessions(storage);
  await sessions.begin(19, 'goal-01', { ...preferences.defaults(), quantity: 2 }, url);
  return { sessions, storage };
}
async function submit(sessions, run, baseline, ids) {
  await sessions.attempt(19, 'goal-01', run, receipt(baseline));
  await sessions.prepared(19, 'goal-01', run, { count: ids.length, seats: ids.map(id => ({ id })) });
}
test('one ticket is counted only after the cart confirms it, a later ticket completes the remaining goal', async () => {
  const { sessions } = await setup();
  await submit(sessions, 'run-1', [], [1001]);
  assert.equal((await sessions.get(19)).confirmed.length, 0);
  const first = await sessions.confirm(19, 'goal-01', receipt(['cart-1']));
  assert.equal(first.status, 'watching'); assert.equal(first.confirmed.length, 1);
  await submit(sessions, 'run-2', ['cart-1'], [1002]);
  const second = await sessions.confirm(19, 'goal-01', receipt(['cart-1', 'cart-2']));
  assert.equal(second.status, 'completed'); assert.equal(second.confirmed.length, 2);
  await assert.rejects(sessions.attempt(19, 'goal-01', 'run-3', receipt(['cart-1', 'cart-2'])));
});
test('pending submission survives a worker restart and duplicate receipt cannot increase progress', async () => {
  const { sessions, storage } = await setup(); await submit(sessions, 'run-1', [], [1001]);
  const restored = new Sessions(storage);
  await assert.rejects(restored.attempt(19, 'goal-01', 'run-2', receipt([])), /noch nicht bestätigt/);
  await restored.confirm(19, 'goal-01', receipt(['cart-1']));
  assert.equal((await restored.confirm(19, 'goal-01', receipt(['cart-1']))).confirmed.length, 1);
});
test('pre-existing cart items do not count towards the new target and confirmed seats cannot be submitted twice', async () => {
  const { sessions } = await setup(); await submit(sessions, 'run-1', ['old-ticket'], [1001]);
  assert.equal((await sessions.confirm(19, 'goal-01', receipt(['old-ticket', 'new-1']))).confirmed.length, 1);
  await sessions.attempt(19, 'goal-01', 'run-2', receipt(['old-ticket', 'new-1']));
  await assert.rejects(sessions.prepared(19, 'goal-01', 'run-2', { count: 1, seats: [{ id: 1001 }] }), /bereits/);
});
test('ambiguous receipt, missing prior reservations and stop prevent further automatic submissions', async () => {
  const a = await setup(); await submit(a.sessions, 'run-1', [], [1001]);
  assert.equal((await a.sessions.confirm(19, 'goal-01', receipt(['unexpected-1', 'unexpected-2']))).status, 'paused');
  await assert.rejects(a.sessions.attempt(19, 'goal-01', 'run-2', receipt([])));
  const b = await setup(); await submit(b.sessions, 'run-1', [], [1001]); await b.sessions.confirm(19, 'goal-01', receipt(['cart-1']));
  await assert.rejects(b.sessions.attempt(19, 'goal-01', 'run-2', receipt([])), /Reservierungsfrist/);
  const c = await setup(); await c.sessions.stop(19, 'goal-01');
  await assert.rejects(c.sessions.attempt(19, 'goal-01', 'run-1', receipt([])));
});
test('explicit resume after stop preserves the previously confirmed part of the target', async () => {
  const { sessions } = await setup(); await submit(sessions, 'run-1', [], [1001]); await sessions.confirm(19, 'goal-01', receipt(['cart-1']));
  await sessions.stop(19, 'goal-01');
  const resumed = await sessions.begin(19, 'new-unused-id', { ...preferences.defaults(), quantity: 2 }, url);
  assert.equal(resumed.id, 'goal-01'); assert.equal(resumed.confirmed.length, 1); assert.equal(resumed.target - resumed.confirmed.length, 1);
});
