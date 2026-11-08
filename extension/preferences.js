(() => {
  'use strict';
  const entities = { amp: '&', quot: '"', apos: "'", auml: 'ä', ouml: 'ö', uuml: 'ü', szlig: 'ß' };
  const normal = value => String(value || '').replace(/&#(\d+);|&#x([0-9a-f]+);|&([a-z]+);/gi, (whole, dec, hex, named) => {
    const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : null;
    return code != null && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entities[named?.toLowerCase()] || whole;
  }).normalize('NFKC').toLowerCase().replace(/ß/g, 'ss').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const item = (id, label, region, min, max) => ({ id, label, region, min, max });
  const catalog = [
    { id: 'pk1', label: 'Platzkategorie 1', children: [item('pk1-nmu', 'Nord Mitte Unterrang · Reihe 10–19', 'Nord Mitte Unterrang', 10, 19), item('pk1-nmo', 'Nord Mitte Oberrang', 'Nord Mitte Oberrang'), item('pk1-smu', 'Süd Mitte Unterrang · Reihe 10–29', 'Süd Mitte Unterrang', 10, 29), item('pk1-smo', 'Süd Mitte Oberrang', 'Süd Mitte Oberrang')] },
    { id: 'pk2', label: 'Platzkategorie 2', children: [item('pk2-nmu', 'Nord Mitte Unterrang · Reihe 1–9', 'Nord Mitte Unterrang', 1, 9), item('pk2-smu', 'Süd Mitte Unterrang · Reihe 1–9', 'Süd Mitte Unterrang', 1, 9), item('pk2-nso', 'Nord Seite Oberrang', 'Nord Seite Oberrang'), item('pk2-nsu', 'Nord Seite Unterrang · Reihe 10–29', 'Nord Seite Unterrang', 10, 29), item('pk2-ssu', 'Süd Seite Unterrang · Reihe 10–29', 'Süd Seite Unterrang', 10, 29), item('pk2-sso', 'Süd Seite Oberrang', 'Süd Seite Oberrang')] },
    { id: 'pk3', label: 'Platzkategorie 3', children: [item('pk3-nsu', 'Nord Seite Unterrang · Reihe 1–9', 'Nord Seite Unterrang', 1, 9), item('pk3-ssu', 'Süd Seite Unterrang · Reihe 1–9', 'Süd Seite Unterrang', 1, 9), item('pk3-wu', 'West Unterrang · Reihe 10–29', 'West Unterrang', 10, 29), item('pk3-wo', 'West Oberrang', 'West Oberrang'), item('pk3-oo', 'Ost Oberrang', 'Ost Oberrang')] },
    { id: 'pk4', label: 'Platzkategorie 4', children: [item('pk4-wu', 'West Unterrang · Reihe 1–9', 'West Unterrang', 1, 9)] },
    { id: 'pk5', label: 'Platzkategorie 5', children: [item('pk5-adult', 'Ost Steh Erwachsene', 'Ost Steh Erwachsene'), item('pk5-reduced', 'Ost Steh ermäßigt', 'Ost Steh ermäßigt')] },
    { id: 'vip', label: 'VIP', children: [
      item('vip-platin', 'VIP-Rang Platin'), item('vip-partner', 'Partner des Fußballs.-Lounge'), item('vip-ost', 'VIP-Club Ost'), item('vip-ost-dot', 'VIP-Club Ost.'), item('vip-gold', 'VIP-Rang Gold')
    ] }
  ];
  const allIds = catalog.flatMap(g => g.children.map(c => c.id));
  function defaults() { return { quantity: 1, adjacent: true, groups: catalog.map(g => ({ id: g.id, children: g.children.map(c => ({ id: c.id, enabled: true })) })) }; }
  function validate(config) {
    if (!config || !Number.isInteger(config.quantity) || config.quantity < 1 || config.quantity > 6 || typeof config.adjacent !== 'boolean' || !Array.isArray(config.groups) || config.groups.length !== catalog.length) throw new Error('Bitte 1 bis 6 Tickets und gültige Kategorien auswählen.');
    const groupIds = new Set(), children = new Set();
    for (const group of config.groups) {
      const template = catalog.find(g => g.id === group.id);
      if (!template || groupIds.has(group.id) || !Array.isArray(group.children) || group.children.length !== template.children.length) throw new Error('Ungültige Kategoriepräferenzen.');
      groupIds.add(group.id);
      for (const c of group.children) {
        if (!template.children.some(t => t.id === c.id) || children.has(c.id) || typeof c.enabled !== 'boolean') throw new Error('Ungültige Unterkategorie.');
        children.add(c.id);
      }
    }
    return config;
  }
  function match(seat) {
    const category = normal(seat.category).replace(/^pk\s*8\s*[-:]?\s*/, '');
    const vip = catalog.at(-1).children.find(c => normal(c.label) === category);
    if (vip) return vip.id; // A final dot denotes a distinct shop category.
    const source = normal([seat.category, seat.blockDescription].filter(Boolean).join(' '));
    const number = source.match(/(?:^|\b)(?:pk\s*|platzkategorie\s*)([1-5])(?:\b|\s)/)?.[1];
    if (!number) return null;
    const group = catalog.find(g => g.id === 'pk' + number);
    return group.children.find(c => {
      if (!source.includes(normal(c.region))) return false;
      if (c.min == null) return true;
      return /^\d+$/.test(String(seat.row)) && Number(seat.row) >= c.min && Number(seat.row) <= c.max;
    })?.id || null;
  }
  function rank(config) {
    validate(config);
    return new Map(config.groups.flatMap(g => g.children.filter(c => c.enabled).map(c => c.id)).map((id, index) => [id, index]));
  }
  function plan(snapshot, config, now = Date.now()) {
    const ranks = rank(config);
    if (!snapshot || snapshot.stale || now - snapshot.checkedAt > 120000 || (Number.isFinite(snapshot.validUntil) && snapshot.validUntil < now)) return null;
    const seats = snapshot.seats.map(s => ({ ...s, preference: match(s) })).filter(s => ranks.has(s.preference));
    const compare = (a, b) => ranks.get(a.preference) - ranks.get(b.preference) || a.id - b.id;
    seats.sort(compare);
    if (seats.length < config.quantity) return null;
    if (config.adjacent && config.quantity > 1) {
      const groups = new Map();
      for (const seat of seats) {
        if (typeof seat.group !== 'string' || !Number.isInteger(seat.order)) continue;
        if (!groups.has(seat.group)) groups.set(seat.group, []);
        groups.get(seat.group).push(seat);
      }
      const batches = [];
      for (const group of groups.values()) {
        group.sort((a, b) => a.order - b.order);
        for (let i = 0; i + config.quantity <= group.length; i++) {
          const batch = group.slice(i, i + config.quantity);
          if (batch.slice(1).every((s, j) => {
            const previous = batch[j], distance = Math.hypot(s.x - previous.x, s.y - previous.y);
            return s.order === previous.order + 1 && s.id === previous.id + 1 && Number.isFinite(s.spacing) && distance <= s.spacing * 1.6;
          })) batches.push(batch.sort(compare));
        }
      }
      batches.sort((a, b) => {
        for (let i = 0; i < a.length; i++) { const diff = ranks.get(a[i].preference) - ranks.get(b[i].preference); if (diff) return diff; }
        return a[0].id - b[0].id;
      });
      if (batches.length) return { seats: batches[0], adjacent: true };
    }
    return { seats: seats.slice(0, config.quantity), adjacent: config.quantity === 1 };
  }
  const api = { catalog, allIds, defaults, validate, match, rank, plan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.TicketPreferences = api;
})();
