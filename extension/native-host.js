(() => {
  const sessions=new Map();
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function activeTab(tabId){
    const tab=await chrome.tabs.get(tabId);
    if(!/^https?:/.test(tab.url||''))throw new Error('Browser-Steuerung ist nur für normale Webseiten verfügbar.');
    const [active]=await chrome.tabs.query({active:true,windowId:tab.windowId});
    if(active?.id!==tabId)throw new Error('Der gesteuerte Tab muss sichtbar und aktiv bleiben.');
    return tab;
  }
  function sessionFor(tabId,id){const session=sessions.get(tabId);if(!session||session.id!==id||session.closing)throw new Error('Browser-Verbindung fehlt oder wurde beendet. Bitte neu verbinden.');return session;}
  async function connect(tabId){
    const tab=await activeTab(tabId);const existing=sessions.get(tabId);
    if(existing?.closing){await existing.closing;return connect(tabId);}
    if(existing)return{connection:existing.id};
    try{await chrome.debugger.attach({tabId},'1.3');}catch{throw new Error('Browser-Steuerung konnte nicht verbunden werden. Eventuell sind Entwicklertools oder ein anderer Debugger geöffnet.');}
    const session={id:crypto.randomUUID(),origin:new URL(tab.url).origin,run:null,queue:Promise.resolve(),pressed:false};sessions.set(tabId,session);
    return{connection:session.id};
  }
  function enqueue(session,work){const result=session.queue.then(work);session.queue=result.catch(()=>{});return result;}
  async function release(tabId,session){if(session.pressed){session.pressed=false;try{await chrome.debugger.sendCommand({tabId},'Input.dispatchMouseEvent',{type:'mouseReleased',x:session.lastX,y:session.lastY,button:'left',clickCount:1});}catch{}}}
  async function begin(tabId,id){const session=sessionFor(tabId,id);await activeTab(tabId);session.run=null;await session.queue;await release(tabId,session);session.run=crypto.randomUUID();return{run:session.run};}
  async function end(tabId,id,run){const session=sessions.get(tabId);if(!session||session.id!==id||session.run!==run)return{};session.run=null;await session.queue;await release(tabId,session);return{};}
  async function input(tabId,id,run,kind,point){
    const session=sessionFor(tabId,id);
    if(!['wheel','click'].includes(kind)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||point.x<0||point.y<0||point.x>20000||point.y>20000)throw new Error('Ungültige Browser-Eingabe.');
    return enqueue(session,async()=>{
      const live=()=>sessions.get(tabId)===session&&session.run===run&&Boolean(run);
      async function command(params){if(!live())throw new Error('Eingabe abgebrochen.');const tab=await activeTab(tabId);if(new URL(tab.url).origin!==session.origin)throw new Error('Die Shopseite wurde verlassen.');if(!live())throw new Error('Eingabe abgebrochen.');return chrome.debugger.sendCommand({tabId},'Input.dispatchMouseEvent',params);}
      if(kind==='wheel'){await command({type:'mouseWheel',x:point.x,y:point.y,deltaX:0,deltaY:-100});return{};}
      try{
        await command({type:'mouseMoved',x:point.x,y:point.y});await pause(30);
        await command({type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});session.pressed=true;session.lastX=point.x;session.lastY=point.y;
        await command({type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});session.pressed=false;
      }finally{await release(tabId,session);}
      return{};
    });
  }
  async function disconnect(tabId,id){const session=sessions.get(tabId);if(!session||(id&&session.id!==id))return{};if(session.closing)return session.closing;session.run=null;session.closing=(async()=>{await session.queue;await release(tabId,session);sessions.delete(tabId);try{await chrome.debugger.detach({tabId});}catch{}return{};})();return session.closing;}
  chrome.debugger.onDetach.addListener(source=>{if(!source.tabId||!sessions.has(source.tabId))return;sessions.delete(source.tabId);chrome.tabs.sendMessage(source.tabId,{type:'nativeDetached'}).catch(()=>{});});
  chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status==='loading'&&sessions.has(tabId))disconnect(tabId).catch(()=>{});});
  globalThis.TicketNativeHost={connect,begin,input,end,disconnect};
})();
