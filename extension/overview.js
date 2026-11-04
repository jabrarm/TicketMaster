(() => {
  const blockSelector='[data-block],[data-block-id],[data-block-name],.block,.seat-block';
  const normalize=value=>(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const blockId=/^(?:block[-_ ]?)?(?:[NOSW]\d{1,3}|BT\d{1,2}|\d{1,3})$/i;
  function coloredFill(element) {
    const values=[getComputedStyle(element).fill,getComputedStyle(element).backgroundColor];
    return values.some(value=>{
      const match=value?.match(/^rgba?\(([^)]+)\)$/);
      if(!match) return false;
      const channels=match[1].split(/[,\s/]+/).map(Number);
      if(channels.length>3 && channels[3]===0) return false;
      return Math.max(...channels.slice(0,3))-Math.min(...channels.slice(0,3))>=16;
    });
  }
  function blockState(element) {
    const count=element.getAttribute('data-free-seats') ?? element.getAttribute('data-available-seats');
    if(count!==null && /^\d+$/.test(count.trim())) return Number(count)>0;
    const flag=normalize(element.getAttribute('data-available') ?? element.getAttribute('data-availability') ?? element.getAttribute('data-status'));
    if(['false','0','unavailable','sold-out','soldout','disabled','unavailable-seats'].includes(flag)) return false;
    if(['true','1','available','free'].includes(flag)) return true;
    const classes=[...element.classList].map(normalize);
    if(classes.some(name=>['unavailable','sold-out','is-unavailable','disabled'].includes(name))) return false;
    if(classes.some(name=>['available','is-available','has-available-seats','has-free-seats'].includes(name))) return true;
    const label=normalize(element.getAttribute('aria-label') || element.getAttribute('title'));
    if(/\b(?:keine freien platze|nicht verfugbar|no available seats|sold out)\b/.test(label)) return false;
    if(/\b(?:freie platze|verfugbar|available|free seats)\b/.test(label)) return true;
    return null;
  }
  function inside(point,rect) {return point.x>=rect.x && point.y>=rect.y && point.x<rect.x+rect.width && point.y<rect.y+rect.height;}
  function inspect(rect,exclude) {
    const blocks=new Set();
    for(const element of document.querySelectorAll(`${blockSelector},svg path[id],svg polygon[id],svg g[id],svg rect[id]`)) {
      if(!element.matches(blockSelector) && !blockId.test(element.id)) continue;
      if(element===exclude || exclude?.contains(element)) continue;
      const point=TicketCart.pointFor(element);
      if(point && inside(point,rect)) blocks.add(element);
    }
    let supported=0;
    const candidates=[];
    for(const block of blocks) {
      const nodes=[block,...block.querySelectorAll('[data-available],[data-free-seats],[data-available-seats],[data-status],.available,.is-available,.has-free-seats,[aria-label],[title]')];
      const states=nodes.map(blockState);
      const shapes=block.matches('path,polygon,rect,circle') ? [block] : [...block.querySelectorAll('path,polygon,rect')];
      const hasColor=shapes.some(coloredFill) || (!block.matches('g,svg') && coloredFill(block));
      if(states.some(state=>state!==null)) supported++;
      // The availability indication is a colored block fill, never the blue
      // viewport outline (stroke) or the pitch, which has no block identity.
      if(states[0]===false || (states.includes(false)&&!states.includes(true)) || (!states.includes(true) && !hasColor)) continue;
      const point=TicketCart.pointFor(block);
      if(point && !candidates.some(candidate=>candidate.element.contains(block))) candidates.push(point);
    }
    return {candidates,recognized:blocks.size,supported};
  }
  function findContainer(exclude) {
    const rects=[];
    for(const element of document.querySelectorAll('[data-minimap],[data-mini-map],.minimap,.mini-map,[id*="miniMap"],[id*="minimap"],[class*="miniMap"],[class*="MiniMap"]')) {
      if(element===exclude || exclude?.contains(element)) continue;
      const bounds=element.getBoundingClientRect();
      if(bounds.width<20 || bounds.height<20 || bounds.width>innerWidth*0.5 || bounds.height>innerHeight*0.6 || !element.getClientRects().length) continue;
      const style=getComputedStyle(element);
      if(style.visibility!=='visible' || style.display==='none' || Number(style.opacity)===0) continue;
      const rect={x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height};
      if(rect.x<0 || rect.y<0 || rect.x+rect.width>innerWidth || rect.y+rect.height>innerHeight) continue;
      if(!rects.some(other=>Math.abs(other.x-rect.x)<3 && Math.abs(other.y-rect.y)<3)) rects.push(rect);
    }
    return rects.length===1 ? rects[0] : null;
  }
  globalThis.TicketOverview={inspect,findContainer};
})();
