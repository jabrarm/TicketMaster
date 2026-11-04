const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../extension/background.js'), 'utf8');

function setup(activeTabs) {
  let handler, captures = 0;const nativeCalls=[];
  const context = { console, importScripts() {}, chrome: {
    action: { onClicked: { addListener() {} } },
    runtime: { id:'watcher',onMessage: { addListener(fn) { handler = fn; } } },
    tabs: { query: async () => [{ id: activeTabs.shift() }], captureVisibleTab: async () => { captures++; return 'image'; } }
  },TicketNativeHost:{connect:async tabId=>{nativeCalls.push(tabId);return{connection:'test-connection'};}} };
  vm.runInNewContext(source, context);
  return { request: () => new Promise(resolve => handler({ type: 'capture' }, { tab: { id: 5, windowId: 1 } }, resolve)), captures: () => captures,nativeCalls,native:()=>new Promise(resolve=>handler({type:'nativeConnect'},{id:'watcher',tab:{id:5,windowId:1}},resolve)),untrusted:()=>handler({type:'nativeConnect'},{id:'other-extension',tab:{id:5,windowId:1}},()=>{throw new Error('untrusted sender must not get a response');}) };
}
test('captures only the requesting active tab', async () => {
  const fixture = setup([5, 5]);
  assert.equal((await fixture.request()).data, 'image');
  assert.equal(fixture.captures(), 1);
});
test('an inactive requesting tab never captures another tab', async () => {
  const fixture = setup([6]);
  assert.match((await fixture.request()).error, /sichtbar/);
  assert.equal(fixture.captures(), 0);
});
test('a tab switch during capture discards the image', async () => {
  const fixture = setup([5, 6]);
  const result = await fixture.request();
  assert.match(result.error, /gewechselt/);
  assert.equal(result.data, undefined);
});
test('native connection is scoped to the requesting extension tab',async()=>{const fixture=setup([]);assert.equal((await fixture.native()).connection,'test-connection');assert.deepEqual(fixture.nativeCalls,[5]);});
test('other extension senders cannot request native input access',()=>{const fixture=setup([]);assert.equal(fixture.untrusted(),undefined);assert.deepEqual(fixture.nativeCalls,[]);});
