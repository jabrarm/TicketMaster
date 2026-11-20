const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Inventory, Tracker, endpoint, eventId } = require('../extension/availability-core.js');
const { fixture, identity, pageUrl } = require('./availability.fixture.cjs');
test('regular Werder single-ticket event and cart URLs have their own supported shop scope', () => {
  const { shop } = require('../extension/availability-core.js');
  const url = 'https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/areaplan/venue/event/674382';
  assert.equal(eventId(url), '674382');
  const context = shop(url + '?view=map');
  assert.equal(context.kind, 'regular'); assert.equal(context.eventUrl, url);
  assert.equal(context.cartUrl, 'https://www.ticket-onlineshop.com/ols/werderbremen/de/einzelkarten/channel/shop/shoppingcart');
  assert.equal(shop(context.cartUrl).type, 'cart');
  assert.equal(shop(url.replace('werderbremen/', 'another-shop/')), null);
  assert.equal(shop(url.replace('.com/', '.com:8443/')), null);
  assert.equal(endpoint('https://public-api.eventim.com/seatmap/api/public/availability/tixx-1001-674382', url).kind, 'availability');
  assert.equal(endpoint('https://public-api.eventim.com/seatmap/api/public/availability/tixx-1001-674379', url), null);
});
function loaded(data = fixture()) {
  const inventory = new Inventory(); let snapshot;
  for (const kind of ['seatmap', 'mapping', 'availability']) snapshot = inventory.accept(kind, data[kind], identity, 5000);
  return { inventory, snapshot, data };
}
test('joins delta-encoded seat groups, negative category deltas, labels and availability; blocked seats are excluded', () => {
  const { snapshot } = loaded();
  assert.deepEqual(snapshot.seats.map(x => [x.id, x.block, x.row, x.category]), [[1001, 'N1', '20', 'VIP'], [3001, 'O2', '4', 'VIP']]);
  assert.equal(snapshot.stale, false);
});
test('availability order survives decoding even when block names would sort differently', () => {
  const data = fixture();
  data.seatmap.areas[0].blocks[0].name = 'Z1';
  data.seatmap.areas[0].blocks[1].name = 'A2';
  assert.deepEqual(loaded(data).snapshot.seats.map(seat => seat.id), [1001, 3001]);
});
test('all three matching sources are required, including when availability arrives before geometry', () => {
  const inv = new Inventory(), data = fixture();
  assert.equal(inv.accept('availability', data.availability, identity), null);
  assert.equal(inv.accept('mapping', data.mapping, identity), null);
  assert.equal(inv.accept('seatmap', data.seatmap, identity).seats.length, 2);
});
test('only the current event and exact public API endpoints are observed', () => {
  assert.equal(eventId(pageUrl), '674379');
  const url = 'https://public-api.eventim.com/seatmap/api/public/availability/' + identity;
  assert.deepEqual(endpoint(url + '?key=not-exported', pageUrl), { kind: 'availability', inventory: identity });
  for (const bad of [url.replace('674379', '999'), url.replace('eventim.com', 'example.org'), url + '/0', url.replace('https:', 'http:')]) assert.equal(endpoint(bad, pageUrl), null);
  assert.equal(endpoint(url, pageUrl.replace('www.ticket-onlineshop.com', 'example.org')), null);
});
test('baseline and duplicate snapshots never announce seats; removals and reappearance are distinguished', () => {
  const tracker = new Tracker(), { snapshot } = loaded();
  assert.equal(tracker.update(snapshot).baseline, true);
  assert.deepEqual(tracker.update(snapshot).added, []);
  const removed = { ...snapshot, timestamp: 2000, seats: snapshot.seats.slice(1) };
  assert.deepEqual(tracker.update(removed).removed, [1001]);
  assert.deepEqual(tracker.update({ ...snapshot, timestamp: 3000 }).added.map(x => x.id), [1001]);
  tracker.reset(); assert.equal(tracker.update(snapshot).baseline, true);
});
test('expired snapshots never replace a valid tracking baseline or announce availability', () => {
  const tracker = new Tracker(), { snapshot, data } = loaded();
  tracker.update(snapshot);
  assert.equal(tracker.update({ ...snapshot, timestamp: 2000, seats: [], stale: true }), null);
  assert.deepEqual(tracker.update({ ...snapshot, timestamp: 3000 }).added, []);
  data.availability.expired = true;
  assert.equal(loaded(data).snapshot.stale, true);
  data.availability.expired = false; data.availability.expiryTimestamp = 4000;
  assert.equal(loaded(data).snapshot.stale, true);
});
test('older data is ignored, version changes wait for matching sources and start a new baseline', () => {
  const { inventory, snapshot, data } = loaded();
  assert.equal(inventory.accept('availability', { ...data.availability, timestamp: 500 }, identity), null);
  assert.equal(inventory.accept('availability', { ...data.availability, timestamp: 2000, seatmapVersion: 8 }, identity), null);
  assert.equal(inventory.accept('seatmap', { ...data.seatmap, seatmapVersion: 8 }, identity), null);
  // The next complete availability response confirms the new version.
  inventory.accept('mapping', { ...data.mapping, seatmapVersion: 8 }, identity);
  const next = inventory.accept('availability', { ...data.availability, timestamp: 2000, seatmapVersion: 8 }, identity);
  const tracker = new Tracker(); tracker.update(snapshot);
  assert.equal(tracker.update(next).baseline, true);
  assert.equal(tracker.update({ ...next, timestamp: 1500 }), null);
});
test('unknown schema, missing mappings and invalid status cannot turn an error into an empty inventory', () => {
  const { inventory, snapshot, data } = loaded();
  assert.throws(() => inventory.accept('availability', { ...data.availability, timestamp: 2000, seats: [[99999, 1]] }, identity), /unvollständig/);
  assert.throws(() => inventory.accept('availability', { ...data.availability, timestamp: 2000, seats: [[1001, 3]] }, identity), /Sitzstatus/);
  assert.throws(() => inventory.accept('availability', { ...data.availability, seatmapId: '999' }, identity), /Zuordnung/);
  assert.equal(inventory.last, snapshot);
  const malformed = fixture(); malformed.mapping.seats[0][1] = 99;
  assert.throws(() => loaded(malformed), /Mapping-Sperrstatus/);
});
