const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=file=>fs.readFileSync(path.join(__dirname,'../extension',file),'utf8');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:900}});
    await page.setContent('<button id="navigation">Warenkorb</button><button hidden>Add items</button>');
    await page.addScriptTag({content:source('cart.js')});
    await page.evaluate(()=>{window.actions=[];document.addEventListener('click',event=>actions.push(event.target.id));});
    const waiting=page.evaluate(async()=>{const found=await TicketCart.waitForAction({timeout:2000});return found.element.id;});
    await page.evaluate(()=>{
      const button=document.createElement('button');button.id='add';button.textContent='Add items';button.disabled=true;document.body.append(button);
      setTimeout(()=>{const replacement=button.cloneNode(true);replacement.id='replacement';button.replaceWith(replacement);setTimeout(()=>replacement.disabled=false,100);},100);
    });
    assert.equal(await waiting,'replacement');
    assert.deepEqual(await page.evaluate(()=>actions),[]);
    console.log('PASS: dynamic add button is discovered only after activation, including DOM replacement');
    await page.setContent('<button>Add items</button><button>In den Warenkorb</button>');
    assert.match(await page.evaluate(async()=>{try{await TicketCart.waitForAction({timeout:300});return '';}catch(error){return error.message;}}),/Mehrere aktive/);
    console.log('PASS: multiple enabled add buttons are rejected');
    await page.setContent('<button>Warenkorb</button><button disabled>Add items</button><button hidden>Add to cart</button>');
    assert.match(await page.evaluate(async()=>{try{await TicketCart.waitForAction({timeout:200});return '';}catch(error){return error.message;}}),/Keine eindeutige/);
    console.log('PASS: hidden, disabled and navigation-only targets cannot trigger a cart action');
    await page.setContent('<span id="description">In den Warenkorb</span><button id="icon" aria-labelledby="description">🛒</button>');
    assert.equal(await page.evaluate(()=>TicketCart.findActions()[0]?.element.id),'icon');
    await page.evaluate(()=>{const cover=document.createElement('div');cover.style='position:fixed;inset:0;background:white';document.body.append(cover);});
    assert.equal(await page.evaluate(()=>TicketCart.findActions().length),0);
    console.log('PASS: accessible icon labels are supported and covered buttons are excluded');
    await page.setContent('<p>Keine Schaltfläche</p>');
    assert.match(await page.evaluate(async()=>{const controller=new AbortController();const result=TicketCart.waitForAction({signal:controller.signal,timeout:1000}).catch(error=>error.message);controller.abort();return result;}),/abgebrochen/);
    console.log('PASS: abort cancels a pending dynamic button search');

    // Actual content-script flow: no cart exists during configuration.
    await page.setContent('<style>body{margin:0}#seat{position:absolute;left:120px;top:120px;width:16px;height:16px;border-radius:50%;background:#a3a56c}</style><div id="seat"></div>');
    await page.evaluate(()=>{
      window.events=[];
      document.querySelector('#seat').onclick=()=>{
        events.push('seat');setTimeout(()=>{const button=document.createElement('button');button.id='dynamic';button.textContent='Add items';button.disabled=true;button.style='position:fixed;right:30px;bottom:30px';button.onclick=()=>events.push('add');document.body.append(button);setTimeout(()=>button.disabled=false,100);},100);
      };
    });
    await page.exposeFunction('captureForTest',async()=>({data:`data:image/png;base64,${(await page.screenshot()).toString('base64')}`}));
    await page.evaluate(()=>window.chrome={runtime:{sendMessage:()=>captureForTest()}});
    for(const file of ['detector.js','cart.js','content.js'])await page.addScriptTag({content:source(file)});
    const host=page.locator('#tm-watcher-host');
    await host.locator('#mode').selectOption('direct');
    assert.equal(await host.locator('#autoCart').isChecked(),true);
    assert.equal(await host.locator('#next').isVisible(),false);
    await host.locator('#seats').click();await page.mouse.move(100,100);await page.mouse.down();await page.mouse.move(160,160);await page.mouse.up();
    await host.locator('#automatic').check();await host.locator('#start').click();
    await page.waitForFunction(()=>events.length===2,null,{timeout:5000});
    assert.deepEqual(await page.evaluate(()=>events),['seat','add']);
    await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>events.length),2);
    console.log('PASS: content script starts without a cart target, selects one seat and clicks the dynamically appearing add button once');

    await page.evaluate(()=>{
      events=[];document.querySelector('#dynamic').remove();
      document.querySelector('#seat').onclick=()=>events.push('seat');
    });
    await host.locator('#start').click();await page.waitForFunction(()=>events.length===1);
    await page.waitForFunction(()=>document.querySelector('#tm-watcher-host').shadowRoot.querySelector('output').textContent.includes('warte auf aktive'));
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{const button=document.createElement('button');button.textContent='Add items';button.onclick=()=>events.push('add');document.body.append(button);});
    await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>events),['seat']);
    console.log('PASS: Escape after seat selection prevents a later add button from being clicked');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
