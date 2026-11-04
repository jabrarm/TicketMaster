(() => {
  const blockSelector='[data-block],[data-block-id],[data-block-name],.block,.seat-block';
  const normalize=value=>(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const blockId=/^(?:block[-_ ]?)?(?:[NOSW]\d{1,3}|BT\d{1,2}|\d{1,3})$/i;
  const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1;
  const colorContext=colorCanvas.getContext('2d',{willReadFrequently:true});
  function coloredPaint(element) {
    const style=getComputedStyle(element);
    return [style.fill,style.stroke,style.backgroundColor].some(value=>{
      if(!value || !CSS.supports('color',value))return false;
      colorContext.clearRect(0,0,1,1);colorContext.fillStyle=value;colorContext.fillRect(0,0,1,1);
      const rgba=colorContext.getImageData(0,0,1,1).data;
      return rgba[3]>32 && Math.max(...rgba.slice(0,3))-Math.min(...rgba.slice(0,3))>=16;
    });
  }
  function blockState(element) {
    if(element.closest('[aria-disabled="true"],[inert]') || element.matches(':disabled'))return false;
    const count=element.getAttribute('data-free-seats') ?? element.getAttribute('data-available-seats');
    if(count!==null && /^\d+$/.test(count.trim()))return Number(count)>0;
    const flag=normalize(element.getAttribute('data-available') ?? element.getAttribute('data-availability') ?? element.getAttribute('data-status'));
    if(['false','0','unavailable','sold-out','soldout','disabled','unavailable-seats'].includes(flag))return false;
    if(['true','1','available','free'].includes(flag))return true;
    const classes=[...element.classList].map(normalize);
    if(classes.some(name=>['unavailable','sold-out','is-unavailable','disabled'].includes(name)))return false;
    if(classes.some(name=>['available','is-available','has-available-seats','has-free-seats'].includes(name)))return true;
    const label=normalize(element.getAttribute('aria-label') || element.getAttribute('title'));
    if(/\b(?:keine freien platze|nicht verfugbar|no available seats|sold out)\b/.test(label))return false;
    if(/\b(?:freie platze|verfugbar|available|free seats)\b/.test(label))return true;
    return null;
  }
  function inside(point,rect){return point.x>=rect.x&&point.y>=rect.y&&point.x<rect.x+rect.width&&point.y<rect.y+rect.height;}
  function visible(element){
    if(!element.isConnected || element.closest('defs,symbol,clipPath,mask,pattern') || !element.getClientRects().length)return false;
    for(let parent=element;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(style.visibility!=='visible'||style.display==='none'||Number(style.opacity)===0)return false;}
    return true;
  }
  function intersects(bounds,rect){return bounds.width>0&&bounds.height>0&&bounds.left<rect.x+rect.width&&bounds.right>rect.x&&bounds.top<rect.y+rect.height&&bounds.bottom>rect.y;}
  function pointOn(element,rect){
    if(!visible(element))return null;
    const bounds=element.getBoundingClientRect();if(!intersects(bounds,rect))return null;
    const left=Math.max(0,bounds.left,rect.x),right=Math.min(innerWidth,bounds.right,rect.x+rect.width);
    const top=Math.max(0,bounds.top,rect.y),bottom=Math.min(innerHeight,bounds.bottom,rect.y+rect.height);
    const ctm=typeof element.getScreenCTM==='function'?element.getScreenCTM():null;
    let inverse;try{inverse=ctm?.inverse();}catch{}
    function test(x,y){
      if(x<left||x>=right||y<top||y>=bottom)return null;
      if(inverse&&typeof element.isPointInFill==='function'){
        const local=new DOMPoint(x,y).matrixTransform(inverse);
        let geometric=false;try{geometric=element.isPointInFill(local)||element.isPointInStroke(local);}catch{}
        if(!geometric)return null;
      }
      const hit=document.elementFromPoint(x,y);
      if(!hit || (!element.contains(hit)&&hit!==element.ownerSVGElement))return null;
      return{x,y,element:hit};
    }
    // A stadium wedge can have a bounding-box center outside its painted area.
    for(const fy of [.5,.25,.75,.1,.9,.02,.98])for(const fx of [.5,.25,.75,.1,.9,.02,.98]){const point=test(left+(right-left)*fx,top+(bottom-top)*fy);if(point)return point;}
    if(inverse&&typeof element.getTotalLength==='function'){
      try{const length=element.getTotalLength();for(let n=0;n<40;n++){const local=element.getPointAtLength(length*(n+.5)/40);const screen=new DOMPoint(local.x,local.y).matrixTransform(ctm);const point=test(screen.x,screen.y);if(point)return point;}}catch{}
    }
    return null;
  }
  function inspect(rect,exclude){
    const blocks=new Set();
    for(const element of document.querySelectorAll(`${blockSelector},svg path[id],svg polygon[id],svg g[id],svg rect[id],svg circle[id],svg ellipse[id],svg use[id]`)){
      if(!element.matches(blockSelector)&&!blockId.test(element.id))continue;
      if(element===exclude||exclude?.contains(element)||!visible(element)||!intersects(element.getBoundingClientRect(),rect))continue;
      blocks.add(element);
    }
    // Some maps give their groups generated IDs but retain readable SVG labels.
    for(const label of document.querySelectorAll('svg text')){
      if(!blockId.test(label.textContent.trim()))continue;
      let group=label.parentElement;
      for(let depth=0;group&&group.localName!=='svg'&&depth<4;depth++,group=group.parentElement){
        if(group.localName!=='g')continue;
        const labels=[...group.querySelectorAll('text')].filter(node=>blockId.test(node.textContent.trim()));
        if(labels.length!==1)break;
        if(group.querySelector('path,polygon,rect,circle,ellipse,use')&&visible(group)&&intersects(group.getBoundingClientRect(),rect)){blocks.add(group);break;}
      }
    }
    let supported=0;const candidates=[],excludedRects=[];
    for(const block of blocks){
      const nodes=[block,...block.querySelectorAll('[data-available],[data-free-seats],[data-available-seats],[data-status],.available,.is-available,.has-free-seats,[aria-label],[title]')];
      const states=nodes.map(blockState);
      if(states.some(state=>state!==null))supported++;
      const unavailable=states[0]===false || (states.includes(false)&&!states.includes(true));
      if(unavailable){const bounds=block.getBoundingClientRect();excludedRects.push({x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height});continue;}
      const shapes=block.matches('path,polygon,rect,circle,ellipse,use')?[block]:[...block.querySelectorAll('path,polygon,rect,circle,ellipse,use')];
      const colored=shapes.filter(coloredPaint);
      if(!states.includes(true)&&!colored.length&&!coloredPaint(block))continue;
      let point;
      for(const shape of colored.length?colored:shapes){point=pointOn(shape,rect);if(point)break;}
      point ||= pointOn(block,rect);
      if(point&&!candidates.some(candidate=>candidate.blockElement===block||candidate.blockElement.contains(block)))candidates.push({...point,blockElement:block});
    }
    return{candidates,recognized:blocks.size,supported,excludedRects};
  }
  function findContainer(exclude){
    const rects=[];
    for(const element of document.querySelectorAll('[data-minimap],[data-mini-map],.minimap,.mini-map,[id*="miniMap"],[id*="minimap"],[class*="miniMap"],[class*="MiniMap"],[class*="minimap"]')){
      if(element===exclude||exclude?.contains(element))continue;
      const bounds=element.getBoundingClientRect();
      if(bounds.width<20||bounds.height<20||bounds.width>innerWidth*.5||bounds.height>innerHeight*.6||!visible(element))continue;
      const rect={x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height};
      if(rect.x<0||rect.y<0||rect.x+rect.width>innerWidth||rect.y+rect.height>innerHeight)continue;
      if(!rects.some(other=>Math.abs(other.x-rect.x)<3&&Math.abs(other.y-rect.y)<3))rects.push(rect);
    }
    return rects.length===1?rects[0]:null;
  }
  globalThis.TicketOverview={inspect,findContainer};
})();
