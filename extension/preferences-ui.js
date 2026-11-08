(() => {
  if (globalThis.TicketPreferencePanel) return;
  const { catalog, defaults, validate, match } = globalThis.TicketPreferences;
  const create = (container, changed) => {
    let config = defaults(), locked = false, touched = false, snapshot = null;
    const opened = new Set(['vip']);
    const node = (tag, value, parent) => { const el = document.createElement(tag); if (value != null) el.textContent = value; parent?.append(el); return el; };
    const copy = () => JSON.parse(JSON.stringify(config));
    const update = () => {
      touched = true;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ ticketPreferencesV1: copy() }).catch(() => {});
      changed(copy()); render();
    };
    const move = (items, index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]]; update();
    };
    const arrows = (parent, label, items, index) => {
      for (const [direction, symbol, word] of [[-1, '↑', 'oben'], [1, '↓', 'unten']]) {
        const b = node('button', symbol, parent); b.type = 'button'; b.className = 'order'; b.setAttribute('aria-label', label + ' nach ' + word);
        b.disabled = locked || index + direction < 0 || index + direction >= items.length;
        b.onclick = event => { event.preventDefault(); event.stopPropagation(); move(items, index, direction); };
      }
    };
    function render() {
      container.replaceChildren();
      const field = node('fieldset', null, container); field.disabled = locked;
      node('legend', 'Ticketwunsch und Präferenzen', field);
      const amountLabel = node('label', 'Anzahl Tickets ', field);
      const amount = node('input', null, amountLabel); amount.type = 'number'; amount.min = '1'; amount.max = '6'; amount.step = '1'; amount.value = config.quantity; amount.setAttribute('aria-label', 'Anzahl Tickets');
      amount.onchange = () => { const value = Number(amount.value); if (!Number.isInteger(value) || value < 1 || value > 6) { amount.value = config.quantity; return; } config.quantity = value; update(); };
      const intervalLabel = node('label', 'Aktualisierung alle (Sekunden) ', field);
      const interval = node('input', null, intervalLabel); interval.type = 'number'; interval.min = '2'; interval.max = '120'; interval.step = '1'; interval.value = config.refreshSeconds ?? 20; interval.setAttribute('aria-label', 'Abfrageintervall in Sekunden');
      interval.onchange = () => { const value = Number(interval.value); if (!Number.isInteger(value) || value < 2 || value > 120) { interval.value = config.refreshSeconds ?? 20; return; } config.refreshSeconds = value; update(); };
      const frequencyHelp = node('p', '2–120 Sekunden, Standard 20. Langsame Anfragen und Shop-Pausen verlängern den Abstand. Häufigere Abfragen garantieren keine frischeren Daten.', field); frequencyHelp.className = 'muted';
      const adjacencyLabel = node('label', null, field); adjacencyLabel.className = 'checkline';
      const adjacency = node('input', null, adjacencyLabel); adjacency.type = 'checkbox'; adjacency.checked = config.adjacent;
      node('span', 'Nebeneinander bevorzugen; sonst nach Kategoriepräferenz', adjacencyLabel);
      adjacency.onchange = () => { config.adjacent = adjacency.checked; update(); };
      const help = node('p', 'Oben steht deine höchste Präferenz. Mit ↑ / ↓ Kategorien und Unterkategorien sortieren. Ein Häkchen am Gruppennamen wählt alle Unterkategorien.', field); help.className = 'muted';
      for (const [index, group] of config.groups.entries()) {
        const template = catalog.find(g => g.id === group.id);
        const detail = node('details', null, field); detail.open = opened.has(group.id); detail.className = 'prefgroup';
        detail.ontoggle = () => { if (detail.open) opened.add(group.id); else opened.delete(group.id); };
        const summary = node('summary', null, detail);
        const label = node('label', null, summary); label.className = 'checkline';
        label.onclick = event => event.stopPropagation();
        const checkbox = node('input', null, label); checkbox.type = 'checkbox'; checkbox.setAttribute('aria-label', template.label + ' auswählen');
        checkbox.checked = group.children.every(c => c.enabled); checkbox.indeterminate = !checkbox.checked && group.children.some(c => c.enabled);
        checkbox.onchange = () => { for (const child of group.children) child.enabled = checkbox.checked; update(); };
        node('span', (index + 1) + '. ' + template.label, label);
        arrows(summary, template.label, config.groups, index);
        const count = node('small', '', detail); count.dataset.groupCount = group.id; count.className = 'muted';
        for (const [childIndex, child] of group.children.entries()) {
          const option = template.children.find(c => c.id === child.id), line = node('div', null, detail); line.className = 'prefchild';
          const childLabel = node('label', null, line); childLabel.className = 'checkline';
          const check = node('input', null, childLabel); check.type = 'checkbox'; check.checked = child.enabled; check.setAttribute('aria-label', option.label + ' auswählen');
          node('span', option.label, childLabel);
          check.onchange = () => { child.enabled = check.checked; update(); };
          arrows(line, option.label, group.children, childIndex);
        }
      }
      const info = node('p', '', field); info.className = 'muted'; info.dataset.unmatched = '';
      refreshCounts();
    }
    function refreshCounts() {
      if (!snapshot) return;
      const counts = new Map(); let unknown = 0, parentOnly = 0;
      for (const seat of snapshot.seats) { const id = match(seat); if (id) { counts.set(id, (counts.get(id) || 0) + 1); if (id.endsWith(':*')) parentOnly++; } else unknown++; }
      for (const group of config.groups) {
        const count = group.children.filter(c => c.enabled).reduce((n, c) => n + (counts.get(c.id) || 0), 0) + (group.children.every(c => c.enabled) ? counts.get(group.id + ':*') || 0 : 0);
        const el = container.querySelector('[data-group-count="' + group.id + '"]');
        const expired = snapshot.stale || (Number.isFinite(snapshot.validUntil) && snapshot.validUntil < Date.now());
        if (el) el.textContent = count + (expired ? ' Sitzangebote aus der Shop-Liste; Bestätigung bei Platzwahl erforderlich' : ' aktuell gemeldete Sitze in gewählten Unterkategorien');
      }
      const context = globalThis.TicketAvailability.shop(location.href);
      container.querySelector('[data-unmatched]').textContent = (unknown ? unknown + ' Sitze lassen sich keiner Unterkategorie eindeutig zuordnen und werden nicht automatisch gewählt. ' : '') + (parentOnly ? parentOnly + ' Angebote sind nur ihrer Platzkategorie zugeordnet: automatisch auswählbar nur bei vollständig angehakter Oberkategorie, ohne einzelne Abwahlen. ' : '') + (context?.kind === 'regular' ? 'Regulärer Werder-Einzelkartenshop. ' : 'Die Hospitality-Seite liefert VIP-Angebote. ') + 'Kategorien ohne passende Shopdaten bleiben für die Automatik unberücksichtigt.';
    }
    render();
    if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.get('ticketPreferencesV1').then(data => {
      if (touched || !data.ticketPreferencesV1) return;
      try { validate(data.ticketPreferencesV1); config = data.ticketPreferencesV1; changed(copy()); render(); } catch {}
    }).catch(() => {});
    return { get: copy, set(value) { validate(value); config = JSON.parse(JSON.stringify(value)); touched = true; render(); changed(copy()); }, lock(value) { locked = value; render(); }, snapshot(value) { snapshot = value; refreshCounts(); } };
  };
  globalThis.TicketPreferencePanel = { create };
})();
