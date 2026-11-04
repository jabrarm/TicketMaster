const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:600,height:500}});
  await page.setContent('<svg width="200" height="160"><path id="S1" fill="#a3a56c" d="M10 10H80V18H18V80H10Z"/></svg>');
  for(const name of ['cart.js','overview.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension',name),'utf8')});
  const result=await page.evaluate(()=>{const shape=document.querySelector('#S1'),rect={x:0,y:0,width:220,height:180};const old=TicketCart.pointFor(shape),found=TicketOverview.inspect(rect).candidates[0];const local=new DOMPoint(found.x,found.y).matrixTransform(shape.getScreenCTM().inverse());return{old:!!old,found:!!found,inside:shape.isPointInFill(local),x:found.x,y:found.y};});
  assert.equal(result.old,false);assert.equal(result.found,true);assert.equal(result.inside,true);
  console.log('PASS: concave stadium block is found and targeted inside its actual painted geometry, despite an empty bounding-box center');
  await page.setContent('<svg width="200" height="160"><rect id="S1" x="10" y="10" width="70" height="50" fill="color(srgb 0.64 0.65 0.42)"/><text x="30" y="40" font-size="20">S1</text></svg>');
  assert.equal(await page.evaluate(()=>TicketOverview.inspect({x:0,y:0,width:200,height:160}).candidates.length),1);
  console.log('PASS: modern CSS color and an overlaid SVG label do not prevent detecting the colored block');
  await page.setContent('<svg width="200" height="160"><rect id="S1" x="10" y="10" width="70" height="50" fill="white" stroke="#a3a56c" stroke-width="3"/></svg>');
  assert.equal(await page.evaluate(()=>TicketOverview.inspect({x:0,y:0,width:200,height:160}).candidates.length),1);
  console.log('PASS: colored block borders are supported');
  await page.setContent('<svg width="200" height="160"><g id="generated-99"><rect x="10" y="10" width="70" height="50" fill="#a3a56c"/><text x="30" y="40">S1</text></g></svg>');
  assert.equal(await page.evaluate(()=>TicketOverview.inspect({x:0,y:0,width:200,height:160}).candidates.length),1);
  console.log('PASS: block labels associate generated SVG groups without any user-entered block name');
  await page.setContent('<svg width="200" height="160"><defs><symbol id="source"><rect width="30" height="20"/></symbol></defs><use id="S1" href="#source" x="10" y="10" width="30" height="20" fill="#a3a56c"/></svg>');
  assert.equal(await page.evaluate(()=>TicketOverview.inspect({x:0,y:0,width:200,height:160}).candidates.length),1);
  console.log('PASS: SVG use instances are recognized without selecting hidden symbol definitions');
  await page.setContent('<svg width="200" height="160"><rect id="S1" data-available="false" x="10" y="10" width="70" height="50" fill="#a3a56c"/></svg>');
  const blocked=await page.evaluate(()=>{const result=TicketOverview.inspect({x:0,y:0,width:200,height:160});return{candidates:result.candidates.length,excluded:result.excludedRects.length};});
  assert.deepEqual(blocked,{candidates:0,excluded:1});
  console.log('PASS: explicitly unavailable colored blocks produce a pixel exclusion, rather than globally disabling image recognition');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
