(() => {
  // A coarse spatial grid finds the actual changed position instead of clicking
  // the middle of a possibly large watched rectangle.
  function detectChange(before, after, width, height, threshold = 48, minimum = 12) {
    const bins = new Map();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = before[i], g = before[i + 1], b = before[i + 2];
        // Only initially gray objects can trigger. White background, text and
        // already colored seats in the reference image are excluded.
        if (Math.max(r, g, b) - Math.min(r, g, b) > 14 || r < 100 || r > 245) continue;
        const delta = Math.max(Math.abs(r - after[i]), Math.abs(g - after[i + 1]), Math.abs(b - after[i + 2]));
        if (delta < threshold) continue;
        const key = `${Math.floor(x / 12)},${Math.floor(y / 12)}`;
        const bin = bins.get(key) || { count: 0, x: 0, y: 0 };
        bin.count++; bin.x += x; bin.y += y;
        bins.set(key, bin);
      }
    }
    const best = [...bins.values()].sort((a, b) => b.count - a.count)[0];
    return best && best.count >= minimum
      ? { x: best.x / best.count, y: best.y / best.count, count: best.count } : null;
  }
  function findAvailable(data, width, height, hex, seat = false) {
    if (hex && !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Ungültige Verfügbarkeitsfarbe.');
    const color = hex ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) : null;
    const mask = new Uint8Array(width * height);
    for (let p = 0; p < mask.length; p++) {
      const i = p * 4;
      const rgb = [data[i], data[i + 1], data[i + 2]];
      mask[p] = color ? (Math.max(...color.map((v, c) => Math.abs(v - rgb[c]))) <= 35 ? 1 : 0)
        : (Math.max(...rgb) - Math.min(...rgb) >= 25 ? 1 : 0);
    }
    const candidates = [];
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue;
      const queue = [p]; mask[p] = 0;
      let sx = 0, sy = 0, minX = width, maxX = 0, minY = height, maxY = 0;
      for (let q = 0; q < queue.length; q++) {
        const n = queue[q], x = n % width, y = Math.floor(n / width);
        sx += x; sy += y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (const adjacent of [x > 0 ? n - 1 : -1, x + 1 < width ? n + 1 : -1, y > 0 ? n - width : -1, y + 1 < height ? n + width : -1]) {
          if (adjacent >= 0 && mask[adjacent]) { mask[adjacent] = 0; queue.push(adjacent); }
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      const density = queue.length / (w * h);
      if (queue.length < 12 || (seat && (w > 48 || h > 48 || w / h > 1.5 || h / w > 1.5 || density < 0.5 || density > 0.94))) continue;
      // Choose a matching pixel nearest the centroid (also safe for hollow shapes).
      const cx = sx / queue.length, cy = sy / queue.length;
      const nearest = queue.reduce((a, b) => Math.hypot(a % width - cx, Math.floor(a / width) - cy) <= Math.hypot(b % width - cx, Math.floor(b / width) - cy) ? a : b);
      candidates.push({ x: nearest % width, y: Math.floor(nearest / width), count: queue.length });
    }
    return candidates.sort((a, b) => a.y - b.y || a.x - b.x)[0] || null;
  }
  function sceneChanged(before, after) {
    let changed = 0;
    for (let i = 0; i < before.length; i += 4) {
      if (Math.max(...[0, 1, 2].map(c => Math.abs(before[i + c] - after[i + c]))) > 40) changed++;
    }
    return changed >= Math.max(24, before.length / 4 * 0.02);
  }
  globalThis.TicketDetector = { detectChange, findAvailable, sceneChanged };
  if (typeof module !== 'undefined') module.exports = globalThis.TicketDetector;
})();
