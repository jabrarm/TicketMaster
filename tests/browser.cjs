const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const scripts=['detector.js','cart.js','zoom.js','overview.js','content.js'];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  async function fixture(options={}){
   const page=await browser.newPage({viewport:{width:1000,height:800}});
   await page.setContent(`<style>body{margin:0}#arena{position:absolute;inset:20px;background:#fff}#mini{display:none;position:fixed;left:800px;top:60px;width:160px;height:120px;background:white}#seat{display:none;position:fixed;left:500px;top:450px;width:16px;height:16px;border-radius:50%;background:#a3a56c}</style><div id="arena"><div id="mini" class="${options.manual?'':'minimap'}"></div><div id="seat"></div></div>`);
   await page.evaluate(options=>{
    window.events=[];window.ticks=0;window.openBlock=options.openBlock!==false;window.cancelAfter=options.cancelAfter||'';window.free=options.free!==false;
    const mini=document.querySelector('#mini'),arena=document.querySelector('#arena'),seat=document.querySelector('#seat');
    function cancel(){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}
    function block(){events.push('block');if(cancelAfter==='block')cancel();if(openBlock){arena.style.background='#fff';seat.style.display='block';}if(options.canvas){free=false;draw();}else mini.querySelector('#S1,#generated-shape').setAttribute('fill','#eaeaea');}
    function draw(){const c=document.querySelector('canvas').getContext('2d');c.fillStyle='white';c.fillRect(0,0,160,120);c.fillStyle='#366c23';c.fillRect(56,40,48,35);c.strokeStyle='white';c.lineWidth=2;c.beginPath();c.moveTo(80,40);c.lineTo(80,75);c.moveTo(56,57);c.lineTo(104,57);c.stroke();c.strokeStyle='blue';c.strokeRect(48,30,64,55);c.fillStyle=free?'#a3a56c':'#eaeaea';c.fillRect(70,6,20,10);}
    window.makeAvailable=()=>{free=true;if(options.canvas)draw();else mini.querySelector('#S1,#generated-shape').setAttribute('fill','#a3a56c');};
    if(options.canvas){mini.innerHTML='<canvas width="160" height="120"></canvas>';draw();let hovered=false;mini.addEventListener('mousemove',event=>{hovered=event.clientY<85;});mini.onclick=event=>{if(event.clientY<85&&(!options.requireHover||hovered))block();else events.push('wrong-overview-target');};}
    else{mini.innerHTML='<svg width="160" height="120"><rect id="pitch" x="56" y="40" width="48" height="35" fill="#366c23"/><rect id="viewport" x="48" y="30" width="64" height="55" fill="none" stroke="blue"/><rect id="N4" x="15" y="20" width="12" height="15" fill="#eaeaea"/><rect id="S1" x="70" y="6" width="20" height="10" fill="'+(free?'#a3a56c':'#eaeaea')+'"/></svg>';document.querySelector('#S1').onclick=block;document.querySelector('#pitch').onclick=()=>events.push('wrong-pitch');if(options.explicitUnavailable)document.querySelector('#S1').setAttribute('data-available','false');if(options.partialSvg)document.querySelector('#S1').id='generated-shape';}
    if(options.openBlock===false)seat.style.display='block';
    arena.addEventListener('wheel',event=>{event.preventDefault();ticks++;events.push(`zoom${ticks}`);if(options.respond!==false)arena.style.background=['#ddd','#bbb'][Math.min(ticks-1,1)];if(ticks===2&&options.respond!==false)mini.style.display='block';if(cancelAfter==='zoom1')cancel();},{passive:false});
    seat.onclick=()=>{events.push('seat');if(cancelAfter==='seat')cancel();const button=document.createElement('button');button.id='add';button.title='cart add';button.style='position:fixed;right:25px;bottom:25px;width:95px;height:60px';button.innerHTML='<svg width="24" height="24"><path d="M0 0h6l4 15h13" stroke="black" fill="none"/></svg>';button.onclick=()=>events.push('cart');document.body.append(button);};
    window.chrome={runtime:{sendMessage:()=>captureForTest()}};
   },options);
   await page.exposeFunction('captureForTest',async()=>({data:`data:image/png;base64,${(await page.screenshot()).toString('base64')}`}));
   for(const file of scripts)await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension',file),'utf8')});
   const host=page.locator('#tm-watcher-host');
   await host.locator('#map').click();await page.mouse.move(40,40);await page.mouse.down();await page.mouse.move(960,760);await page.mouse.up();
   assert.equal(await host.locator('#blockName').count(),0);
   return {page,host,start:async(execute=true)=>{if(execute)await host.locator('#execute').check();await host.locator('#start').click();}};
  }
  for(const options of [{canvas:false},{canvas:true,requireHover:true},{partialSvg:true}]){
   const {page,host,start}=await fixture(options);await start();
   await page.waitForFunction(()=>events.includes('cart'),null,{timeout:15000});
   assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2','block','seat','cart']);
   assert.match(await host.locator('output').textContent(),/Ablauf beendet/);
   await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>ticks),2);
   console.log(`PASS: exactly two wheel steps → existing colored ${options.canvas?'Canvas requiring mousemove':options.partialSvg?'mixed known/unknown SVG':'SVG'} block → one seat click → tooltip-only cart add; no field/frame click`);await page.close();
  }
  {
   const {page,host}=await fixture({partialSvg:true});await page.evaluate(()=>{document.querySelector('#mini').style.display='block';});
   const before=await page.evaluate(()=>events.slice());await host.locator('#probe').click();
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Prüfung: Blockziel erkannt'));
   assert.deepEqual(await page.evaluate(()=>events),before);assert.equal(await host.locator('#export').isEnabled(),true);
   const download=page.waitForEvent('download');await host.locator('#export').click();assert.equal((await download).suggestedFilename(),'ticketmaster-blockdiagnose.png');
   console.log('PASS: current-view diagnostic finds a colored block and exports its marked crop without zooming or clicking');await page.close();
  }
  {
   const {page,start}=await fixture();await start(false);
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Test abgeschlossen'),null,{timeout:8000});
   assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2']);
   console.log('PASS: dry run zooms twice and confirms a block, with no selection or cart clicks');await page.close();
  }
  {
   const {page,start}=await fixture({explicitUnavailable:true});await start();
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Warte auf einen farbig'),null,{timeout:8000});
   await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2']);await page.keyboard.press('Escape');
   console.log('PASS: explicit nonavailability overrides a colored block and is never bypassed by pixel fallback');await page.close();
  }
  {
   const {page,start}=await fixture({free:false});await start();
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.startsWith('Warte auf einen farbig'),null,{timeout:10000});
   assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2']);await page.evaluate(()=>makeAvailable());
   await page.waitForFunction(()=>events.includes('cart'),null,{timeout:12000});assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2','block','seat','cart']);
   console.log('PASS: newly appearing availability works without repeating the initial zoom');await page.close();
  }
  {
   const {page,host,start}=await fixture({manual:true});await start();
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Bitte jetzt'),null,{timeout:8000});
   await host.locator('#overview').click();await page.mouse.move(800,60);await page.mouse.down();await page.mouse.move(960,180);await page.mouse.up();
   await page.waitForFunction(()=>events.includes('cart'),null,{timeout:12000});assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2','block','seat','cart']);
   console.log('PASS: first-use overview selection resumes after zoom without any extra wheel steps');await page.close();
  }
  {
   const {page,start}=await fixture({openBlock:false});await start();await page.waitForFunction(()=>events.includes('block'),null,{timeout:8000});
   await page.waitForTimeout(1600);assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2','block']);await page.keyboard.press('Escape');
   console.log('PASS: changing only the minimap after a failed block opening never permits the already visible seat or cart to be clicked');await page.close();
  }
  for(const cancelAfter of ['zoom1','block','seat']){
   const {page,start}=await fixture({cancelAfter});await start();const awaited=cancelAfter==='zoom1'?'zoom1':cancelAfter;
   await page.waitForFunction(value=>events.includes(value),awaited,{timeout:12000});await page.waitForTimeout(500);
   const expected=cancelAfter==='zoom1'?['zoom1']:cancelAfter==='block'?['zoom1','zoom2','block']:['zoom1','zoom2','block','seat'];
   assert.deepEqual(await page.evaluate(()=>events),expected);console.log(`PASS: Escape after ${cancelAfter} cancels all remaining actions`);await page.close();
  }
  {
   const {page,host,start}=await fixture();
   await page.evaluate(()=>{const button=document.createElement('button');button.title='cart add';button.textContent='+';document.body.append(button);});
   await start();assert.match(await host.locator('output').textContent(),/bestehende Platzauswahl/);assert.deepEqual(await page.evaluate(()=>events),[]);
   console.log('PASS: an existing selected-ticket add action blocks starting a fresh selection');await page.close();
  }
  {
   const {page,start}=await fixture({respond:false});await start();
   await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('keine sichtbare Kartenänderung'),null,{timeout:10000});
   assert.deepEqual(await page.evaluate(()=>events),['zoom1','zoom2']);
   console.log('PASS: unresponsive synthetic wheel input stops before any block, seat or cart click');await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
