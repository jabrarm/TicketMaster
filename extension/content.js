(() => {
  if (document.getElementById('tm-watcher-host')) return;
  const host = document.createElement('div');
  host.id = 'tm-watcher-host';
  host.style.cssText = 'position:fixed;right:18px;top:18px;z-index:2147483647';
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}section{width:350px;max-height:90vh;overflow:auto;padding:20px;border-radius:16px;background:#132821;color:#f0f6f2;font:14px/1.45 system-ui;box-shadow:0 12px 40px #0005}h2{margin:0;font-size:20px}p,small{color:#c1d0c7}button{display:block;width:100%;padding:10px;margin:7px 0;border:1px solid #52715e;border-radius:8px;background:#203c2e;color:white;font:inherit;text-align:left;cursor:pointer}button:disabled{opacity:.45;cursor:default}#start{background:#c6ee9c;color:#132821;font-weight:bold}#close{float:right;width:auto;margin:0;padding:0 8px}label{display:block;margin:10px 0}input,select{font:inherit}input[type=color]{vertical-align:middle;width:45px;height:27px;border:0;padding:0}output{display:block;margin-top:12px;color:#ddedb8}.veil{position:fixed;inset:0;cursor:crosshair;background:#10251c22}.box{position:fixed;border:2px solid #67f1ac;background:#67f1ac22;pointer-events:none}.hint{position:fixed;top:10px;left:10px;padding:12px;background:#132821;color:white;pointer-events:none;font:15px system-ui}
  </style><section><button id="close">×</button><h2>Block → Platz → Warenkorb</h2>
  <p>Auch bereits verfügbare Plätze werden erkannt.</p>
  <button id="area">1 · Bereich der Blöcke markieren</button>
  <button id="seats">2 · Suchbereich für einzelne Plätze markieren</button>
  <button id="next">3 · Einkaufswagen wählen</button>
  <label>Farbe verfügbarer Block <input id="blockColor" type="color" value="#6c7400"></label>
  <label>Farbe freier Platz <input id="seatColor" type="color" value="#6c7400"></label>
  <label>Block öffnen <select id="blockClicks"><option value="1">Einfachklick</option><option value="2">Doppelklick</option></select></label>
  <label>Platz wählen <select id="seatClicks"><option value="1">Einfachklick</option><option value="2">Doppelklick</option></select></label>
  <label><input id="automatic" type="checkbox"> Aktionen automatisch ausführen</label>
  <button id="start">Überwachung starten</button><button id="stop" disabled>Stoppen</button>
  <output role="status" aria-live="polite">Markiere Blöcke und den erwarteten Platzbereich. Farben bitte am Saalplan prüfen.</output>
  <small>Testmodus meldet nur verfügbare Blöcke. Escape stoppt jederzeit. Sichtbaren Tab und Ansicht beibehalten.</small></section>`;
  const $ = id => root.getElementById(id);
  const controls = ['area','seats','next','blockColor','seatColor','blockClicks','seatClicks','automatic','start'];
  const labels = {area:'1 · Bereich der Blöcke markieren',seats:'2 · Suchbereich für einzelne Plätze markieren',next:'3 · Einkaufswagen wählen'};
  const regions = {};
  let cart, running = false, generation = 0, lastCapture = 0, cleanupSelection;
  const say = text => root.querySelector('output').textContent = text;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const active = token => running && generation === token && !document.hidden;
  function stop(text = 'Gestoppt.') {
    running = false; generation++;
    controls.forEach(id => $(id).disabled = false); $('stop').disabled = true;
    say(text);
  }
  function select(kind) {
    stop(); host.style.visibility = 'hidden';
    const veil = document.createElement('div'), box = document.createElement('div'), hint = document.createElement('div');
    veil.className = 'veil'; box.className = 'box'; hint.className = 'hint';
    hint.textContent = kind === 'next' ? 'Einkaufswagen anklicken · Escape: Abbrechen' : 'Rechteck ziehen · Escape: Abbrechen';
    root.append(veil, box, hint);
    [veil, box, hint].forEach(el => el.style.visibility = 'visible');
    cleanupSelection = () => { veil.remove(); box.remove(); hint.remove(); host.style.visibility = ''; cleanupSelection = undefined; };
    let origin;
    veil.onpointerdown = event => { event.preventDefault(); origin = {x:event.clientX,y:event.clientY}; veil.setPointerCapture(event.pointerId); };
    veil.onpointermove = event => {
      if (!origin || kind === 'next') return;
      Object.assign(box.style, {left:`${Math.min(origin.x,event.clientX)}px`,top:`${Math.min(origin.y,event.clientY)}px`,width:`${Math.abs(origin.x-event.clientX)}px`,height:`${Math.abs(origin.y-event.clientY)}px`});
    };
    veil.onpointerup = event => {
      event.preventDefault(); event.stopPropagation(); if (!origin) return;
      const point = {x:event.clientX,y:event.clientY};
      const rect = {x:Math.min(origin.x,point.x),y:Math.min(origin.y,point.y),width:Math.abs(origin.x-point.x),height:Math.abs(origin.y-point.y)};
      cleanupSelection();
      if (kind === 'next') {
        const element = document.elementFromPoint(point.x,point.y);
        cart = {...point, element:element?.closest('button,a,[role="button"]') || element};
      } else {
        if (rect.width < 6 || rect.height < 6) return say('Bereich zu klein. Bitte erneut markieren.');
        regions[kind] = rect;
      }
      $(kind).textContent = `${labels[kind]} ✓`; say('Auswahl gespeichert.');
    };
  }
  async function capture(token, rect) {
    await sleep(Math.max(0,550-(Date.now()-lastCapture)));
    if (!active(token)) return null;
    lastCapture = Date.now();
    const result = await chrome.runtime.sendMessage({type:'capture'});
    if (!active(token)) return null;
    if (result.error) throw new Error(result.error);
    const bitmap = await createImageBitmap(await (await fetch(result.data)).blob());
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height);
      const context = canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(bitmap,rect.x*bitmap.width/innerWidth,rect.y*bitmap.height/innerHeight,rect.width*bitmap.width/innerWidth,rect.height*bitmap.height/innerHeight,0,0,canvas.width,canvas.height);
      return {data:context.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height};
    } finally {bitmap.close();}
  }
  function click(point, twice) {
    const element = document.elementFromPoint(point.x,point.y);
    if (!element || element === host || host.contains(element)) throw new Error('Klickziel fehlt oder ist verdeckt.');
    const options = {bubbles:true,cancelable:true,composed:true,view:window,clientX:point.x,clientY:point.y,button:0};
    for (let count=1;count<=(twice?2:1);count++) {
      for (const type of ['pointerdown','mousedown','pointerup','mouseup','click']) {
        const EventType = type.startsWith('pointer') ? PointerEvent : MouseEvent;
        element.dispatchEvent(new EventType(type,{...options,detail:count,buttons:type.endsWith('down')?1:0,pointerId:1,pointerType:'mouse',isPrimary:true}));
      }
    }
    if (twice) element.dispatchEvent(new MouseEvent('dblclick',{...options,detail:2}));
  }
  async function find(token, rect, color, seat, priorScene) {
    let previous, changed = !priorScene;
    const deadline = seat ? Date.now()+15000 : Infinity;
    while (active(token)) {
      if (Date.now()>deadline) throw new Error('Keine bestätigte Platzansicht mit freiem Platz erkannt. Kein Warenkorbklick.');
      const frame = await capture(token,rect);
      if (!frame || !active(token)) return null;
      // Wait for actual content replacement after the block click. A colored
      // block in the old overview is not evidence of an individual free seat.
      const different = !priorScene || TicketDetector.sceneChanged(priorScene.data,frame.data);
      if (!different) {previous=null; continue;}
      changed = changed || different;
      const point = changed && TicketDetector.findAvailable(frame.data,frame.width,frame.height,color,seat);
      if (point && previous && Math.hypot(point.x-previous.x,point.y-previous.y)<5) return {x:rect.x+point.x,y:rect.y+point.y};
      previous = point;
    }
    return null;
  }
  $('area').onclick=()=>select('area'); $('seats').onclick=()=>select('seats'); $('next').onclick=()=>select('next');
  $('stop').onclick=()=>stop();
  $('start').onclick=async()=>{
    if (!regions.area || !regions.seats) return say('Markiere zuerst Blockbereich und Platzsuchbereich.');
    const automatic=$('automatic').checked;
    if (automatic && !cart) return say('Wähle zuerst den Einkaufswagen.');
    const panel=host.getBoundingClientRect();
    for (const rect of Object.values(regions)) {
      if (rect.x<panel.right && rect.x+rect.width>panel.left && rect.y<panel.bottom && rect.y+rect.height>panel.top) return say('Ein Suchbereich überschneidet sich mit dem Bedienfeld.');
    }
    const blockColor=$('blockColor').value,seatColor=$('seatColor').value;
    const blockDouble=$('blockClicks').value==='2',seatDouble=$('seatClicks').value==='2';
    running=true; const token=++generation;
    controls.forEach(id=>$(id).disabled=true); $('stop').disabled=false;
    try {
      say(automatic?'Aktiv · Suche verfügbaren Block …':'Testmodus aktiv · Suche verfügbaren Block ohne Klicks …');
      const block=await find(token,regions.area,blockColor,false);
      if (!block || !active(token)) return;
      if (!automatic) return stop('Verfügbarer Block erkannt. Keine Klicks ausgeführt.');
      const before=await capture(token,regions.seats);
      if (!before || !active(token)) return;
      say('Block wird geöffnet · warte auf freie Plätze …');
      click(block,blockDouble);
      if (!active(token)) return;
      const seat=await find(token,regions.seats,seatColor,true,before);
      if (!seat || !active(token)) return;
      say('Freier Platz erkannt · Platz wird ausgewählt …');
      click(seat,seatDouble);
      await sleep(250);
      if (!active(token)) return;
      const deadline=Date.now()+3000;
      while (cart.element?.isConnected && (cart.element.disabled || cart.element.getAttribute('aria-disabled')==='true')) {
        if (Date.now()>deadline) throw new Error('Der Warenkorb bleibt deaktiviert.');
        await sleep(50); if (!active(token)) return;
      }
      const target=document.elementFromPoint(cart.x,cart.y);
      if (!cart.element?.isConnected || !target || !cart.element.contains(target)) throw new Error('Warenkorbziel verändert. Bitte neu auswählen.');
      click(cart,false);
      if (active(token)) stop('Block geöffnet → Platz angeklickt → Warenkorb betätigt. Ergebnis bitte auf der Seite prüfen.');
    } catch(error) {if (active(token)) stop(`Gestoppt: ${error.message}`);}
  };
  function layout(event) {
    if (cleanupSelection || event?.composedPath().includes(host)) return;
    delete regions.area; delete regions.seats; cart=undefined;
    Object.entries(labels).forEach(([id,label])=>$(id).textContent=label);
    stop('Ansicht verschoben. Suchbereiche und Einkaufswagen bitte neu wählen.');
  }
  function visibility() {if(document.hidden) stop('Tab nicht sichtbar. Gestoppt.');}
  function escape(event) {if(event.key==='Escape'){cleanupSelection?.();stop();}}
  window.addEventListener('scroll',layout,true);window.addEventListener('resize',layout);
  document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',escape,true);
  $('close').onclick=()=>{
    stop();cleanupSelection?.();host.remove();window.removeEventListener('scroll',layout,true);window.removeEventListener('resize',layout);
    document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape,true);
  };
})();
