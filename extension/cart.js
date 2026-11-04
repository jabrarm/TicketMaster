(() => {
  const normalize = value => (value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\p{Extended_Pictographic}|\uFE0F/gu, ' ').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  function isAddAction(value) {
    const label = normalize(value);
    if (/\b(?:wishlist|remove|delete|entfernen|checkout|kasse|zahlen)\b/.test(label)) return false;
    return /^(?:cart|basket) add$/.test(label)
      || /^add\s+(?:items?|tickets?)(?:\s*\(\d+\))?$/.test(label)
      || /\badd\b.*\b(?:cart|basket)\b/.test(label)
      || /\bin (?:den|ihren|meinen) warenkorb\b/.test(label)
      || /\b(?:warenkorb|einkaufswagen)\b.*\bhinzufugen\b/.test(label)
      || /\bhinzufugen\b.*\b(?:warenkorb|einkaufswagen)\b/.test(label);
  }
  function pointFor(element) {
    if (!element?.isConnected || element.matches(':disabled') || element.closest('[inert],[aria-disabled="true"],[aria-hidden="true"]')) return null;
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return null;
    }
    if (getComputedStyle(element).pointerEvents === 'none') return null;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    if (point.x < 0 || point.y < 0 || point.x >= innerWidth || point.y >= innerHeight) return null;
    const top = document.elementFromPoint(point.x, point.y);
    return top && element.contains(top) ? { ...point, element } : null;
  }
  function iconAddsToCart(element) {
    const icons = [element, ...element.querySelectorAll('[class],[data-icon],use,img,[title],[aria-label]')];
    return icons.some(icon => {
      const identifiers = [icon.getAttribute('class'), icon.getAttribute('data-icon'), icon.getAttribute('href'), icon.getAttribute('xlink:href'), icon.getAttribute('alt'), icon.getAttribute('title'), icon.getAttribute('aria-label')].filter(Boolean).join(' ');
      return /(?:^|[\s#/:])(?:fa-|fas-|far-|mdi-|bi-|icon-)?(?:cart-plus|cart-plus-fill|cart-arrow-down|add-shopping-cart|shopping-cart-add|cart-add|shopping-cart-plus)(?=$|[\s.#/?])/i.test(identifiers)
        || isAddAction(identifiers);
    });
  }
  function findActions(exclude, selector = '') {
    const matches = [];
    const elements = document.querySelectorAll(selector || 'button,a,[role="button"],[onclick],input[type="button"],input[type="submit"]');
    for (const element of elements) {
      if (element === exclude || exclude?.contains(element)) continue;
      const labelled = (element.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
      const described = (element.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
      const labels = [element.getAttribute('aria-label'), element.getAttribute('title'),element.getAttribute('data-original-title'),element.getAttribute('data-bs-title'),element.getAttribute('data-bs-original-title'),element.getAttribute('data-tooltip'),element.getAttribute('mattooltip'), labelled, described, element.textContent, element.value];
      if (!selector && !labels.some(isAddAction) && !iconAddsToCart(element)) continue;
      const point = pointFor(element);
      if (!point) continue;
      // Nested role=button nodes describe one target, not two alternatives.
      if (matches.some(match => match.element.contains(element))) continue;
      const nested = matches.findIndex(match => element.contains(match.element));
      if (nested >= 0) matches.splice(nested, 1);
      matches.push(point);
    }
    return matches;
  }
  function selectorFor(element) {
    if (!element?.isConnected) throw new Error('Die Schaltfläche ist nicht mehr vorhanden.');
    const unique = selector => {const matches=document.querySelectorAll(selector);return matches.length===1 && matches[0]===element;};
    if (element.id) {
      const selector = `#${CSS.escape(element.id)}`;
      if (unique(selector)) return selector;
    }
    for (const attribute of ['data-testid','data-test','name','aria-label','title']) {
      const value=element.getAttribute(attribute);
      if (value) {
        const selector=`${element.localName}[${attribute}="${CSS.escape(value)}"]`;
        if (unique(selector)) return selector;
      }
    }
    const classes=[...element.classList].filter(name=>!/^(?:active|selected|disabled|enabled|hover|focus|is-active|is-disabled)$/.test(name));
    if(classes.length) {
      const selector=element.localName+classes.map(name=>`.${CSS.escape(name)}`).join('');
      if(unique(selector)) return selector;
    }
    throw new Error('Kein eindeutiges dauerhaftes Merkmal gefunden. Die Schaltfläche muss an die echte Seite angepasst werden.');
  }
  function waitForAction({ signal, timeout = 8000, exclude, selector = '' } = {}) {
    return new Promise((resolve, reject) => {
      let done = false, observer, interval, timer;
      function finish(error, value) {
        if (done) return;
        done = true; observer?.disconnect(); clearInterval(interval); clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve(value);
      }
      const abort = () => finish(new Error('Warenkorbsuche abgebrochen.'));
      function check() {
        if (signal?.aborted) return abort();
        try {
          const matches = findActions(exclude, selector);
          if (matches.length > 1) return finish(new Error('Mehrere aktive Hinzufügen-Schaltflächen gefunden. Kein Warenkorbklick.'));
          if (matches.length === 1) finish(null, matches[0]);
        } catch (error) { finish(error); }
      }
      observer = new MutationObserver(check);
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      interval = setInterval(check, 100); // Also handles visibility changes during CSS transitions.
      timer = setTimeout(() => finish(new Error('Keine eindeutige aktive Hinzufügen-Schaltfläche gefunden. Kein Warenkorbklick.')), timeout);
      signal?.addEventListener('abort', abort, { once: true });
      check();
    });
  }
  globalThis.TicketCart = { isAddAction, findActions, pointFor, selectorFor, waitForAction };
  if (typeof module !== 'undefined') module.exports = { isAddAction };
})();
