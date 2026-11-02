const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectChange } = require('../extension/detector.js');
const frame = (color) => Uint8ClampedArray.from(Array.from({ length: 24 * 24 }, () => [...color, 255]).flat());
test('unchanged gray does not trigger', () => {
  assert.equal(detectChange(frame([235, 235, 235]), frame([235, 235, 235]), 24, 24), null);
});
test('gray becoming colored identifies a changed position', () => {
  const result = detectChange(frame([235, 235, 235]), frame([100, 110, 0]), 24, 24);
  assert.ok(result && result.x >= 0 && result.x < 24 && result.y >= 0 && result.y < 24);
});
test('existing white, black and colored elements cannot trigger', () => {
  for (const color of [[255, 255, 255], [0, 0, 0], [100, 110, 0]]) {
    assert.equal(detectChange(frame(color), frame([0, 180, 100]), 24, 24), null);
  }
});
test('small rendering fluctuations and isolated changed pixels are ignored', () => {
  const baseline = frame([235, 235, 235]);
  assert.equal(detectChange(baseline, frame([228, 230, 228]), 24, 24), null);
  const changed = baseline.slice(); changed[0] = 0;
  assert.equal(detectChange(baseline, changed, 24, 24), null);
});
