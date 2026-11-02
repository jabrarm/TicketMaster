(() => {
  if (document.getElementById('tm-watcher-host')) return;
  const host = document.createElement('div');
  host.id = 'tm-watcher-host';
  host.style.cssText = 'position:fixed;right:18px;top:18px;z-index:2147483647';
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}section{width:350px;max-height:90vh;overflow:auto;padding:20px;border-radius:16px;background:#132821;color:#f0f6f2;font:14px/1.45 system-ui;box-shadow:0 12px 40px #0005}h2{margin:0;font-size:20px}p,small{color:#c1d0c7}button{display:block;width:100%;padding:10px;margin:7px 0;border:1px solid #52715e;border-radius:8px;background:#203c2e;color:white;font:inherit;text-align:left;cursor:pointer}button:disabled{opacity:.45;cursor:default}#start{background:#c6ee9c;color:#132821;font-weight:bold}#close{float:right;width:auto;margin:0;padding:0 8px}label{display:block;margin:10px 0}input,select{font:inherit}input[type=color]{vertical-align:middle;width:45px;height:27px;border:0;padding:0}output{display:block;margin-top:12px;color:#ddedb8}.veil{position:fixed;inset:0;cursor:crosshair;background:#10251c22}.box{position:fixed;border:2px solid #67f1ac;background:#67f1ac22;pointer-events:none}.hint{position:fixed;top:10px;left:10px;padding:12px;background:#132821;color:white;pointer-events:none;font:15px system-ui}
  </style><section><button id="close">×</button><h2>Freier Platz → Warenkorb</h2>
  <p>Erkennt farbige runde Punkte statt grauer Plätze.</p>
  <label>Ansicht <select id="mode"><option value="name">Block nach Namen automatisch öffnen</option><option value="target">Blockziel einmalig auswählen</option><option value="blocks">Farbige Blöcke automatisch suchen</option><option value="direct">Einzelne Plätze bereits sichtbar</option></select></label>
  <label id="blockNameLabel">Blockname <input id="blockName" value="S1" maxlength="30" style="width:100px"></label>
  <button id="blockTarget">1 · S1 / anderen Block als Klickziel wählen</button>
  <button id="area">1 · Bereich der Blöcke markieren</button>
  <button id="seats">2 · Suchbereich für einzelne Plätze markieren</button>
  <label><input id="autoCart" type="checkbox" checked> Hinzufügen-Schaltfläche automatisch finden</label>
  <button id="next">3 · Einkaufswagen wählen</button>
  <button id="exclude">Spielfeld / Legende aus der Suche ausschließen</button>
  <button id="clearExcluded">Ausschlüsse löschen (0)</button>
  <label id="blockClickLabel">Block öffnen <select id="blockClicks"><option value="1">Einfachklick</option><option value="2">Doppelklick</option></select></label>
  <label>Platz wählen <select id="seatClicks"><option value="1">Einfachklick</option><option value="2">Doppelklick</option></select></label>
  <label><input id="automatic" type="checkbox"> Aktionen automatisch ausführen</label>
  <button id="start">Überwachung starten</button><button id="stop" disabled>Stoppen</button>
  <output role="status" aria-live="polite">Markiere den Platzsuchbereich. Die Hinzufügen-Schaltfläche wird erst nach der Platzauswahl gesucht.</output>
  <small>Auch bestehende Verfügbarkeit wird geprüft. Testmodus klickt nicht. In der Gesamtübersicht das Spielfeld und farbige Symbole ausschließen. Escape stoppt jederzeit.</small></section>`;
  const $ = id => root.getElementById(id);
  const controls = ['area','blockTarget','blockName','seats','next','autoCart','exclude','clearExcluded','mode','blockClicks','seatClicks','automatic','start'];
  const labels = {area:'1 · Bereich der Blöcke markieren',seats:'2 · Suchbereich für einzelne Plätze markieren',next:'3 · Einkaufswagen wählen'};
  const regions = {};
  const exclusions = [];
  let cart, blockTarget, runAbort, running = false, generation = 0, lastCapture = 0, cleanupSelection;
  const say = text => root.querySelector('output').textContent = text;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function updateMode() {
    const blocks = $('mode').value === 'blocks';
    const target = $('mode').value === 'target';
    const named = $('mode').value === 'name';
    $('blockNameLabel').style.display = named ? '' : 'none';
    $('blockTarget').style.display = target ? '' : 'none';
    $('area').style.display = blocks ? '' : 'none';
    $('blockClickLabel').style.display = blocks || target || named ? '' : 'none';
    $('exclude').style.display = blocks ? '' : 'none'; $('clearExcluded').style.display = blocks ? '' : 'none';
    $('seats').textContent = blocks || target || named ? labels.seats : '1 · Bereich mit Platzpunkten markieren';
    $('next').textContent = blocks || target || named ? labels.next : '2 · Einkaufswagen wählen';
    $('next').style.display = $('autoCart').checked ? 'none' : '';
  }
  $('mode').onchange = updateMode; updateMode();
  $('autoCart').onchange = updateMode;
  const active = token => running && generation === token && !document.hidden;
  function stop(text = 'Gestoppt.') {
    running = false; generation++;
    runAbort?.abort();
    controls.forEach(id => $(id).disabled = false); $('stop').disabled = true;
    say(text);
  }
  function select(kind) {
    stop(); host.style.visibility = 'hidden';
    const veil = document.createElement('div'), box = document.createElement('div'), hint = document.createElement('div');
    veil.className = 'veil'; box.className = 'box'; hint.className = 'hint';
    hint.textContent = kind === 'blockTarget' ? 'In der Übersicht einmal auf Block S1 (oder den gewünschten Block) zeigen und klicken · wählt nur das Ziel' : kind === 'next' ? 'Einkaufswagen anklicken · Escape: Abbrechen' : kind === 'exclude' ? 'Spielfeld oder farbiges Symbol mit Rechteck ausschließen · Escape: Abbrechen' : 'Rechteck ziehen · Escape: Abbrechen';
    root.append(veil, box, hint);
    [veil, box, hint].forEach(el => el.style.visibility = 'visible');
    cleanupSelection = () => { veil.remove(); box.remove(); hint.remove(); host.style.visibility = ''; cleanupSelection = undefined; };
    let origin;
    veil.onpointerdown = event => { event.preventDefault(); origin = {x:event.clientX,y:event.clientY}; veil.setPointerCapture(event.pointerId); };
    veil.onpointermove = event => {
      if (!origin || kind === 'next' || kind === 'blockTarget') return;
      Object.assign(box.style, {left:`${Math.min(origin.x,event.clientX)}px`,top:`${Math.min(origin.y,event.clientY)}px`,width:`${Math.abs(origin.x-event.clientX)}px`,height:`${Math.abs(origin.y-event.clientY)}px`});
    };
    veil.onpointerup = event => {
      event.preventDefault(); event.stopPropagation(); if (!origin) return;
      const point = {x:event.clientX,y:event.clientY};
      const rect = {x:Math.min(origin.x,point.x),y:Math.min(origin.y,point.y),width:Math.abs(origin.x-point.x),height:Math.abs(origin.y-point.y)};
      cleanupSelection();
      if (kind === 'blockTarget') {
        blockTarget = {...point, element:document.elementFromPoint(point.x,point.y)};
        $('blockTarget').textContent = '1 · Blockziel gewählt ✓';
        say('Blockziel gespeichert. Es wird beim automatischen Start geöffnet, unabhängig von seiner Farbe.');
        return;
      } else if (kind === 'next') {
        const element = document.elementFromPoint(point.x,point.y);
        cart = {...point, element:element?.closest('button,a,[role="button"]') || element};
      } else {
        if (rect.width < 6 || rect.height < 6) return say('Bereich zu klein. Bitte erneut markieren.');
        if (kind === 'exclude') {
          exclusions.push(rect);
          $('clearExcluded').textContent = `Ausschlüsse löschen (${exclusions.length})`;
          say('Bereich ausgeschlossen. Er wird nur in der Blockübersicht ignoriert.');
          return;
        }
        regions[kind] = rect;
      }
      $(kind).textContent = `${labels[kind]} ✓`; say('Auswahl gespeichert.');
    };
  }
  async function capture(token, rect, exclude = false) {
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
      const data=context.getImageData(0,0,canvas.width,canvas.height).data;
      if (exclude) for (const excluded of exclusions) {
        const left=Math.max(0,Math.floor(excluded.x-rect.x)),right=Math.min(canvas.width,Math.ceil(excluded.x+excluded.width-rect.x));
        const top=Math.max(0,Math.floor(excluded.y-rect.y)),bottom=Math.min(canvas.height,Math.ceil(excluded.y+excluded.height-rect.y));
        for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)data[(y*canvas.width+x)*4+3]=0;
      }
      return {data,width:canvas.width,height:canvas.height};
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
  function locateBlock(name) {
    const normalize=text=>(text||'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
    const wanted=normalize(name);
    if (!wanted) throw new Error('Bitte einen Blocknamen eingeben.');
    const matches=[];
    for (const element of document.querySelectorAll('svg text,svg tspan,[aria-label],[data-block],[data-block-name],a,button,span,div')) {
      if (element===host || host.contains(element)) continue;
      const labels=[element.getAttribute('data-block'),element.getAttribute('data-block-name'),element.getAttribute('aria-label')];
      if (element.children.length===0 || element.matches('svg text,a,button')) labels.push(element.textContent);
      if (!labels.some(label=>normalize(label)===wanted || normalize(label)===`BLOCK ${wanted}`)) continue;
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      if (rect.width<1 || rect.height<1 || rect.width>180 || rect.height>65 || style.visibility==='hidden' || style.display==='none' || Number(style.opacity)===0) continue;
      const point={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
      if (point.x<0 || point.y<0 || point.x>=innerWidth || point.y>=innerHeight) continue;
      const top=document.elementFromPoint(point.x,point.y);
      if (!top || top===host || (!element.contains(top) && !top.contains(element))) continue;
      if (!matches.some(match=>Math.hypot(match.x-point.x,match.y-point.y)<5)) matches.push({...point,element:top});
    }
    if (matches.length>1) throw new Error(`Block ${name} ist nicht eindeutig. Keine Klicks ausgeführt.`);
    if (!matches.length) throw new Error(`Block ${name} nicht automatisch gefunden. Für diese Plandarstellung ist eine Anpassung nötig; alternativ das Blockziel einmalig auswählen.`);
    return matches[0];
  }
  async function find(token, rect, color, seat, priorScene) {
    let previous, changed = !priorScene;
    const deadline = seat && priorScene ? Date.now()+15000 : Infinity;
    while (active(token)) {
      if (Date.now()>deadline) throw new Error('Keine bestätigte Platzansicht mit freiem Platz erkannt. Kein Warenkorbklick.');
      const frame = await capture(token,rect,!seat);
      if (!frame || !active(token)) return null;
      // Wait for actual content replacement after the block click. A colored
      // block in the old overview is not evidence of an individual free seat.
      const different = !priorScene || TicketDetector.sceneChanged(priorScene.data,frame.data);
      if (!different) {previous=null; continue;}
      changed = changed || different;
      const point = changed && TicketDetector.findAvailable(frame.data,frame.width,frame.height,color,seat);
      if (!point) say(seat ? 'Suche vorhandene und neue freie Platzpunkte … Noch kein passender Punkt erkannt.' : 'Blockübersicht: kein farbiger Verfügbarkeitshinweis im Suchbereich erkannt. Auch vorhandene Tickets werden geprüft.');
      if (point && previous && Math.hypot(point.x-previous.x,point.y-previous.y)<5) return {x:rect.x+point.x,y:rect.y+point.y};
      previous = point;
    }
    return null;
  }
  $('area').onclick=()=>select('area'); $('seats').onclick=()=>select('seats'); $('next').onclick=()=>select('next');
  $('blockTarget').onclick=()=>select('blockTarget');
  $('exclude').onclick=()=>select('exclude');
  $('clearExcluded').onclick=()=>{exclusions.length=0;$('clearExcluded').textContent='Ausschlüsse löschen (0)';say('Ausschlüsse gelöscht.');};
  $('stop').onclick=()=>stop();
  $('start').onclick=async()=>{
    const blocks = $('mode').value === 'blocks';
    const targeted = $('mode').value === 'target';
    const named = $('mode').value === 'name';
    if (!regions.seats || (blocks && !regions.area)) return say('Markiere zuerst die benötigten Suchbereiche.');
    if (targeted && !blockTarget) return say('Wähle zuerst S1 oder einen anderen Block als Klickziel.');
    const automatic=$('automatic').checked;
    const autoCart=$('autoCart').checked;
    if (automatic && !autoCart && !cart) return say('Wähle den Einkaufswagen oder aktiviere die automatische Schaltflächensuche.');
    const panel=host.getBoundingClientRect();
    for (const rect of blocks ? Object.values(regions) : [regions.seats]) {
      if (rect.x<panel.right && rect.x+rect.width>panel.left && rect.y<panel.bottom && rect.y+rect.height>panel.top) return say('Ein Suchbereich überschneidet sich mit dem Bedienfeld.');
    }
    const blockDouble=$('blockClicks').value==='2',seatDouble=$('seatClicks').value==='2';
    running=true; const token=++generation;
    runAbort=new AbortController();
    controls.forEach(id=>$(id).disabled=true); $('stop').disabled=false;
    try {
      say(automatic?'Aktiv · Suche Verfügbarkeit …':'Testmodus aktiv · Keine Klicks …');
      let seat;
      if (blocks || targeted || named) {
        const block=named ? locateBlock($('blockName').value) : targeted ? blockTarget : await find(token,regions.area,null,false);
        if (!block || !active(token)) return;
        if (!automatic) return stop(named ? `Block ${$('blockName').value} gefunden. Testmodus klickt nicht und bestätigt keine freien Tickets.` : targeted ? 'Blockziel gespeichert. Testmodus öffnet den Block nicht und bestätigt keine freien Tickets.' : 'Verfügbarer Block erkannt. Keine Klicks ausgeführt.');
        if (targeted || named) {
          const element=document.elementFromPoint(block.x,block.y);
          if (!block.element?.isConnected || !element || !block.element.contains(element)) throw new Error('Blockziel verändert oder verdeckt. Bitte neu auswählen.');
        }
        const before=await capture(token,regions.seats);
        if (!before || !active(token)) return;
        say('Block wird geöffnet · warte auf freie Plätze …');
        click(block,blockDouble);
        if (!active(token)) return;
        seat=await find(token,regions.seats,null,true,before);
      } else {
        // No scene replacement is needed when the individual places are visible.
        seat=await find(token,regions.seats,null,true);
      }
      if (!seat || !active(token)) return;
      if (!automatic) return stop('Freier farbiger Platz erkannt. Keine Klicks ausgeführt.');
      say('Freier Platz erkannt · Platz wird ausgewählt …');
      click(seat,seatDouble);
      if (!active(token)) return;
      if (autoCart) {
        say('Platz angeklickt · warte auf aktive Hinzufügen-Schaltfläche …');
        const found=await TicketCart.waitForAction({signal:runAbort.signal,exclude:host});
        if (!active(token)) return;
        const current=TicketCart.findActions(host);
        if (current.length!==1 || current[0].element!==found.element) throw new Error('Hinzufügen-Ziel hat sich geändert. Kein Warenkorbklick.');
        click(current[0],false);
        if (active(token)) stop('Platz angeklickt → Hinzufügen-Schaltfläche betätigt. Ergebnis bitte auf der Seite prüfen.');
        return;
      }
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
      if (active(token)) stop('Platz angeklickt → Warenkorb betätigt. Ergebnis bitte auf der Seite prüfen.');
    } catch(error) {if (active(token)) stop(`Gestoppt: ${error.message}`);}
  };
  function layout(event) {
    if (cleanupSelection || event?.composedPath().includes(host)) return;
    delete regions.area; delete regions.seats; cart=undefined; blockTarget=undefined; exclusions.length=0;
    $('blockTarget').textContent='1 · S1 / anderen Block als Klickziel wählen';
    $('clearExcluded').textContent='Ausschlüsse löschen (0)';
    Object.entries(labels).forEach(([id,label])=>$(id).textContent=label);
    updateMode();
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
