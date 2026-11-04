const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=file=>fs.readFileSync(path.join(__dirname,'../extension',file),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}});
  await page.setContent('<button id="nav"><i class="fa fa-shopping-cart"></i></button><button id="add"><i class="fa fa-cart-plus"></i></button><style>button{width:80px;height:60px}</style>');
  await page.addScriptTag({content:source('cart.js')});await page.addScriptTag({content:source('zoom.js')});
  assert.deepEqual(await page.evaluate(()=>TicketCart.findActions().map(x=>x.element.id)),['add']);
  console.log('PASS: unlabeled cart-plus icon is recognized; ordinary shopping-cart icon is not');
  await page.setContent('<button id="quantity" aria-label="Anzahl erhöhen">+</button><button id="zoom" aria-label="Zoom in">+</button>');
  assert.equal(await page.evaluate(()=>TicketZoom.findZoomIn()?.element.id),'zoom');
  await page.locator('#zoom').evaluate(el=>el.disabled=true);
  assert.equal(await page.evaluate(()=>TicketZoom.findZoomIn()),null);
  console.log('PASS: map zoom is distinguished from ticket quantity and disabled controls');

 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
