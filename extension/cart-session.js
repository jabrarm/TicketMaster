(() => {
  'use strict';
  const active = new Set(['watching', 'preparing', 'submitting']);
  class Sessions {
    constructor(storage, now = Date.now) { this.storage = storage; this.now = now; this.locks = new Map(); }
    key(tab) { return 'ticketGoal:' + tab; }
    async lock(tab, action) {
      const previous = this.locks.get(tab) || Promise.resolve();
      const next = previous.catch(() => {}).then(action); this.locks.set(tab, next);
      try { return await next; } finally { if (this.locks.get(tab) === next) this.locks.delete(tab); }
    }
    async get(tab) {
      const goal = await this.storage.read(this.key(tab));
      if (goal && active.has(goal.status) && this.now() - goal.startedAt > 30 * 60 * 1000) {
        if (goal.status === 'preparing') goal.pending = null;
        goal.status = 'paused'; goal.message = 'Die Suche ist nach 30 Minuten angehalten. Bitte Reservierungsfrist und Warenkorb prüfen.'; await this.storage.write(this.key(tab), goal);
      }
      return goal || null;
    }
    async begin(tab, id, config, eventUrl) {
      return this.lock(tab, async () => {
        const old = await this.get(tab);
        if (old && (active.has(old.status) || old.pending)) throw new Error('In diesem Tab läuft bereits eine Suche oder eine unbestätigte Übergabe. Bitte diese zuerst stoppen und den Warenkorb prüfen.');
        if (old && old.eventUrl === eventUrl && ['paused', 'stopped'].includes(old.status)) {
          if (config.quantity < old.confirmed.length) throw new Error('Die neue Zielanzahl ist kleiner als die bereits bestätigte Ticketanzahl. Bitte den Warenkorb prüfen.');
          old.config = config; old.target = config.quantity; old.startedAt = this.now();
          old.status = old.confirmed.length === old.target ? 'completed' : 'watching'; old.message = 'Suche mit bisher bestätigten Tickets fortgesetzt.';
          await this.storage.write(this.key(tab), old); return old;
        }
        const goal = { id, config, eventUrl, target: config.quantity, confirmed: [], secured: [], status: 'watching', pending: null, startedAt: this.now(), message: '' };
        await this.storage.write(this.key(tab), goal); return goal;
      });
    }
    async attempt(tab, id, run, baseline) {
      return this.lock(tab, async () => {
        const goal = await this.require(tab, id);
        if (goal.status !== 'watching' || goal.pending) throw new Error('Die vorherige Warenkorbübergabe ist noch nicht bestätigt.');
        if (!baseline.valid || !goal.confirmed.every(key => baseline.keys.includes(key))) {
          goal.status = 'paused'; goal.message = 'Bereits bestätigte Tickets fehlen im Warenkorb. Bitte die Reservierungsfrist prüfen.';
          await this.storage.write(this.key(tab), goal); throw new Error(goal.message);
        }
        if (goal.confirmed.length >= goal.target) throw new Error('Die gewünschte Ticketanzahl ist bereits erreicht.');
        goal.status = 'preparing'; goal.pending = { run, baseline: baseline.keys, count: 0, seats: [] };
        await this.storage.write(this.key(tab), goal); return goal;
      });
    }
    async prepared(tab, id, run, result) {
      return this.lock(tab, async () => {
        const goal = await this.require(tab, id);
        if (goal.status !== 'preparing' || goal.pending?.run !== run) throw new Error('Die Suche wurde zwischenzeitlich gestoppt.');
        const remaining = goal.target - goal.confirmed.length;
        if (!Number.isInteger(result.count) || result.count < 1 || result.count > remaining || result.seats?.length !== result.count || new Set(result.seats.map(s => s.id)).size !== result.count || result.seats.some(s => goal.secured.some(old => old.id === s.id))) throw new Error('Die bestätigte Teilauswahl ist ungültig oder enthält bereits übernommene Plätze.');
        goal.pending.count = result.count; goal.pending.seats = result.seats; goal.status = 'submitting';
        await this.storage.write(this.key(tab), goal); return goal;
      });
    }
    async confirm(tab, id, receipt, onConfirmed) {
      return this.lock(tab, async () => {
        const goal = await this.require(tab, id);
        if (goal.status !== 'submitting' || !goal.pending) return goal;
        const added = receipt.valid ? receipt.keys.filter(k => !goal.pending.baseline.includes(k)) : [];
        const linkedIds = (receipt.entries || []).filter(e => added.includes(e.key) && e.seatId).map(e => String(e.seatId).replace(/^s/, ''));
        const expected = new Set(goal.pending.seats.map(s => String(s.id)));
        const invalid = !receipt.valid || new Set(receipt.keys).size !== receipt.keys.length || !goal.confirmed.every(k => receipt.keys.includes(k)) || added.length !== goal.pending.count || linkedIds.some(id => !expected.has(id));
        if (invalid) {
          goal.status = 'paused'; goal.message = 'Die neue Ticketanzahl im Warenkorb lässt sich nicht eindeutig bestätigen. Bitte den Warenkorb prüfen; keine automatische Wiederholung.';
        } else {
          goal.confirmed.push(...added); goal.secured.push(...goal.pending.seats); goal.pending = null;
          goal.status = goal.confirmed.length === goal.target ? 'completed' : 'watching';
          goal.message = goal.confirmed.length + ' von ' + goal.target + ' Tickets im Warenkorb bestätigt.';
        }
        await this.storage.write(this.key(tab), goal);
        if (!invalid) onConfirmed?.();
        return goal;
      });
    }
    async pause(tab, id, message) {
      return this.lock(tab, async () => {
        const goal = await this.require(tab, id);
        if (goal.status === 'stopped') return goal;
        if (goal.status === 'preparing') goal.pending = null;
        goal.status = 'paused'; goal.message = message;
        await this.storage.write(this.key(tab), goal);
        return goal;
      });
    }
    async stop(tab, id) {
      return this.lock(tab, async () => {
        const goal = await this.require(tab, id);
        if (goal.status === 'preparing') goal.pending = null;
        goal.status = 'stopped'; goal.message = 'Suche gestoppt. Bereits übernommene Tickets bleiben im Warenkorb.';
        await this.storage.write(this.key(tab), goal);
        return goal;
      });
    }
    async require(tab, id) { const goal = await this.get(tab); if (!goal || goal.id !== id) throw new Error('Die Ticketsuche ist nicht mehr aktiv.'); return goal; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Sessions };
  else globalThis.TicketGoalSessions = { Sessions };
})();
