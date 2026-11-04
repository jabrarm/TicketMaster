const {chromium}=require('playwright');const http=require('node:http');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tm-native-'));let context;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<style>#target{position:absolute;left:20px;top:20px;width:100px;height:40px}#map{position:absolute;left:20px;top:100px;width:300px;height:200px;background:#eee}</style><button id="target">Test</button><div id="map"></div><script>window.events=[];target.onclick=e=>events.push({type:"click",trusted:e.isTrusted});map.addEventListener("wheel",e=>{e.preventDefault();events.push({type:"wheel",trusted:e.isTrusted,delta:e.deltaY});},{passive:false});</script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  context=await chromium.launchPersistentContext(path.join(temp,'profile'),{headless:true,ignoreDefaultArgs:['--disable-extensions'],executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--enable-remote-extensions','--enable-unsafe-extension-debugging',`--disable-extensions-except=${path.resolve(__dirname,'../extension')}`,`--load-extension=${path.resolve(__dirname,'../extension')}`]});
  const browserSession=await context.browser().newBrowserCDPSession();
  const workerPromise=context.waitForEvent('serviceworker',{timeout:10000});
  const [worker]=await Promise.all([workerPromise,browserSession.send('Extensions.loadUnpacked',{path:path.resolve(__dirname,'../extension')})]);
  const page=await context.newPage();const url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url);await page.bringToFront();
  const connection=await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(tab=>tab.url===url);return{tabId:tab.id,...await TicketNativeHost.connect(tab.id)};},url);
  const run=await worker.evaluate(data=>TicketNativeHost.begin(data.tabId,data.connection),connection);
  await worker.evaluate(data=>TicketNativeHost.input(data.tabId,data.connection,data.run,'wheel',{x:100,y:150}),{...connection,...run});
  await worker.evaluate(data=>TicketNativeHost.input(data.tabId,data.connection,data.run,'click',{x:70,y:40}),{...connection,...run});
  assert.deepEqual(await page.evaluate(()=>events),[{type:'wheel',trusted:true,delta:-100},{type:'click',trusted:true}]);
  console.log('PASS: real extension chrome.debugger sends trusted wheel and click events to the active local test tab');
  await worker.evaluate(data=>TicketNativeHost.end(data.tabId,data.connection,data.run),{...connection,...run});
  assert.match(await worker.evaluate(async data=>{try{await TicketNativeHost.input(data.tabId,data.connection,data.run,'click',{x:70,y:40});return '';}catch(error){return error.message;}},{...connection,...run}),/abgebrochen/);
  assert.equal(await page.evaluate(()=>events.length),2);
  console.log('PASS: ended native run cannot dispatch another click');
  await worker.evaluate(data=>TicketNativeHost.disconnect(data.tabId,data.connection),connection);
 }finally{await context?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
