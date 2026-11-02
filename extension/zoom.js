(() => {
  const normalize = text => (text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  function findZoomIn(exclude) {
    const matches=[];
    for(const element of document.querySelectorAll('button,a,[role="button"],[onclick]')) {
      if(element===exclude || exclude?.contains(element)) continue;
      const labels=[element.getAttribute('aria-label'),element.getAttribute('title'),element.textContent];
      const labelled=(element.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ');
      labels.push(labelled);
      // A bare plus or quantity-increase control is never accepted as map zoom.
      const named=labels.some(label=>/^(?:(?:map|karte|saalplan) )?(?:zoom in|vergro[sß]ern|hineinzoomen)$/.test(normalize(label)));
      const icons=[element,...element.querySelectorAll('[class],[data-icon],use')];
      const icon=icons.some(node=>/(?:^|[\s#/:])(?:fa-|fas-|far-|mdi-|bi-|icon-)?(?:zoom-in|search-plus|magnifying-glass-plus)(?=$|[\s.#/?])/i.test([node.getAttribute('class'),node.getAttribute('data-icon'),node.getAttribute('href'),node.getAttribute('xlink:href')].filter(Boolean).join(' ')));
      if(!named && !icon) continue;
      const point=TicketCart.pointFor(element);
      if(!point) continue;
      if(matches.some(match=>match.element.contains(element))) continue;
      const nested=matches.findIndex(match=>element.contains(match.element));
      if(nested>=0) matches.splice(nested,1);
      matches.push(point);
    }
    if(matches.length>1) throw new Error('Mehrere Zoomsteuerungen gefunden. Kein Zoomklick.');
    return matches[0]||null;
  }
  globalThis.TicketZoom={findZoomIn};
})();
