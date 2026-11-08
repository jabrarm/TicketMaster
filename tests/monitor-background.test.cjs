const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('toolbar toggles only the selected tab monitor and exposes no capture or debugger channel', async () => {
  let click; const calls = [];
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8'), {
    console, chrome: { action: { onClicked: { addListener: fn => { click = fn; } } }, scripting: { executeScript: async arg => calls.push(arg) } }
  });
  await click({}); assert.equal(calls.length, 0);
  await click({ id: 19 }); assert.equal(calls.length, 1); assert.equal(calls[0].target.tabId, 19);
  const events = [];
  vm.runInNewContext('(' + calls[0].func.toString() + ')()', { window: { dispatchEvent: event => events.push(event.type) }, CustomEvent: class { constructor(type) { this.type = type; } } });
  assert.deepEqual(events, ['ticket-data-monitor-toggle']);
});
