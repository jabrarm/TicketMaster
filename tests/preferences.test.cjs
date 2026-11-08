const { test } = require('node:test');
const assert = require('node:assert/strict');
const prefs = require('../extension/preferences.js');
const snapshot = seats => ({ inventory: 'tixx-1001-674379', version: '1', checkedAt: Date.now(), stale: false, seats });
const seat = (id, category = 'PK8 VIP-Rang Platin', extra = {}) => ({ id, category, block: 'N1', row: '20', ...extra });
test('catalogue contains all image groups and five distinct VIP options, including the trailing-dot variant', () => {
  assert.deepEqual(prefs.catalog.map(g => g.children.length), [4, 6, 5, 1, 2, 5]);
  for (const [name, id] of [['PK8 VIP-Rang Platin', 'vip-platin'], ['PK8 Partner des Fu&#223;balls.-Lounge', 'vip-partner'], ['PK8 VIP-Club Ost', 'vip-ost'], ['PK8 VIP-Club Ost.', 'vip-ost-dot'], ['PK8 VIP-Rang Gold', 'vip-gold']]) assert.equal(prefs.match(seat(1, name)), id);
  assert.equal(prefs.match(seat(1, 'PK8 VIP-Rang Gold Select')), null);
});
test('regular subcategories require explicit regional data and respect row ranges', () => {
  assert.equal(prefs.match(seat(1, 'PK1', { blockDescription: 'Nord Mitte Unterrang', row: '10' })), 'pk1-nmu');
  assert.equal(prefs.match(seat(1, 'PK1', { blockDescription: 'Nord Mitte Unterrang', row: '9' })), null);
  assert.equal(prefs.match(seat(1, 'PK1')), 'pk1:*');
});
test('group order and child exclusions determine fallback selection exactly', () => {
  const config = prefs.defaults(); config.quantity = 2; config.adjacent = false;
  const vip = config.groups.at(-1); vip.children.unshift(vip.children.pop());
  vip.children.find(c => c.id === 'vip-ost-dot').enabled = false;
  const result = prefs.plan(snapshot([seat(1), seat(2, 'PK8 VIP-Rang Gold'), seat(3, 'PK8 VIP-Club Ost.')]), config);
  assert.deepEqual(result.seats.map(s => s.id), [2, 1]);
  for (const child of vip.children) child.enabled = false;
  assert.equal(prefs.plan(snapshot([seat(1)]), { ...config, quantity: 1 }), null);
});
test('adjacent lower-priority seats are preferred; otherwise separated seats follow the preference order', () => {
  const config = prefs.defaults(); config.quantity = 2;
  const current = snapshot([seat(1), seat(10, 'PK8 VIP-Rang Gold', { group: 'g', order: 0, x: 0, y: 0, spacing: 10 }), seat(11, 'PK8 VIP-Rang Gold', { group: 'g', order: 1, x: 10, y: 0, spacing: 10 })]);
  const together = prefs.plan(current, config);
  assert.equal(together.adjacent, true); assert.deepEqual(together.seats.map(s => s.id), [10, 11]);
  current.seats[2].x = 100;
  const fallback = prefs.plan(current, config);
  assert.equal(fallback.adjacent, false); assert.deepEqual(fallback.seats.map(s => s.id), [1, 10]);
});
test('gaps, missing geometry, stale data and incomplete quantities cannot become a confirmed adjacent batch', () => {
  const config = prefs.defaults(); config.quantity = 2;
  const current = snapshot([seat(1, undefined, { group: 'g', order: 0, x: 0, y: 0, spacing: 10 }), seat(3, undefined, { group: 'g', order: 1, x: 10, y: 0, spacing: 10 })]);
  assert.equal(prefs.plan(current, config).adjacent, false);
  assert.equal(prefs.plan({ ...current, stale: true }, config), null);
  assert.equal(prefs.plan({ ...current, checkedAt: 0 }, config), null);
  assert.equal(prefs.plan(snapshot([seat(1)]), config), null);
});
test('invalid counts, duplicate groups and unknown children are rejected', () => {
  assert.throws(() => prefs.validate({ ...prefs.defaults(), quantity: 7 }));
  const config = prefs.defaults(); config.groups[1] = config.groups[0];
  assert.throws(() => prefs.validate(config));
});
test('recently received expired cache entries are tentative cart candidates, never fresh availability notifications', () => {
  const current = { ...snapshot([seat(1)]), stale: true, validUntil: Date.now() - 1000 };
  const config = prefs.defaults();
  assert.equal(prefs.plan(current, config), null);
  assert.equal(prefs.candidates(current, config).seats[0].id, 1);
  assert.equal(prefs.candidates({ ...current, checkedAt: Date.now() - 120001 }, config), null);
  assert.equal(prefs.candidates({ ...current, checkedAt: NaN }, config), null);
});
test('partial planning takes an available single now, excludes secured seats, and prefers its later neighbour', () => {
  const config = { ...prefs.defaults(), quantity: 2 };
  const current = snapshot([seat(10, 'PK8 VIP-Rang Gold', { group: 'g', order: 0, x: 0, y: 0, spacing: 10 })]);
  assert.equal(prefs.partialCandidates(current, config).seats.length, 1);
  const secured = [{ ...current.seats[0], inventory: current.inventory, version: current.version }];
  current.seats.push(seat(1), seat(11, 'PK8 VIP-Rang Gold', { group: 'g', order: 1, x: 10, y: 0, spacing: 10 }));
  const remaining = prefs.partialCandidates(current, config, 1, secured);
  assert.equal(remaining.seats[0].id, 11); assert.equal(remaining.adjacent, true);
});
test('a raw PK1 offer is allowed only for a fully enabled parent, never after a child exclusion', () => {
  const config = prefs.defaults(), current = snapshot([seat(1, 'PK1')]);
  assert.equal(prefs.candidates(current, config).seats[0].id, 1);
  config.groups[0].children[0].enabled = false;
  assert.equal(prefs.candidates(current, config), null);
});
