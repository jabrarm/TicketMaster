(() => {
  const normalize = value => (value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\p{Extended_Pictographic}|\uFE0F/gu, ' ').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  function isAddAction(value) {
    const label = normalize(value);
    if (/\b(?:wishlist|remove|delete|entfernen|checkout|kasse|zahlen)\b/.test(label)) return false;
    return /^add\s+(?:items?|tickets?)(?:\s*\(\d+\))?$/.test(label)
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
  function findActions(exclude) {
    const matches = [];
    for (const element of document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')) {
      if (element === exclude || exclude?.contains(element)) continue;
      const labelled = (element.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
      const labels = [element.getAttribute('aria-label'), element.getAttribute('title'), labelled, element.textContent, element.value];
      if (!labels.some(isAddAction)) continue;
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
  function waitForAction({ signal, timeout = 8000, exclude } = {}) {
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
          const matches = findActions(exclude);
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
  globalThis.TicketCart = { isAddAction, findActions, pointFor, waitForAction };
  if (typeof module !== 'undefined') module.exports = { isAddAction };
})();
