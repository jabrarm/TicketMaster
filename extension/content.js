(async () => {
  if (document.getElementById('tm-watcher-host')) return;
  const host=document.createElement('div');host.id='tm-watcher-host';
  host.style.cssText='position:fixed;left:16px;bottom:16px;z-index:2147483647';
  document.documentElement.append(host);
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
  :host{all:initial}*{box-sizing:border-box}section{width:340px;max-height:85vh;overflow:auto;padding:20px;border:1px solid #42654f;border-radius:16px;background:#132821;color:#f1f6f2;box-shadow:0 14px 45px #0005;font:14px/1.5 system-ui}h2{font-size:19px;margin:0}p,small{color:#bcd0c3}button{display:block;width:100%;padding:9px 12px;margin:7px 0;border:1px solid #52715e;border-radius:8px;background:#203c2e;color:white;font:inherit;cursor:pointer;text-align:left}button:disabled{opacity:.45;cursor:default}#start{background:#c6ee9c;color:#132821;font-weight:bold}#close{float:right;width:auto;padding:0 8px;margin:0}label{display:block;margin:12px 0}output{display:block;padding-top:12px;color:#ddedb8;overflow-wrap:anywhere}.veil{position:fixed;inset:0;background:#10251c18;cursor:crosshair}.box{position:fixed;border:2px solid #67f1ac;background:#67f1ac22;pointer-events:none}.hint{position:fixed;top:10px;left:10px;padding:12px;background:#132821;color:white;font:15px system-ui;pointer-events:none}details{margin-top:14px;border-top:1px solid #42654f;padding-top:10px}summary{cursor:pointer}canvas{display:block;width:100%;height:auto;max-height:180px;object-fit:contain;background:white;margin-top:8px}.target{position:fixed;width:22px;height:22px;border:3px solid #00db6a;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px #123b27;display:none}.target span{position:absolute;left:20px;top:-10px;background:#132821;color:white;padding:2px 5px;font:12px system-ui;white-space:nowrap}
  </style><section><button id="close">×</button><h2>2 × Zoom → Block → Platz → cart add</h2>
  <p>Alternative: Blockpunkte einmal einlernen und automatisch nacheinander prüfen. Die Blockfarbe wird dabei nicht benötigt.</p>
  <label>Blocksuche <select id="blockMode"><option value="learned">Eingelernte Blockpunkte nacheinander prüfen</option><option value="auto">Bisherige automatische Farberkennung</option></select></label>
  <label><input type="checkbox" id="native"> Echte Browser-Eingaben verwenden (optional)</label>
  <button id="connect">Browser-Steuerung verbinden · vor dem Markieren</button><small id="connectionInfo">Nicht verbunden. Chrome zeigt während der Verbindung eine Debugging-Leiste.</small>
  <button id="map">1 · Großen Kartenbereich markieren</button>
  <button id="overview">2 · Übersicht oben rechts markieren (falls nötig)</button>
  <div id="learnedControls"><button id="learnBlocks">Blockpunkte einmal aufnehmen</button><button id="clearBlocks">Blockpunkte löschen</button><small id="pointInfo">Noch keine Punkte gelernt. Der Ablauf kann nach dem Zoomen für die Aufnahme pausieren.</small><label>Wartezeit je Block <input id="scanSeconds" type="number" min="2" max="15" value="4" style="width:48px"> Sekunden</label></div>
  <label><input type="checkbox" id="execute"> Block, Platz und „cart add“ automatisch anklicken</label>
  <button id="start">Ablauf starten · zuerst genau 2 Mausradschritte</button><button id="stop" disabled>Stoppen</button>
  <button id="learnCart">„cart add“-Symbol bei Bedarf einmal einlernen</button><button id="forgetCart">Gelerntes Warenkorbziel löschen</button>
  <output role="status" aria-live="polite">Kartenbereich ohne Kopfzeile markieren. Kein Blockname und keine Warenkorbposition erforderlich.</output>
  <details id="blockDebug" open><summary>Block-Erkennung prüfen</summary><canvas id="blockPreview" width="160" height="120"></canvas><small id="blockInfo">Noch keine Übersicht aufgenommen.</small><button id="probe">Aktuelle Übersicht prüfen · ohne Zoom/Klicks</button><button id="export" disabled>Diagnosebild speichern</button></details>
  <small>Ohne Häkchen: zwei Zoomereignisse und Blockprüfung, keine Auswahlklicks. Escape bricht jederzeit ab. Vor jedem neuen Start wieder ganz herauszoomen.</small></section>`;
  const $=id=>root.getElementById(id);
  const say=text=>root.querySelector('output').textContent=text;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const targetIndicator=document.createElement('div');targetIndicator.className='target';targetIndicator.innerHTML='<span>Blockziel</span>';root.append(targetIndicator);
  let hasPreview=false;
  let mapRect,overviewRect,running=false,connecting=false,token=0,lastCapture=0,abort,selectionCleanup,overviewWait,pointsWait,learnedSelector='',calibration=null,nativeConnection=null,nativeRun=null,endPending=Promise.resolve();
  const storageKey=`tm-cart-selector:${location.origin}${location.pathname}`;
  const pointsKey=`tm-block-points:${location.origin}${location.pathname}`;
  try{const saved=await chrome.storage?.local?.get(storageKey);learnedSelector=typeof saved?.[storageKey]==='string'?saved[storageKey]:'';}catch{say('Gespeichertes cart-add-Ziel konnte nicht geladen werden.');}
  try{const saved=await chrome.storage?.local?.get(pointsKey);const value=saved?.[pointsKey];if(value&&Array.isArray(value.points)&&value.points.length>0&&value.points.length<=100&&value.points.every(p=>Number.isFinite(p.u)&&Number.isFinite(p.v)&&p.u>0&&p.u<1&&p.v>0&&p.v<1))calibration=value;}catch{}
  function pointInfo(){$('pointInfo').textContent=calibration?`${calibration.points.length} Blockpunkte gelernt. Sie werden ohne Farberkennung geprüft.`:'Noch keine Punkte gelernt. Der Ablauf kann nach dem Zoomen für die Aufnahme pausieren.';}
  pointInfo();
  async function rpc(message){const response=await chrome.runtime.sendMessage(message);if(response?.error)throw new Error(response.error);return response||{};}
  function updateMode(){$('blockDebug').style.display=$('blockMode').value==='auto'?'':'none';$('learnedControls').style.display=$('blockMode').value==='learned'?'':'none';$('connect').style.display=$('native').checked?'':'none';$('connectionInfo').style.display=$('native').checked?'':'none';$('connectionInfo').textContent=nativeConnection?'Browser-Steuerung verbunden. Sie bleibt bis zum Schließen des Wächters verbunden.':'Nicht verbunden. Chrome zeigt während der Verbindung eine Debugging-Leiste.';}
  updateMode();$('blockMode').onchange=updateMode;
  function active(id){return running && token===id && !document.hidden;}
  function controls(){for(const id of ['map','overview','execute','start','learnCart','forgetCart','probe','blockMode','native','connect','learnBlocks','clearBlocks','scanSeconds'])$(id).disabled=running||connecting;$('stop').disabled=!(running||connecting);}
  function markTarget(point){targetIndicator.style.display=point?'block':'none';if(point){targetIndicator.style.left=`${point.x-11}px`;targetIndicator.style.top=`${point.y-11}px`;}}
  function maskUnavailable(frame,rect,excluded){
    const scaleX=frame.width/rect.width,scaleY=frame.height/rect.height;
    for(const box of excluded){
      const left=Math.max(0,Math.floor((box.x-rect.x)*scaleX)),right=Math.min(frame.width,Math.ceil((box.x+box.width-rect.x)*scaleX));
      const top=Math.max(0,Math.floor((box.y-rect.y)*scaleY)),bottom=Math.min(frame.height,Math.ceil((box.y+box.height-rect.y)*scaleY));
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)frame.data[(y*frame.width+x)*4+3]=0;
    }
  }
  function preview(frame,rect,candidate,result){
    const canvas=$('blockPreview');canvas.width=frame.width;canvas.height=frame.height;const context=canvas.getContext('2d');
    context.putImageData(new ImageData(frame.data,frame.width,frame.height),0,0);
    const sx=frame.width/rect.width,sy=frame.height/rect.height;
    context.lineWidth=2;context.strokeStyle='#e74b40';for(const box of result.excludedRects)context.strokeRect((box.x-rect.x)*sx,(box.y-rect.y)*sy,box.width*sx,box.height*sy);
    if(candidate){const x=(candidate.x-rect.x)*sx,y=(candidate.y-rect.y)*sy;context.strokeStyle='#00c55a';context.beginPath();context.arc(x,y,7,0,Math.PI*2);context.stroke();context.beginPath();context.moveTo(x-10,y);context.lineTo(x+10,y);context.moveTo(x,y-10);context.lineTo(x,y+10);context.stroke();}
    $('blockInfo').textContent=candidate?`Blockziel erkannt · ${candidate.pixel?'Bildsuche':'Seitenstruktur'} · grünes Kreuz = geplanter Klick.`:`Kein Blockziel erkannt · ${result.recognized} bekannte Blockelemente · ${result.excludedRects.length} ausdrücklich gesperrte Bereiche.`;
    hasPreview=true;$('export').disabled=false;
  }
  function stop(message='Gestoppt.'){
    selectionCleanup?.();running=false;connecting=false;token++;abort?.abort();overviewWait?.reject(new Error('Abgebrochen.'));overviewWait=undefined;pointsWait?.reject(new Error('Abgebrochen.'));pointsWait=undefined;
    if(nativeRun&&nativeConnection){const run=nativeRun;nativeRun=null;endPending=rpc({type:'nativeEnd',connection:nativeConnection,run}).catch(()=>{});}
    controls();say(message);
  }
  $('connect').onclick=async()=>{
    stop();await endPending;const id=++token;connecting=true;controls();say('Browser-Steuerung wird verbunden …');
    try{const response=await rpc({type:'nativeConnect'});if(!connecting||token!==id){await rpc({type:'nativeDisconnect',connection:response.connection});return;}nativeConnection=response.connection;await sleep(300);if(token!==id)return;connecting=false;controls();updateMode();say('Browser-Steuerung verbunden. Jetzt Kartenbereich und gegebenenfalls Blockübersicht markieren.');}
    catch(error){if(token===id){connecting=false;controls();say(error.message);}}
  };
  $('native').onchange=async()=>{if(!$('native').checked&&nativeConnection){const connection=nativeConnection;nativeConnection=null;await endPending;await rpc({type:'nativeDisconnect',connection}).catch(()=>{});}updateMode();};
  function detached(message){if(message.type==='nativeDetached'){nativeConnection=null;nativeRun=null;stop('Browser-Steuerung wurde getrennt. Zum Fortsetzen neu verbinden.');updateMode();}}
  chrome.runtime.onMessage?.addListener?.(detached);
  function hidden(action){const old=host.style.visibility;host.style.visibility='hidden';try{return action();}finally{host.style.visibility=old;}}
  function select(kind){
    const resume=kind==='overview' && Boolean(overviewWait);
    if(!resume)stop();
    host.style.visibility='hidden';
    const veil=document.createElement('div'),box=document.createElement('div'),hint=document.createElement('div');
    veil.className='veil';box.className='box';hint.className='hint';
    hint.textContent=kind==='learnCart'?'Sichtbaren „cart add“-Knopf einmal auswählen · kein Hinzufügen-Klick':kind==='overview'?'Nur das Miniatur-Stadion oben rechts eng mit einem Rechteck markieren, ohne Schließen-Knopf':'Großen Saalplan ohne Kopfzeile markieren · die kleine Übersicht wird später ausgespart';
    root.append(veil,box,hint);for(const node of [veil,box,hint])node.style.visibility='visible';
    let origin;
    selectionCleanup=()=>{veil.remove();box.remove();hint.remove();host.style.visibility='';selectionCleanup=undefined;};
    veil.onpointerdown=event=>{event.preventDefault();origin={x:event.clientX,y:event.clientY};veil.setPointerCapture(event.pointerId);};
    veil.onpointermove=event=>{if(!origin||kind==='learnCart')return;Object.assign(box.style,{left:`${Math.min(origin.x,event.clientX)}px`,top:`${Math.min(origin.y,event.clientY)}px`,width:`${Math.abs(origin.x-event.clientX)}px`,height:`${Math.abs(origin.y-event.clientY)}px`});};
    veil.onpointerup=async event=>{
      event.preventDefault();event.stopPropagation();if(!origin)return;
      const point={x:event.clientX,y:event.clientY};
      const rect={x:Math.min(origin.x,point.x),y:Math.min(origin.y,point.y),width:Math.abs(origin.x-point.x),height:Math.abs(origin.y-point.y)};
      selectionCleanup();
      if(kind==='learnCart'){
        try{
          const picked=hidden(()=>document.elementFromPoint(point.x,point.y));
          const element=picked?.closest('button,a,[role="button"],[onclick],input[type="button"],input[type="submit"]');
          if(!element)throw new Error('Bitte direkt auf den Hinzufügen-Knopf klicken.');
          const selector=TicketCart.selectorFor(element);await chrome.storage?.local?.set({[storageKey]:selector});learnedSelector=selector;say('cart-add-Ziel gelernt. Bei späteren Starts darf es zunächst fehlen.');
        }catch(error){say(`Einlernen fehlgeschlagen: ${error.message}`);}return;
      }
      if(rect.width<10||rect.height<10){say('Bereich zu klein. Bitte erneut markieren.');return;}
      if(kind==='map'){mapRect=rect;$('map').textContent='1 · Kartenbereich gewählt ✓';}
      else{overviewRect=rect;$('overview').textContent='2 · Blockübersicht gewählt ✓';}
      if(resume&&overviewWait){const waiter=overviewWait;overviewWait=undefined;$('overview').disabled=true;waiter.resolve(rect);}else say('Bereich gespeichert. Vor dem Start ganz herauszoomen.');
    };
  }
  function calibrationMatches(rect){
    return calibration&&calibration.viewport?.width===innerWidth&&calibration.viewport?.height===innerHeight&&['x','y','width','height'].every(key=>Number.isFinite(calibration.rect?.[key])&&Math.abs(calibration.rect[key]-rect[key])<=2);
  }
  function recordBlocks(){
    const resume=Boolean(pointsWait);if(!resume)stop();
    const rect=overviewRect||hidden(()=>TicketOverview.findContainer(host));if(!rect)return say('Zuerst die sichtbare Miniaturübersicht markieren. Alternativ den Ablauf zum Vorbereiten mit zwei Zoomschritten starten.');
    overviewRect=rect;host.style.visibility='hidden';
    const veil=document.createElement('div'),hint=document.createElement('div'),done=document.createElement('button'),markers=[];
    veil.className='veil';hint.className='hint';done.textContent='Fertig · 0 Blockpunkte';done.style.cssText='position:fixed;right:20px;bottom:20px;width:auto;padding:14px;background:#132821;color:white;z-index:2';
    hint.textContent='Mittelpunkte der gewünschten Blöcke in der Miniaturkarte anklicken · Reihenfolge = Prüfreihenfolge · Enter/Fertig beendet · Escape bricht ab';root.append(veil,hint,done);for(const node of [veil,hint,done])node.style.visibility='visible';
    const points=[];
    function key(event){if(event.key==='Enter'){event.preventDefault();finish();}}
    selectionCleanup=()=>{veil.remove();hint.remove();done.remove();markers.forEach(node=>node.remove());document.removeEventListener('keydown',key,true);host.style.visibility='';selectionCleanup=undefined;};
    document.addEventListener('keydown',key,true);
    veil.onpointerdown=event=>{event.preventDefault();event.stopPropagation();};
    veil.onpointerup=event=>{
      event.preventDefault();event.stopPropagation();const u=(event.clientX-rect.x)/rect.width,v=(event.clientY-rect.y)/rect.height;
      if(u<=0||u>=1||v<=0||v>=1){hint.textContent='Bitte ausschließlich innerhalb der markierten Miniaturübersicht auf einen Block klicken.';return;}
      if(points.length>=100||points.some(p=>Math.hypot((p.u-u)*rect.width,(p.v-v)*rect.height)<5))return;
      points.push({u,v});const marker=document.createElement('div');marker.className='target';marker.style.cssText=`display:block;visibility:visible;left:${event.clientX-11}px;top:${event.clientY-11}px`;marker.textContent=String(points.length);root.append(marker);markers.push(marker);done.textContent=`Fertig · ${points.length} Blockpunkte`;
    };
    async function finish(){
      if(!points.length){hint.textContent='Mindestens einen Blockpunkt aufnehmen oder mit Escape abbrechen.';return;}
      calibration={points:points.map(p=>({...p})),rect:{...rect},viewport:{width:innerWidth,height:innerHeight}};selectionCleanup();pointInfo();
      try{await chrome.storage?.local?.set({[pointsKey]:calibration});}catch{say('Blockpunkte sind für diese Sitzung gelernt; dauerhaftes Speichern ist fehlgeschlagen.');}
      if(resume&&pointsWait){const waiter=pointsWait;pointsWait=undefined;$('learnBlocks').disabled=true;waiter.resolve(calibration);}else say(`${points.length} Blockpunkte gelernt. Vor einem neuen Ablauf zur ganz herausgezoomten Ausgangsansicht zurückkehren.`);
    }
    done.onclick=finish;
  }
  async function learnedPoints(id,rect){
    if(calibrationMatches(rect))return calibration.points;
    say('Miniaturübersicht vorbereitet. Jetzt „Blockpunkte einmal aufnehmen“ wählen und die gewünschten Blockpunkte einlernen. Es wird noch kein Block geöffnet.');$('learnBlocks').disabled=false;
    await new Promise((resolve,reject)=>{pointsWait={resolve,reject};});
    if(!active(id))return null;if(!calibrationMatches(rect))throw new Error('Die aufgenommenen Punkte passen nicht zur aktuellen Ansicht. Bitte neu einlernen.');return calibration.points;
  }
  async function capture(id,rect,maskOverview=false,native=false){
    await sleep(Math.max(0,550-(Date.now()-lastCapture)));if(!active(id))return null;
    const visibility=host.style.visibility;host.style.visibility='hidden';
    try{
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));if(!active(id))return null;
      lastCapture=Date.now();const response=await chrome.runtime.sendMessage({type:'capture'});if(response.error)throw new Error(response.error);if(!active(id))return null;
      const bitmap=await createImageBitmap(await(await fetch(response.data)).blob());
      try{
        const canvas=document.createElement('canvas');canvas.width=Math.round(rect.width*(native?bitmap.width/innerWidth:1));canvas.height=Math.round(rect.height*(native?bitmap.height/innerHeight:1));
        const context=canvas.getContext('2d',{willReadFrequently:true});
        context.drawImage(bitmap,rect.x*bitmap.width/innerWidth,rect.y*bitmap.height/innerHeight,rect.width*bitmap.width/innerWidth,rect.height*bitmap.height/innerHeight,0,0,canvas.width,canvas.height);
        const data=context.getImageData(0,0,canvas.width,canvas.height).data;
        if(maskOverview&&overviewRect){
          const left=Math.max(0,Math.floor(overviewRect.x-rect.x)),right=Math.min(canvas.width,Math.ceil(overviewRect.x+overviewRect.width-rect.x));
          const top=Math.max(0,Math.floor(overviewRect.y-rect.y)),bottom=Math.min(canvas.height,Math.ceil(overviewRect.y+overviewRect.height-rect.y));
          for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)data[(y*canvas.width+x)*4+3]=0;
        }
        return{data,width:canvas.width,height:canvas.height};
      }finally{bitmap.close();}
    }finally{host.style.visibility=visibility;}
  }
  async function click(point,id){
    const visibility=host.style.visibility;host.style.visibility='hidden';
    try{
      if($('native').checked){if(!nativeConnection||!nativeRun)throw new Error('Browser-Steuerung ist nicht verbunden.');await rpc({type:'nativeInput',connection:nativeConnection,run:nativeRun,kind:'click',point:{x:point.x,y:point.y}});return;}
      const element=document.elementFromPoint(point.x,point.y);if(!element||element===host)throw new Error('Klickziel fehlt oder ist verdeckt.');
      const options={bubbles:true,cancelable:true,composed:true,view:window,clientX:point.x,clientY:point.y,button:0,detail:1};
      for(const type of ['pointerover','mouseover','pointermove','mousemove']){const EventType=type.startsWith('pointer')?PointerEvent:MouseEvent;element.dispatchEvent(new EventType(type,{...options,buttons:0,pointerId:1,pointerType:'mouse',isPrimary:true}));}
      await new Promise(resolve=>requestAnimationFrame(resolve));if(!active(id))return;
      const hit=document.elementFromPoint(point.x,point.y);
      if(!hit||(!element.contains(hit)&&!hit.contains(element)))throw new Error('Klickziel wurde nach der Mausbewegung verdeckt oder ersetzt. Kein Klick.');
      for(const type of ['pointerdown','mousedown','pointerup','mouseup','click']){
        if(!active(id))return;
        const EventType=type.startsWith('pointer')?PointerEvent:MouseEvent;
        hit.dispatchEvent(new EventType(type,{...options,buttons:type.endsWith('down')?1:0,pointerId:1,pointerType:'mouse',isPrimary:true}));
      }
    }finally{host.style.visibility=visibility;}
  }
  async function wheel(point,id){
    if(!active(id))return false;const visibility=host.style.visibility;host.style.visibility='hidden';
    try{if($('native').checked){await rpc({type:'nativeInput',connection:nativeConnection,run:nativeRun,kind:'wheel',point});return true;}return TicketZoom.wheelIn(point,host,-100);}finally{host.style.visibility=visibility;}
  }
  async function overview(id){
    if(overviewRect)return overviewRect;
    const detected=hidden(()=>TicketOverview.findContainer(host));
    if(detected){overviewRect=detected;return detected;}
    say('Zwei Zoomschritte abgeschlossen. Bitte jetzt „Übersicht oben rechts markieren“ wählen. Der Ablauf wartet und zoomt nicht erneut.');
    $('overview').disabled=false;
    const rect=await new Promise((resolve,reject)=>{overviewWait={resolve,reject};});return active(id)?rect:null;
  }
  async function detectBlock(id,rect,forceImage=false){
    const result=hidden(()=>TicketOverview.inspect(rect,host));let candidate=result.candidates[0];
    if(!candidate||forceImage){
      const frame=await capture(id,rect,false,true);if(!frame||!active(id))return null;
      const raw={...frame,data:frame.data.slice()};
      if(!candidate){
        maskUnavailable(frame,rect,result.excludedRects);
        const marker=TicketDetector.findAvailable(frame.data,frame.width,frame.height,null,'block-marker');
        if(marker){const point={x:rect.x+marker.x*rect.width/frame.width,y:rect.y+marker.y*rect.height/frame.height};candidate={...point,element:hidden(()=>document.elementFromPoint(point.x,point.y)),pixel:true};}
      }
      preview(raw,rect,candidate,result);
    }
    markTarget(candidate);return{candidate,result};
  }
  async function availableBlock(id,rect){
    let previous;
    while(active(id)){
      const detection=await detectBlock(id,rect);if(!detection||!active(id))return null;const {candidate}=detection;
      if(candidate&&previous&&candidate.element===previous.element&&Math.hypot(candidate.x-previous.x,candidate.y-previous.y)<4)return candidate;
      previous=candidate;
      say(candidate?'Farbiger verfügbarer Block erkannt · bestätige Ziel …':'Warte auf einen farbig markierten verfügbaren Block. Bestehende Verfügbarkeit zählt ebenfalls.');
      await sleep(120);
    }
    return null;
  }
  async function availableSeat(id,before,options={}){
    const deadline=Date.now()+(options.timeout||15000);let previous;
    while(active(id)){
      if(Date.now()>deadline){if(options.emptyAsNull)return null;throw new Error('Keine bestätigte Platzansicht mit freiem Punkt erkannt. Kein cart-add-Klick.');}
      const frame=await capture(id,mapRect,true);if(!frame||!active(id))return null;
      const changed=TicketDetector.sceneChanged(before.data,frame.data);
      if(changed)options.onViewChanged?.();
      if(!changed&&!options.allowUnchanged){previous=null;say('Block angeklickt · warte auf die veränderte Platzansicht …');continue;}
      const point=TicketDetector.findAvailable(frame.data,frame.width,frame.height,null,true);
      if(point&&previous&&Math.hypot(point.x-previous.x,point.y-previous.y)<5)return{x:mapRect.x+point.x,y:mapRect.y+point.y};
      previous=point;say('Suche vorhandene und neue freie runde Platzpunkte im großen Saalplan …');
    }
    return null;
  }
  async function scanLearned(id,rect,points){
    let lastVerified=-1,round=0;
    while(active(id)){
      round++;
      for(let index=0;index<points.length&&active(id);index++){
        if(!calibrationMatches(rect))throw new Error('Miniaturansicht verändert. Blockpunkte bitte neu einlernen.');
        const current=hidden(()=>TicketOverview.findContainer(host));if(current&&['x','y','width','height'].some(key=>Math.abs(current[key]-rect[key])>2))throw new Error('Die Miniaturübersicht wurde verschoben. Bitte neu einlernen.');
        const point={x:rect.x+points[index].u*rect.width,y:rect.y+points[index].v*rect.height};markTarget(point);
        const before=await capture(id,mapRect,true);if(!before||!active(id))return null;
        say(`Prüfrunde ${round} · Blockpunkt ${index+1}/${points.length} öffnen …`);await click(point,id);markTarget(null);if(!active(id))return null;
        const alreadyVerified=lastVerified===index;
        const seat=await availableSeat(id,before,{timeout:Math.max(2,Math.min(15,Number($('scanSeconds').value)||4))*1000,emptyAsNull:true,allowUnchanged:alreadyVerified,onViewChanged:()=>{lastVerified=index;}});
        if(seat)return seat;if(!active(id))return null;
        say(`Blockpunkt ${index+1}/${points.length}: kein freier Punkt bestätigt. Nächsten Block prüfen …`);await sleep(200);
      }
      if(lastVerified<0)throw new Error('Keiner der eingelernten Blockpunkte hat eine bestätigte Platzansicht geöffnet. Klickpunkte und Ausgangszoom prüfen.');
    }
    return null;
  }
  $('map').onclick=()=>select('map');$('overview').onclick=()=>select('overview');$('learnCart').onclick=()=>select('learnCart');$('stop').onclick=()=>{selectionCleanup?.();stop();};
  $('learnBlocks').onclick=recordBlocks;
  $('clearBlocks').onclick=async()=>{calibration=null;pointInfo();try{await chrome.storage?.local?.remove(pointsKey);say('Eingelernte Blockpunkte gelöscht.');}catch{say('Punkte lokal gelöscht; gespeicherte Zuordnung konnte nicht gelöscht werden.');}};
  $('probe').onclick=async()=>{
    const rect=overviewRect||hidden(()=>TicketOverview.findContainer(host));if(!rect)return say('Die sichtbare Miniaturübersicht zuerst mit „Übersicht oben rechts markieren“ auswählen.');
    overviewRect=rect;running=true;const id=++token;abort=new AbortController();controls();
    try{const result=await detectBlock(id,rect,true);if(result&&active(id))stop(result.candidate?'Prüfung: Blockziel erkannt und grün markiert. Es wurde weder gezoomt noch geklickt.':'Prüfung: Kein Blockziel erkannt. Diagnosebild speichern und den Suchausschnitt prüfen.');}catch(error){if(active(id))stop(`Prüfung fehlgeschlagen: ${error.message}`);}
  };
  $('export').onclick=()=>{if(!hasPreview)return;const link=document.createElement('a');link.href=$('blockPreview').toDataURL('image/png');link.download='ticketmaster-blockdiagnose.png';link.click();};
  $('forgetCart').onclick=async()=>{try{await chrome.storage?.local?.remove(storageKey);learnedSelector='';say('Gelerntes Warenkorbziel gelöscht. Tooltip-/Symbolsuche ist aktiv.');}catch{say('Gespeichertes Ziel konnte nicht gelöscht werden.');}};
  $('start').onclick=async()=>{
    if($('native').checked&&!nativeConnection)return say('Zuerst die Browser-Steuerung verbinden und danach den Kartenbereich markieren.');
    if(!mapRect)return say('Markiere zuerst den großen Kartenbereich.');
    markTarget(null);
    const execute=$('execute').checked;
    if(execute&&hidden(()=>TicketCart.findActions(host,learnedSelector)).length)return say('Es ist bereits eine aktive cart-add-Schaltfläche sichtbar. Vor dem Start die bestehende Platzauswahl im Shop zurücksetzen und ganz herauszoomen.');
    running=true;const id=++token;abort=new AbortController();controls();
    try{
      await endPending;if(!active(id))return;
      if($('native').checked){const connection=nativeConnection;const response=await rpc({type:'nativeBegin',connection});if(!active(id)){await rpc({type:'nativeEnd',connection,run:response.run});return;}nativeRun=response.run;}
      say('Schritt 1/4 · Ausgangsansicht aufnehmen …');const initial=await capture(id,mapRect);if(!initial||!active(id))return;
      const origin={x:mapRect.x+mapRect.width/2,y:mapRect.y+mapRect.height/2};
      for(let step=1;step<=2;step++){
        if(!active(id))return;say(`Schritt 1/4 · Mausrad hineinzoomen ${step}/2 …`);
        if(!await wheel(origin,id))throw new Error('Am Mittelpunkt des Kartenbereichs wurde kein Kartenelement für den Zoom gefunden.');
        await sleep(180);
      }
      let changed=false;
      for(let attempt=0;attempt<3;attempt++){const frame=await capture(id,mapRect);if(!frame||!active(id))return;if(TicketDetector.sceneChanged(initial.data,frame.data,0)){changed=true;break;}}
      if(!changed)throw new Error('Zwei Mausradereignisse gesendet, aber keine sichtbare Kartenänderung erkannt. Der Shop akzeptiert den synthetischen Zoom möglicherweise nicht.');
      const rect=await overview(id);if(!rect||!active(id))return;
      let seat;
      if($('blockMode').value==='learned'){
        const points=await learnedPoints(id,rect);if(!points||!active(id))return;
        if(!execute){markTarget({x:rect.x+points[0].u*rect.width,y:rect.y+points[0].v*rect.height});return stop(`Test abgeschlossen: zwei Zoomereignisse, ${points.length} Blockpunkte bereit. Es wurde kein Block, Platz oder cart add angeklickt.`);}
        seat=await scanLearned(id,rect,points);
      }else{
        say('Schritt 2/4 · Suche farbig verfügbaren Block in der Übersicht oben rechts …');
      const block=await availableBlock(id,rect);if(!block||!active(id))return;
      if(!execute)return stop('Test abgeschlossen: zwei Zoomereignisse und verfügbarer Block erkannt. Keine Block-, Platz- oder cart-add-Klicks.');
      const before=await capture(id,mapRect,true);if(!before||!active(id))return;
      if(block.pixel){
        const current=await detectBlock(id,rect,true);if(!current||!active(id))return;
        if(!current.candidate||Math.hypot(current.candidate.x-block.x,current.candidate.y-block.y)>4)throw new Error('Die farbige Blockmarkierung hat sich geändert. Kein Blockklick.');
      }else{
        const current=hidden(()=>TicketOverview.inspect(rect,host)).candidates;
        if(!current.some(candidate=>candidate.element===block.element&&Math.hypot(candidate.x-block.x,candidate.y-block.y)<4))throw new Error('Die Verfügbarkeitsmarkierung des Blocks hat sich geändert. Kein Blockklick.');
      }
      say('Schritt 2/4 · Verfügbaren Block einmal anklicken …');await click(block,id);markTarget(null);if(!active(id))return;
        seat=await availableSeat(id,before);
      }
      if(!seat||!active(id))return;
      say('Schritt 3/4 · Freien Platz einmal anklicken …');await click(seat,id);if(!active(id))return;
      say('Schritt 4/4 · Warte auf sichtbare aktive Schaltfläche „cart add“ …');
      const cart=await TicketCart.waitForAction({signal:abort.signal,exclude:host,selector:learnedSelector});if(!active(id))return;
      const actions=TicketCart.findActions(host,learnedSelector);
      if(actions.length!==1||actions[0].element!==cart.element)throw new Error('cart-add-Ziel hat sich verändert. Kein Hinzufügen-Klick.');
      await click(actions[0],id);if(active(id))stop('Ablauf beendet: 2 × Zoom → Block → freier Platz → cart add. Ergebnis bitte im Shop prüfen.');
    }catch(error){if(active(id))stop(`Gestoppt: ${error.message}`);}
  };
  function geometry(event){if(selectionCleanup||event?.composedPath().includes(host))return;mapRect=undefined;overviewRect=undefined;$('map').textContent='1 · Großen Kartenbereich markieren';$('overview').textContent='2 · Übersicht oben rechts markieren (falls nötig)';if(connecting)return;stop('Browseransicht verschoben oder verändert. Bereiche neu wählen und vor dem Neustart ganz herauszoomen.');}
  function visibility(){if(document.hidden)stop('Tab nicht sichtbar. Ablauf gestoppt.');}
  function escape(event){if(event.key==='Escape'){selectionCleanup?.();stop();}}
  window.addEventListener('scroll',geometry,true);window.addEventListener('resize',geometry);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',escape,true);
  $('close').onclick=()=>{selectionCleanup?.();stop();const connection=nativeConnection;nativeConnection=null;if(connection)endPending.then(()=>rpc({type:'nativeDisconnect',connection})).catch(()=>{});host.remove();window.removeEventListener('scroll',geometry,true);window.removeEventListener('resize',geometry);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',escape,true);chrome.runtime.onMessage?.removeListener?.(detached);};
})();
