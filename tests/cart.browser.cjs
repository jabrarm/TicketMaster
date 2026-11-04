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
    for(const attribute of ['title','data-original-title','data-bs-title','data-bs-original-title','data-tooltip','mattooltip']){
      await page.setContent(`<button id="tooltipAction" ${attribute}="cart add"><svg width="20" height="20"></svg></button>`);
      assert.equal(await page.evaluate(()=>TicketCart.findActions()[0]?.element.id),'tooltipAction');
    }
    await page.setContent('<span id="tip" role="tooltip">cart add</span><button id="describedAction" aria-describedby="tip"><svg width="20" height="20"></svg></button>');
    assert.equal(await page.evaluate(()=>TicketCart.findActions()[0]?.element.id),'describedAction');
    console.log('PASS: cart add is recognized through native, framework and accessible tooltip metadata');
    await page.setContent('<p>Keine Schaltfläche</p>');
    assert.match(await page.evaluate(async()=>{const controller=new AbortController();const result=TicketCart.waitForAction({signal:controller.signal,timeout:1000}).catch(error=>error.message);controller.abort();return result;}),/abgebrochen/);
    console.log('PASS: abort cancels a pending dynamic button search');

  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
