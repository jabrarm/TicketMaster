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
    const context = globalThis.TicketAvailability.shop(location.href);
    if (context?.type !== 'event') throw new Error('Unbekannte Ticketseite.');
    const response = await fetch(context.cartUrl, { credentials: 'same-origin', cache: 'no-store' });
    const returned = globalThis.TicketAvailability.shop(response.url);
    if (!response.ok || returned?.type !== 'cart' || returned.baseUrl !== context.baseUrl) throw new Error('Der bestehende Warenkorb konnte nicht im richtigen Shop gelesen werden.');
    const receipt = read(new DOMParser().parseFromString(await response.text(), 'text/html'));
    if (!receipt.valid) throw new Error('Der Warenkorb hat ein unbekanntes Format. Es wird nichts automatisch hinzugefügt.');
    return receipt;
  }
  globalThis.TicketCartReceipt = { read, baseline };
})();
