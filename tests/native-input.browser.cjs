const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');const {webcrypto}=require('node:crypto');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:800}});const cdp=await page.context().newCDPSession(page);
  await page.setContent('<style>body{margin:0}#arena{position:absolute;inset:20px;background:white}#mini{display:none;position:fixed;left:800px;top:60px;width:160px;height:120px;background:white}#seat{display:none;position:fixed;left:500px;top:450px;width:16px;height:16px;border-radius:50%;background:#a3a56c}</style><div id="arena"><div id="mini" class="minimap"><svg width="160" height="120"><rect id="empty" x="15" y="20" width="12" height="15" fill="#eaeaea"/><rect id="freeBlock" x="70" y="6" width="20" height="10" fill="#eaeaea"/></svg></div><div id="seat"></div></div>');
  await page.evaluate(()=>{
   window.events=[];let ticks=0;
   arena.addEventListener('wheel',event=>{if(!event.isTrusted){events.push('untrusted');return;}event.preventDefault();events.push('zoom');ticks++;arena.style.background=ticks===1?'#ddd':'#bbb';if(ticks===2)mini.style.display='block';},{passive:false});
   empty.onclick=event=>{if(!event.isTrusted){events.push('untrusted');return;}events.push('empty');arena.style.background='#e0e0e0';seat.style.display='none';};
   freeBlock.onclick=event=>{if(!event.isTrusted){events.push('untrusted');return;}events.push('block');arena.style.background='white';seat.style.display='block';};
   seat.onclick=event=>{if(!event.isTrusted){events.push('untrusted');return;}events.push('seat');const button=document.createElement('button');button.id='add';button.title='cart add';button.style='position:fixed;right:25px;bottom:25px;width:95px;height:60px';button.onclick=event=>events.push(event.isTrusted?'cart':'untrusted');document.body.append(button);};
  });
  let attached=false,activeTabId=1;
  const bridge={console,setTimeout,URL,crypto:webcrypto,chrome:{
   tabs:{get:async()=>({id:1,windowId:1,url:'http://127.0.0.1/local-test'}),query:async()=>[{id:activeTabId}],onUpdated:{addListener(){}},sendMessage:async()=>{}},
   debugger:{attach:async()=>{attached=true;},detach:async()=>{attached=false;},onDetach:{addListener(){}},sendCommand:async(target,method,params)=>{assert.equal(attached,true);return cdp.send(method,params);}}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/native-host.js'),'utf8'),bridge);
  const host=bridge.TicketNativeHost;
  await page.exposeFunction('extensionRpc',async message=>{
   try{
    if(message.type==='capture')return{data:`data:image/png;base64,${(await page.screenshot()).toString('base64')}`};
    if(message.type==='nativeConnect')return await host.connect(1);
    if(message.type==='nativeBegin')return await host.begin(1,message.connection);
    if(message.type==='nativeInput')return await host.input(1,message.connection,message.run,message.kind,message.point);
    if(message.type==='nativeEnd')return await host.end(1,message.connection,message.run);
    if(message.type==='nativeDisconnect')return await host.disconnect(1,message.connection);
    throw new Error('Unknown message');
   }catch(error){return{error:error.message};}
  });
  await page.evaluate(()=>{window.saved={};window.chrome={runtime:{sendMessage:message=>extensionRpc(message)},storage:{local:{get:async key=>({[key]:saved[key]}),set:async value=>Object.assign(saved,value),remove:async key=>delete saved[key]}}};});
  for(const file of ['detector.js','cart.js','zoom.js','overview.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension',file),'utf8')});
  const ui=page.locator('#tm-watcher-host');await ui.locator('#native').check();await ui.locator('#connect').click();
  await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('#connectionInfo').textContent.startsWith('Browser-Steuerung verbunden'));
  await ui.locator('#map').click();await page.mouse.move(40,40);await page.mouse.down();await page.mouse.move(960,760);await page.mouse.up();
  await ui.locator('#scanSeconds').fill('2');await ui.locator('#execute').check();await ui.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Jetzt „Blockpunkte'));
  await ui.locator('#learnBlocks').click();await page.mouse.click(821,87);await page.mouse.click(880,71);assert.deepEqual(await page.evaluate(()=>events),['zoom','zoom']);await page.keyboard.press('Enter');
  await page.waitForFunction(()=>events.includes('cart'),null,{timeout:16000});
  assert.deepEqual(await page.evaluate(()=>events),['zoom','zoom','empty','block','seat','cart']);
  console.log('PASS: full learned-point workflow uses genuine trusted CDP wheel/click events on a page that rejects all synthetic inputs (Chrome API attach is bridged)');
  const stored=await page.evaluate(()=>Object.values(saved).find(value=>value?.points)?.points.length);assert.equal(stored,2);
  console.log('PASS: learned block points are persisted without typing block names');
  const connection=await host.connect(1);const run=await host.begin(1,connection.connection);await host.end(1,connection.connection,run.run);
  await assert.rejects(host.input(1,connection.connection,run.run,'click',{x:880,y:71}),/abgebrochen/);
  const next=await host.begin(1,connection.connection);activeTabId=2;await assert.rejects(host.input(1,connection.connection,next.run,'click',{x:880,y:71}),/sichtbar/);activeTabId=1;
  await assert.rejects(host.input(2,connection.connection,next.run,'click',{x:880,y:71}),/Verbindung fehlt/);
  console.log('PASS: ended runs and inactive tabs cannot dispatch a native click');
  await ui.locator('#close').click();await page.waitForTimeout(100);assert.equal(attached,false);
  console.log('PASS: closing the watcher disconnects its browser-input connection');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8')});
  assert.match(await page.locator('#tm-watcher-host').locator('#pointInfo').textContent(),/2 Blockpunkte gelernt/);
  console.log('PASS: a freshly opened watcher restores the saved block-point calibration');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
