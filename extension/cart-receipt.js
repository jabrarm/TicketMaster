(() => {
  if (globalThis.TicketCartReceipt) return;
  function read(doc) {
    const cards = [...doc.querySelectorAll('.seat-card[data-seat-identifier]')].filter(c => !c.classList.contains('hidden-card'));
    const keys = cards.map(c => c.getAttribute('data-seat-identifier'));
    const knownCart = Boolean(doc.querySelector('#continue-shopping-button'));
    const empty = !cards.length && Boolean(doc.querySelector('.empty-state'));
    const valid = knownCart && (Boolean(doc.querySelector('#seat-cards-list')) || empty) && keys.every(k => typeof k === 'string' && k.length > 0 && k.length < 200) && new Set(keys).size === keys.length;
    return { valid, keys, entries: cards.map((c, i) => ({ key: keys[i], seatId: c.getAttribute('data-seat-id') || null })) };
  }
  const sessionMessages = {
    loggedOut: 'Der Shop meldet, dass du abgemeldet bist. Bitte im Shop anmelden und die Suche erneut starten.',
    queue: 'Der Shop leitet in die Warteschlange weiter. Bitte im Shop warten und die Suche danach erneut starten.'
  };
  let pending, session = null;

  function accountAction(value, context) {
    try {
      const url = new URL(value, context.baseUrl);
      if (url.origin !== new URL(context.baseUrl).origin || !url.pathname.startsWith(context.basePath)) return null;
      const path = url.pathname.slice(context.basePath.length);
      if (/(?:^|\/)(?:logout|log-out|signout|sign-out|logoff)(?:\/|$)/i.test(path)) return 'logout';
      if (/(?:^|\/)(?:login|log-in|loginform|signin|sign-in|logon)(?:\/|$)/i.test(path)) return 'login';
    } catch {}
    return null;
  }

  function accountState(doc, context) {
    let login = false;
    for (const control of doc.querySelectorAll('a[href],form[action]')) {
      const value = control.getAttribute(control.localName === 'form' ? 'action' : 'href');
      if (!value || !/(?:log|sign)/i.test(value)) continue;
      const action = accountAction(value, context);
      if (action === 'logout') return 'loggedIn';
      if (action === 'login') login = true;
    }
    if (login || (!doc.querySelector('#continue-shopping-button') && doc.querySelector('form input[type="password"]'))) return 'loggedOut';
    return 'unknown';
  }

  async function readCart() {
    const context = globalThis.TicketAvailability.shop(location.href);
    if (context?.type !== 'event') throw new Error('Unbekannte Ticketseite.');
    const response = await fetch(context.cartUrl, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const url = new URL(response.url);
    if (url.origin === location.origin && /^\/queue(?:\/|$)/.test(url.pathname)) return { state: 'queue' };
    if ((url.origin === location.origin && response.status === 401) || accountAction(url.href, context) === 'login') return { state: 'loggedOut' };
    const returned = globalThis.TicketAvailability.shop(url.href);
    if (!response.ok || returned?.type !== 'cart' || returned.baseUrl !== context.baseUrl) {
      throw new Error('Der bestehende Warenkorb konnte nicht im richtigen Shop gelesen werden.');
    }
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    return { state: accountState(doc, context), receipt: read(doc) };
  }

  function inspectCart() {
    pending ||= readCart().then(result => {
      session = { state: result.state, checkedAt: Date.now() };
      return result;
    }).finally(() => { pending = null; });
    return pending;
  }

  function assertSession() {
    const message = sessionMessages[session?.state];
    if (message) throw Object.assign(new Error(message), { session });
  }

  async function checkSession() {
    try { await inspectCart(); return session; }
    catch { return { state: 'unknown', checkedAt: Date.now() }; }
  }

  async function baseline() {
    const { receipt } = await inspectCart();
    assertSession();
    if (!receipt?.valid) throw new Error('Der Warenkorb hat ein unbekanntes Format. Es wird nichts automatisch hinzugefügt.');
    return receipt;
  }
  globalThis.TicketCartReceipt = { read, baseline, checkSession, assertSession };
})();
