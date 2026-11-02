(() => {
  if (document.getElementById('tm-watcher-host')) return;
  const host = document.createElement('div');
  host.id = 'tm-watcher-host';
  host.style.cssText = 'position:fixed;right:18px;top:18px;z-index:2147483647';
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{all:initial}*{box-sizing:border-box}section{width:340px;padding:22px;background:#132821;color:#f0f6f2;border:1px solid #416151;border-radius:18px;box-shadow:0 16px 60px #0005;font:14px/1.5 system-ui,sans-serif}
      h2{font-size:19px;margin:0 0 5px}p{color:#c1d0c7;margin:6px 0 16px}button{font:inherit;cursor:pointer;border:1px solid #52715e;border-radius:9px;padding:10px 12px;background:#203c2e;color:#fff;width:100%;margin:4px 0;text-align:left}button:hover{background:#31543f}button:disabled{opacity:.45;cursor:default}#start{background:#c6ee9c;color:#17251a;font-weight:700}#stop{color:#ffcec7}#close{width:auto;float:right;padding:2px 8px;margin:0}label{display:block;margin:10px 0}input{accent-color:#c6ee9c}output{display:block;margin-top:12px;color:#ddedb8;overflow-wrap:anywhere}small{display:block;color:#a7bcae;margin-top:12px}
      .veil{position:fixed;inset:0;background:#10251c22;cursor:crosshair;z-index:2147483646}.selection{position:fixed;border:2px solid #67f1ac;background:#67f1ac22;pointer-events:none}.hint{position:fixed;left:16px;top:16px;background:#132821;color:white;padding:12px 18px;border-radius:10px;font:15px system-ui;pointer-events:none}
    </style>
    <section><button id="close" title="Schließen">×</button><h2>Bereichswächter</h2><p>Grau verändert sich → Doppelklick → Folgeklick.</p>
    <button id="area">1 · Grauen Bereich markieren</button><button id="next">2 · Einkaufswagen unten rechts wählen</button>
    <label><input id="automatic" type="checkbox"> Klickfolge automatisch ausführen</label>
    <button id="start">Überwachung starten</button><button id="stop" disabled>Stoppen</button>
    <output role="status" aria-live="polite">Wähle einen kleinen, ruhigen Bereich im Saalplan.</output>
    <small>Standard: Erkennung ohne Klicks. Sichtbaren Tab offen lassen. Scrollen oder Zoomen stoppt die Überwachung. Escape stoppt jederzeit.</small></section>`;
  const $ = (id) => shadow.getElementById(id);
  let area, next, running = false, generation = 0, selecting = false, cleanupSelection;
  let lastCapture = 0;
  const status = (text) => { shadow.querySelector('output').textContent = text; };
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function stop(message = 'Überwachung gestoppt.') {
    running = false; generation++;
    $('start').disabled = false; $('stop').disabled = true;
    $('area').disabled = false; $('next').disabled = false; $('automatic').disabled = false;
    status(message);
  }
  function choose(kind) {
    stop(); selecting = true; host.style.visibility = 'hidden';
    const veil = document.createElement('div'); veil.className = 'veil';
    const box = document.createElement('div'); box.className = 'selection';
    const hint = document.createElement('div'); hint.className = 'hint';
    hint.textContent = kind === 'area' ? 'Rechteck über den grauen Bereich ziehen · Escape: Abbrechen' : 'Einkaufswagen-Symbol unten rechts anklicken · Escape: Abbrechen';
    shadow.append(veil, box, hint);
    let origin;
    cleanupSelection = () => {
      veil.remove(); box.remove(); hint.remove(); selecting = false;
      host.style.visibility = ''; cleanupSelection = undefined;
    };
    // The shadow host is hidden, so explicitly reveal selection children.
    for (const el of [veil, box, hint]) el.style.visibility = 'visible';
    veil.addEventListener('pointerdown', (event) => {
      event.preventDefault(); event.stopPropagation();
      origin = { x: event.clientX, y: event.clientY }; veil.setPointerCapture(event.pointerId);
    });
    veil.addEventListener('pointermove', (event) => {
      if (!origin || kind !== 'area') return;
      Object.assign(box.style, { left: `${Math.min(origin.x, event.clientX)}px`, top: `${Math.min(origin.y, event.clientY)}px`, width: `${Math.abs(origin.x - event.clientX)}px`, height: `${Math.abs(origin.y - event.clientY)}px` });
    });
    veil.addEventListener('pointerup', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!origin) return;
      if (kind === 'area') {
        const rect = { x: Math.min(origin.x, event.clientX), y: Math.min(origin.y, event.clientY), width: Math.abs(origin.x - event.clientX), height: Math.abs(origin.y - event.clientY) };
        if (rect.width < 6 || rect.height < 6) { status('Bereich zu klein. Erneut markieren.'); cleanupSelection(); return; }
        area = rect; $('area').textContent = `1 · Bereich gewählt (${Math.round(rect.width)} × ${Math.round(rect.height)})`;
      } else {
        next = { x: event.clientX, y: event.clientY };
        $('next').textContent = '2 · Folgeklick gewählt';
      }
      cleanupSelection();
      if (kind === 'next') {
        const target = document.elementFromPoint(next.x, next.y);
        next.element = target?.closest('button, a, [role="button"]') || target;
      }
      status('Auswahl gespeichert. Starte die Überwachung, sobald die Seite ruhig ist.');
    });
  }
  async function capture(token) {
    await delay(Math.max(0, 550 - (Date.now() - lastCapture)));
    if (!running || generation !== token) return null;
    lastCapture = Date.now();
    const result = await chrome.runtime.sendMessage({ type: 'capture' });
    if (result.error) throw new Error(result.error);
    const bitmap = await createImageBitmap(await (await fetch(result.data)).blob());
    try {
      const scaleX = bitmap.width / innerWidth, scaleY = bitmap.height / innerHeight;
      const width = Math.round(area.width), height = Math.round(area.height);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(bitmap, area.x * scaleX, area.y * scaleY, area.width * scaleX, area.height * scaleY, 0, 0, width, height);
      return { data: context.getImageData(0, 0, width, height).data, width, height };
    } finally { bitmap.close(); }
  }
  function clickAt(point, twice) {
    const element = document.elementFromPoint(point.x, point.y);
    if (!element || element === host || host.contains(element)) throw new Error('Klickziel ist verdeckt oder fehlt.');
    const common = { bubbles: true, cancelable: true, composed: true, view: window, clientX: point.x, clientY: point.y, button: 0 };
    for (let count = 1; count <= (twice ? 2 : 1); count++) {
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        const EventClass = type.startsWith('pointer') ? PointerEvent : MouseEvent;
        element.dispatchEvent(new EventClass(type, { ...common, detail: count, buttons: type.endsWith('down') ? 1 : 0, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
      }
    }
    if (twice) element.dispatchEvent(new MouseEvent('dblclick', { ...common, detail: 2 }));
  }
  $('area').onclick = () => choose('area'); $('next').onclick = () => choose('next');
  $('stop').onclick = () => stop();
  $('start').onclick = async () => {
    if (!area) return status('Markiere zuerst einen grauen Bereich.');
    const automatic = $('automatic').checked;
    if (automatic && !next) return status('Wähle zuerst das Ziel für den Folgeklick.');
    const panel = host.getBoundingClientRect();
    if (area.x < panel.right && area.x + area.width > panel.left && area.y < panel.bottom && area.y + area.height > panel.top) return status('Der Bereich überschneidet sich mit dem Bedienfeld. Wähle einen anderen Ausschnitt.');
    if (automatic && next.x >= panel.left && next.x <= panel.right && next.y >= panel.top && next.y <= panel.bottom) return status('Das Folgeklickziel ist vom Bedienfeld verdeckt.');
    running = true; const token = ++generation;
    for (const id of ['start', 'area', 'next', 'automatic']) $(id).disabled = true;
    $('stop').disabled = false;
    try {
      status('Referenzbild wird aufgenommen …');
      const baseline = await capture(token);
      if (!baseline || generation !== token) return;
      status(automatic ? 'Aktiv · Einmalige Klickfolge scharf.' : 'Testmodus aktiv · Änderungen werden nur gemeldet.');
      let previous;
      while (running && generation === token) {
        const frame = await capture(token);
        if (!frame || !running || generation !== token) return;
        const change = TicketDetector.detectChange(baseline.data, frame.data, frame.width, frame.height);
        if (change && previous && Math.hypot(change.x - previous.x, change.y - previous.y) < 18) {
          const point = { x: area.x + change.x, y: area.y + change.y };
          if (!automatic) { stop(`Änderung bei ${Math.round(point.x)}, ${Math.round(point.y)} erkannt. Keine Klicks ausgeführt.`); return; }
          // Disarm first. Stop/Escape/layout events invalidate the pending second action.
          stop('Änderung erkannt · Doppelklick wird ausgeführt …');
          const actionToken = generation;
          clickAt(point, true);
          await delay(250);
          if (generation !== actionToken || document.hidden) return;
          const deadline = Date.now() + 3000;
          while (next.element?.isConnected && (next.element.disabled || next.element.getAttribute('aria-disabled') === 'true')) {
            if (Date.now() > deadline) throw new Error('Der Einkaufswagen bleibt deaktiviert.');
            await delay(50);
            if (generation !== actionToken || document.hidden) return;
          }
          const visibleTarget = document.elementFromPoint(next.x, next.y);
          if (!next.element?.isConnected || !visibleTarget || !next.element.contains(visibleTarget)) throw new Error('Das Einkaufswagen-Ziel hat sich geändert. Bitte neu auswählen.');
          clickAt(next, false);
          status('Doppelklick und Folgeklick gesendet. Ergebnis bitte auf der Seite prüfen.');
          return;
        }
        previous = change;
      }
    } catch (error) { if (generation === token || !running) stop(`Gestoppt: ${error.message}`); }
  };
  function geometryChanged(event) {
    if (selecting || event?.composedPath().includes(host)) return;
    // Coordinates are valid only for the viewport in which they were chosen.
    area = undefined; next = undefined;
    $('area').textContent = '1 · Grauen Bereich markieren'; $('next').textContent = '2 · Einkaufswagen unten rechts wählen';
    stop('Ansicht geändert. Bereich und Folgeklick bitte neu wählen.');
  }
  function visibilityChanged() { if (document.hidden) stop('Tab nicht sichtbar. Überwachung gestoppt.'); }
  function escape(event) { if (event.key === 'Escape') { cleanupSelection?.(); stop(); } }
  window.addEventListener('scroll', geometryChanged, true);
  window.addEventListener('resize', geometryChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  document.addEventListener('keydown', escape, true);
  $('close').onclick = () => {
    stop(); cleanupSelection?.(); host.remove();
    window.removeEventListener('scroll', geometryChanged, true);
    window.removeEventListener('resize', geometryChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
    document.removeEventListener('keydown', escape, true);
  };
})();
