/* The Eventim 6.20 DTO uses delta-encoded IDs. No colors are interpreted. */
(() => {
  'use strict';
  const validId = value => Number.isSafeInteger(value) && value > 0;
  function fail(message) { throw new Error(message); }
  function array(value) { if (!Array.isArray(value)) fail('Unbekanntes Datenformat.'); return value; }
  function deltaRows(rows, columns) {
    let id = 0, category = 0;
    return array(rows).map(row => {
      if (!Array.isArray(row) || row.length < columns || !Number.isSafeInteger(row[0])) fail('Ungültige Sitzdaten.');
      id += row[0];
      if (!validId(id)) fail('Ungültige Sitz-ID.');
      if (columns === 3) {
        if (!Number.isSafeInteger(row[2])) fail('Ungültige Preiskategorie.');
        category += row[2];
      }
      return { id, value: row[1], category };
    });
  }
  function shop(url) {
    try {
      const u = new URL(url);
      if (u.origin !== 'https://www.ticket-onlineshop.com') return null;
      const basePath = ['/ols/werderbremen-hospitality/de/tageskarte/channel/shop/', '/ols/werderbremen/de/einzelkarten/channel/shop/'].find(base => u.pathname.startsWith(base));
      if (!basePath) return null;
      const tail = u.pathname.slice(basePath.length), id = tail.match(/^areaplan\/venue\/event\/(\d+)\/?$/)?.[1] || null;
      return { basePath, baseUrl: u.origin + basePath, type: id ? 'event' : /^shoppingcart(?:\/index)?\/?$/.test(tail) ? 'cart' : 'other',
        eventId: id, eventUrl: id ? u.origin + basePath + 'areaplan/venue/event/' + id : null,
        cartUrl: u.origin + basePath + 'shoppingcart', kind: basePath.includes('werderbremen-hospitality') ? 'hospitality' : 'regular' };
    } catch { return null; }
  }
  const eventId = url => shop(url)?.eventId || null;
  function endpoint(url, pageUrl) {
    try {
      const u = new URL(url, pageUrl), event = eventId(pageUrl);
      const match = u.pathname.match(/^\/seatmap\/api\/public\/(seatmap|mapping|availability)\/(tixx-\d+-\d+)\/?$/);
      return u.protocol === 'https:' && u.hostname === 'public-api.eventim.com' && match && event && match[2].endsWith('-' + event)
        ? { kind: match[1], inventory: match[2] } : null;
    } catch { return null; }
  }
  function geometry(data) {
    const seats = new Map();
    const labels = new Map(array(data.labels).filter(x => x.type === 'ROW').map(x => [x.id, String(x.text)]));
    for (const area of array(data.areas)) for (const block of array(area.blocks)) {
      for (const row of array(block.rows || [])) for (const [groupIndex, group] of array(row.seats).entries()) {
        let id = 0, x = 0, y = 0;
        const members = [], distances = [];
        for (const [order, item] of array(group).entries()) {
          if (!Array.isArray(item) || !Number.isSafeInteger(item[0])) fail('Unbekannte Saalplan-Geometrie.');
          id += item[0];
          x += item[1]; y += item[2];
          if (!validId(id) || seats.has(id)) fail('Ungültige oder doppelte Sitz-ID.');
          const seat = { id, blockId: block.id, block: String(block.name || block.id), blockDescription: String(block.description || ''), row: labels.get(row.id) || '–', group: [area.id, block.id, row.id, groupIndex].join(':'), order, x, y };
          if (members.length) distances.push(Math.hypot(x - members.at(-1).x, y - members.at(-1).y));
          members.push(seat); seats.set(id, seat);
        }
        distances.sort((a, b) => a - b);
        const spacing = distances.length ? distances[Math.floor((distances.length - 1) / 2)] : null;
        for (const seat of members) seat.spacing = spacing;
      }
    }
    return seats;
  }
  class Inventory {
    constructor() { this.parts = {}; this.identity = null; this.last = null; this.availabilityReceivedAt = null; }
    accept(kind, data, identity, now = Date.now()) {
      if (!['seatmap', 'mapping', 'availability'].includes(kind)) fail('Unbekannte Datenquelle.');
      if (!data || typeof data !== 'object' || String(data.seatmapId) !== identity.split('-').at(-1)) fail('Saalplan-Zuordnung fehlt.');
      if (data.seatmapVersion == null) fail('Saalplan-Version fehlt.');
      if (this.identity !== identity) {
        this.parts = {}; this.last = null; this.availabilityReceivedAt = null; this.identity = identity;
      }
      if (kind === 'availability') {
        if (!Number.isFinite(data.timestamp)) fail('Zeitstempel der Verfügbarkeit fehlt.');
        const previous = this.parts.availability;
        if (previous && String(previous.seatmapVersion) === String(data.seatmapVersion) && data.timestamp < previous.timestamp) return null;
      }
      // Construct a candidate before committing, so a failed response cannot replace a valid baseline.
      const parts = { ...this.parts, [kind]: data };
      const checkedAt = kind === 'availability' ? now : this.availabilityReceivedAt;
      const complete = parts.seatmap && parts.mapping && parts.availability;
      const candidate = complete ? this.build(parts, checkedAt, now) : null;
      this.parts = parts; this.availabilityReceivedAt = checkedAt;
      if (candidate) this.last = candidate;
      return candidate;
    }
    build(parts, checkedAt, now) {
      const { seatmap, mapping, availability } = parts;
      const versions = [seatmap, mapping, availability].map(x => String(x.seatmapVersion));
      if (new Set(versions).size !== 1) return null; // Wait for the matching map/mapping response.
      if (this.geometryCache?.source !== seatmap) this.geometryCache = { source: seatmap, seats: geometry(seatmap) };
      if (this.mappingCache?.source !== mapping) {
        const categories = new Map(array(mapping.priceCategories).map(x => [x.id, String(x.name || x.id)]));
        const mappings = new Map(deltaRows(mapping.seats, 3).map(x => [x.id, x]));
        this.mappingCache = { source: mapping, categories, mappings };
      }
      const { seats } = this.geometryCache;
      const { categories, mappings } = this.mappingCache;
      const result = [], seen = new Set();
      for (const item of deltaRows(availability.seats, 2)) {
        if (seen.has(item.id) || ![0, 1].includes(item.value)) fail('Unbekannter Sitzstatus.');
        seen.add(item.id);
        if (item.value !== 1) continue;
        const seat = seats.get(item.id), entry = mappings.get(item.id);
        if (!seat || !entry) fail('Sitzdaten sind unvollständig.');
        if (![0, 1].includes(entry.value)) fail('Unbekannter Mapping-Sperrstatus.');
        if (entry.value !== 0) continue; // BLOCKED is 1; only NONE (0) is selectable.
        if (!categories.has(entry.category)) fail('Preiskategorie fehlt.');
        result.push({ ...seat, category: categories.get(entry.category), categoryId: entry.category });
      }
      const stale = availability.expired === true || (Number.isFinite(availability.expiryTimestamp) && availability.expiryTimestamp < now);
      return { inventory: this.identity, version: versions[0], timestamp: availability.timestamp, checkedAt, stale,
        validUntil: Number.isFinite(availability.expiryTimestamp) ? availability.expiryTimestamp : null,
        seats: result };
    }
  }
  class Tracker {
    constructor() { this.reset(); }
    reset() { this.previous = null; this.scope = null; this.timestamp = -Infinity; }
    update(snapshot) {
      if (!snapshot || !Array.isArray(snapshot.seats) || !Number.isFinite(snapshot.timestamp)) fail('Unvollständiger Datenstand.');
      if (snapshot.stale || (Number.isFinite(snapshot.validUntil) && snapshot.validUntil < Date.now())) return null;
      const scope = snapshot.inventory + ':' + snapshot.version;
      if (this.scope === scope && snapshot.timestamp < this.timestamp) return null;
      const current = new Set(snapshot.seats.map(x => x.id));
      const baseline = !this.previous || this.scope !== scope;
      const added = baseline ? [] : snapshot.seats.filter(x => !this.previous.has(x.id));
      const removed = baseline ? [] : [...this.previous].filter(id => !current.has(id));
      this.previous = current; this.scope = scope; this.timestamp = snapshot.timestamp;
      return { baseline, added, removed };
    }
  }
  const api = { shop, eventId, endpoint, Inventory, Tracker };
  if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.TicketAvailability = api;
})();
