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
function circle(color) {
  const result=frame([235,235,235]);
  for(let y=0;y<24;y++)for(let x=0;x<24;x++)if(Math.hypot(x-11.5,y-11.5)<6){const i=(y*24+x)*4;result.set([...color,255],i);}
  return result;
}
test('already colored availability is detected without a gray reference',()=>{
  assert.ok(findAvailable(frame([108,116,0]),24,24,'#6c7400'));
  assert.equal(findAvailable(frame([235,235,235]),24,24,'#6c7400'),null);
});
test('seat search rejects large block shapes and accepts small seat shapes',()=>{
  const color=Uint8ClampedArray.from(Array.from({length:100*100},()=>[108,116,0,255]).flat());
  assert.equal(findAvailable(color,100,100,'#6c7400',true),null);
  assert.ok(findAvailable(circle([108,116,0]),24,24,'#6c7400',true));
});
test('round nongray seats are detected across colors including screenshot muted olive',()=>{
  for(const rgb of [[163,165,108],[108,116,0],[20,150,210],[210,50,30]]) assert.ok(findAvailable(circle(rgb),24,24,null,true));
  for(const rgb of [[235,235,235],[255,255,255],[0,0,0],[120,120,120]]) assert.equal(findAvailable(circle(rgb),24,24,null,true),null);
});
test('square colored areas cannot masquerade as round seats',()=>{
  assert.equal(findAvailable(frame([108,116,0]),24,24,null,true),null);
});
test('explicitly excluded pitch pixels never count as block availability',()=>{
  const pitch=frame([54,108,35]);
  assert.ok(findAvailable(pitch,24,24,null,false));
  for(let i=3;i<pitch.length;i+=4)pitch[i]=0;
  assert.equal(findAvailable(pitch,24,24,null,false),null);
});
test('seat search requires actual scene replacement',()=>{
  assert.equal(sceneChanged(frame([235,235,235]),frame([235,235,235])),false);
  assert.equal(sceneChanged(frame([235,235,235]),frame([100,110,0])),true);
});
test('gray block scene transitions are recognized without reacting to minor rendering noise',()=>{
  assert.equal(sceneChanged(frame([250,250,250]),frame([217,228,226])),true);
  assert.equal(sceneChanged(frame([235,235,235]),frame([228,230,228])),false);
});
test('tiny colored points can anchor zoom but cannot be selected as seats',()=>{
  const tiny=frame([255,255,255]);
  for(let y=10;y<13;y++)for(let x=10;x<13;x++)tiny.set([163,165,108,255],(y*24+x)*4);
  assert.ok(findAvailable(tiny,24,24,null,'tiny'));
  assert.equal(findAvailable(tiny,24,24,null,true),null);
});
test('miniature colored block marker is found while the central pitch and blue outline are excluded',()=>{
  const width=160,height=120,data=new Uint8ClampedArray(width*height*4).fill(255);
  const paint=(x,y,w,h,color)=>{for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)data.set([...color,255],(row*width+col)*4);};
  paint(56,40,48,35,[54,108,35]);
  paint(48,30,64,1,[0,0,255]);paint(48,84,64,1,[0,0,255]);paint(48,30,1,55,[0,0,255]);paint(111,30,1,55,[0,0,255]);
  assert.equal(findAvailable(data,width,height,null,'block-marker'),null);
  paint(70,6,20,10,[163,165,108]);
  const point=findAvailable(data,width,height,null,'block-marker');
  assert.ok(point&&point.x>=70&&point.x<90&&point.y>=6&&point.y<16);
});
test('masked minimap changes cannot be mistaken for an opened main block view',()=>{
  const before=frame([235,235,235]),after=frame([108,116,0]);
  for(let i=3;i<before.length;i+=4){before[i]=0;after[i]=0;}
  assert.equal(sceneChanged(before,after),false);
});
