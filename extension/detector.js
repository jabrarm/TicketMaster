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
  globalThis.TicketDetector = { detectChange };
  if (typeof module !== 'undefined') module.exports = { detectChange };
})();
