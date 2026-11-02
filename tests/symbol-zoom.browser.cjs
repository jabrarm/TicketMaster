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

  await page.setContent('<style>body{margin:0}#seat{position:absolute;left:120px;top:120px;width:3px;height:3px;border-radius:50%;background:#a3a56c}button.control{position:absolute;top:650px;width:80px;height:50px}#zoom{left:300px}#quantity{left:200px}</style><div id="seat"></div><button class="control" id="quantity" aria-label="Anzahl erhöhen">+</button><button class="control" id="zoom" aria-label="Zoom in">+</button>');
  await page.evaluate(()=>{
   window.events=[];window.saved={};
   window.chrome={runtime:{sendMessage:()=>captureForTest()},storage:{local:{get:async key=>({[key]:saved[key]}),set:async values=>Object.assign(saved,values),remove:async key=>delete saved[key]}}};
   document.querySelector('#quantity').onclick=()=>events.push('quantity');
   document.querySelector('#zoom').onclick=()=>{events.push('zoom');Object.assign(document.querySelector('#seat').style,{width:'16px',height:'16px'});};
   document.querySelector('#seat').onclick=()=>{
    events.push('seat');const button=document.createElement('button');button.id='symbol';button.style='position:fixed;right:30px;bottom:30px;width:100px;height:65px';button.innerHTML='<svg data-icon="cart-plus" width="30" height="30"><path d="M2 2h5l4 15h15" stroke="black" fill="none"/></svg>';button.onclick=()=>events.push('add');document.body.append(button);
   };
  });
  await page.exposeFunction('captureForTest',async()=>({data:`data:image/png;base64,${(await page.screenshot()).toString('base64')}`}));
  async function inject(){for(const file of ['detector.js','cart.js','zoom.js','content.js'])await page.addScriptTag({content:source(file)});}
  async function region(){const host=page.locator('#tm-watcher-host');await host.locator('#mode').selectOption('direct');await host.locator('#seats').click();await page.mouse.move(100,100);await page.mouse.down();await page.mouse.move(160,160);await page.mouse.up();return host;}
  await inject();let host=await region();await host.locator('#automatic').check();await host.locator('#start').click();
  await page.waitForFunction(()=>events.includes('add'),null,{timeout:8000});
  assert.deepEqual(await page.evaluate(()=>events),['zoom','seat','add']);
  console.log('PASS: tiny points cause a map zoom, followed by one seat click and the dynamically appearing icon-only add action');

  await page.evaluate(()=>{document.querySelector('#symbol').remove();const button=document.createElement('button');button.id='unlabelled';button.style='position:fixed;right:30px;bottom:30px;width:100px;height:65px';button.innerHTML='<svg width="30" height="30"><path d="M2 2h5l4 15h15" stroke="black" fill="none"/></svg>';button.onclick=()=>events.push('should-not-click');document.body.append(button);});
  assert.equal(await page.evaluate(()=>TicketCart.findActions().length),0);
  await host.locator('#learnCart').click();await page.mouse.click(1020,930);
  await page.waitForFunction(()=>Object.values(saved).includes('#unlabelled'));
  assert.deepEqual(await page.evaluate(()=>events),['zoom','seat','add']);
  console.log('PASS: an opaque SVG button is learned by stable selector without being clicked');
  await host.locator('#close').click();
  await page.evaluate(()=>{events=[];document.querySelector('#unlabelled').remove();document.querySelector('#seat').onclick=()=>{events.push('seat');const button=document.createElement('button');button.id='unlabelled';button.style='position:fixed;right:30px;bottom:30px;width:100px;height:65px';button.onclick=()=>events.push('learnedAdd');document.body.append(button);};});
  await inject();host=await region();assert.match(await host.locator('#learnCart').textContent(),/gelernt/);
  await host.locator('#automatic').check();await host.locator('#start').click();
  await page.waitForFunction(()=>events.includes('learnedAdd'),null,{timeout:5000});
  assert.deepEqual(await page.evaluate(()=>events),['seat','learnedAdd']);
  console.log('PASS: saved target is restored after reinjection and finds an initially absent replacement button');

  await page.evaluate(()=>{events=[];document.querySelector('#unlabelled').remove();Object.assign(document.querySelector('#seat').style,{width:'3px',height:'3px'});const proof=document.createElement('div');proof.id='proof';proof.style='position:absolute;left:145px;top:145px;width:10px;height:10px;background:#eee';document.body.append(proof);document.querySelector('#zoom').onclick=()=>{events.push('zoom');proof.style.background=events.length%2?'#999':'#eee';};});
  await host.locator('#start').click();await page.waitForFunction(()=>events.length===3,null,{timeout:7000});
  await page.waitForTimeout(1400);assert.deepEqual(await page.evaluate(()=>events),['zoom','zoom','zoom']);
  await page.keyboard.press('Escape');
  console.log('PASS: zoom is bounded to three attempts and no tiny seat or cart is clicked');
  await page.evaluate(()=>{events=[];document.querySelector('#proof').remove();document.querySelector('#zoom').remove();const map=document.createElement('div');map.id='map';map.style='position:absolute;left:90px;top:90px;width:100px;height:100px;background:white';document.body.append(map);const seat=document.querySelector('#seat');map.append(seat);seat.style.left='30px';seat.style.top='30px';map.addEventListener('wheel',event=>{event.preventDefault();events.push('wheel');Object.assign(seat.style,{width:'16px',height:'16px'});},{passive:false});});
  await host.locator('#start').click();await page.waitForFunction(()=>events.includes('learnedAdd'),null,{timeout:8000});
  assert.deepEqual(await page.evaluate(()=>events),['wheel','seat','learnedAdd']);
  console.log('PASS: absent zoom buttons use a wheel event over the tiny point, then seat and learned add target');
  await page.evaluate(()=>{events=[];document.querySelector('#unlabelled').remove();const map=document.querySelector('#map');const replacement=map.cloneNode(true);map.replaceWith(replacement);Object.assign(replacement.querySelector('#seat').style,{width:'3px',height:'3px'});replacement.addEventListener('wheel',()=>events.push('wheel'));});
  await host.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Kein sichtbarer Effekt'),null,{timeout:6000});
  await page.waitForTimeout(1000);assert.deepEqual(await page.evaluate(()=>events),['wheel']);await page.keyboard.press('Escape');
  console.log('PASS: an unresponsive map stops additional wheel attempts without clicking a seat or cart');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
