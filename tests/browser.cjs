const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:900}});
    await page.setContent(`<style>body{margin:0}#plan{position:absolute;left:70px;top:70px;width:350px;height:280px;background:#fafafa}#block{position:absolute;left:40px;top:40px;width:80px;height:60px;background:#6c7400}#seat{display:none;position:absolute;left:180px;top:150px;width:16px;height:16px;border-radius:50%;background:#6c7400}#cart{position:absolute;right:30px;bottom:30px}</style><div id="plan"><div id="block"></div><div id="seat"></div></div><button id="cart" disabled>Warenkorb</button>`);
    await page.evaluate(()=>{
      window.events=[];window.openScene=true;window.cancelAt='';
      const cancel=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      document.querySelector('#block').onclick=()=>{
        events.push('block');
        if(cancelAt==='block') cancel();
        if(openScene){document.querySelector('#plan').style.background='#d9e4e2';document.querySelector('#block').style.display='none';document.querySelector('#seat').style.display='block';}
      };
      document.querySelector('#seat').onclick=()=>{
        events.push('seat');document.querySelector('#cart').disabled=false;
        if(cancelAt==='seat') cancel();
      };
      document.querySelector('#cart').onclick=()=>events.push('cart');
      window.reset=()=>{events=[];document.querySelector('#block').style.display='block';document.querySelector('#seat').style.display='none';document.querySelector('#plan').style.background='#fafafa';document.querySelector('#cart').disabled=true;};
    });
    await page.exposeFunction('captureForTest',async()=>({data:`data:image/png;base64,${(await page.screenshot()).toString('base64')}`}));
    await page.evaluate(()=>window.chrome={runtime:{sendMessage:()=>captureForTest()}});
    for(const file of ['detector.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../extension',file),'utf8')});
    const host=page.locator('#tm-watcher-host');
    await host.locator('#mode').selectOption('blocks');
    for(const id of ['area','seats']){
      await host.locator('#'+id).click();await page.mouse.move(75,75);await page.mouse.down();await page.mouse.move(415,345);await page.mouse.up();
    }
    await host.locator('#next').click();await page.mouse.click(1020,855);
    const output=host.locator('output');
    await host.locator('#start').click();
    await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Keine Klicks'));
    assert.deepEqual(await page.evaluate(()=>events),[]);
    console.log('PASS: already available colored block detected in test mode without clicks');
    await host.locator('#automatic').check();await host.locator('#start').click();
    await page.waitForFunction(()=>events.length===3,null,{timeout:8000});
    assert.deepEqual(await page.evaluate(()=>events),['block','seat','cart']);
    await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>events.length),3);
    console.log('PASS: block opens, individual free seat selected, cart clicked once in order');
    await page.evaluate(()=>{reset();openScene=false;});await host.locator('#start').click();
    await page.waitForFunction(()=>events.length===1);
    await page.waitForTimeout(1800);assert.deepEqual(await page.evaluate(()=>events),['block']);
    await page.keyboard.press('Escape');
    console.log('PASS: unchanged block overview cannot be mistaken for a seat view');
    for(const phase of ['block','seat']){
      await page.evaluate(phase=>{reset();openScene=true;cancelAt=phase;},phase);
      await host.locator('#start').click();
      await page.waitForFunction(phase=>events.includes(phase),phase,{timeout:8000});
      await page.waitForTimeout(800);
      assert.deepEqual(await page.evaluate(()=>events),phase==='block'?['block']:['block','seat']);
      console.log(`PASS: Escape after ${phase} cancels all remaining actions`);
    }
    await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
    await host.locator('#start').click();assert.match(await output.textContent(),/Markiere zuerst/);
    console.log('PASS: changed viewport invalidates configured coordinates');
    await host.locator('#mode').selectOption('direct');
    await page.evaluate(()=>{reset();cancelAt='';document.querySelector('#block').style.display='none';document.querySelector('#seat').style.display='block';document.querySelector('#seat').style.background='#a3a56c';});
    await host.locator('#seats').click();await page.mouse.move(75,75);await page.mouse.down();await page.mouse.move(415,345);await page.mouse.up();
    await host.locator('#next').click();await page.mouse.click(1020,855);
    await host.locator('#automatic').uncheck();await host.locator('#start').click();
    await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('Freier farbiger Platz erkannt'));
    assert.deepEqual(await page.evaluate(()=>events),[]);
    console.log('PASS: direct mode detects muted olive round seat without color configuration or block click');
    await host.locator('#automatic').check();await host.locator('#start').click();
    await page.waitForFunction(()=>events.length===2,null,{timeout:8000});
    assert.deepEqual(await page.evaluate(()=>events),['seat','cart']);
    console.log('PASS: direct mode performs one seat click followed by cart, without opening a block');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
