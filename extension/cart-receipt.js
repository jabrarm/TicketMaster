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
  async function baseline() {
    const event = globalThis.TicketAvailability.eventId(location.href);
    if (!event) throw new Error('Unbekannte Ticketseite.');
    const path = location.pathname.replace(/areaplan\/venue\/event\/\d+\/?$/, 'shoppingcart');
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok || new URL(response.url).origin !== location.origin || !/^\/ols\/werderbremen-hospitality\/de\/tageskarte\/channel\/shop\/shoppingcart\/?$/.test(new URL(response.url).pathname)) throw new Error('Der bestehende Warenkorb konnte nicht gelesen werden.');
    const receipt = read(new DOMParser().parseFromString(await response.text(), 'text/html'));
    if (!receipt.valid) throw new Error('Der Warenkorb hat ein unbekanntes Format. Es wird nichts automatisch hinzugefügt.');
    return receipt;
  }
  globalThis.TicketCartReceipt = { read, baseline };
})();
