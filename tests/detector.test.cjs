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
const {findAvailable,sceneChanged}=require('../extension/detector.js');
test('already colored availability is detected without a gray reference',()=>{
  assert.ok(findAvailable(frame([108,116,0]),24,24,'#6c7400'));
  assert.equal(findAvailable(frame([235,235,235]),24,24,'#6c7400'),null);
});
test('seat search rejects large block shapes and accepts small seat shapes',()=>{
  const color=Uint8ClampedArray.from(Array.from({length:100*100},()=>[108,116,0,255]).flat());
  assert.equal(findAvailable(color,100,100,'#6c7400',true),null);
  assert.ok(findAvailable(frame([108,116,0]),24,24,'#6c7400',true));
});
test('seat search requires actual scene replacement',()=>{
  assert.equal(sceneChanged(frame([235,235,235]),frame([235,235,235])),false);
  assert.equal(sceneChanged(frame([235,235,235]),frame([100,110,0])),true);
});
