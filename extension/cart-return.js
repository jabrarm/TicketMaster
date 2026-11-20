(() => {
  if (globalThis.TicketAvailability.shop(location.href)?.type !== 'cart') return;
  function waitForReceipt(goal) {
    const pending = goal.pending;
    const hasExpectedNewKeys = receipt => receipt.valid && goal.confirmed.every(key => receipt.keys.includes(key)) &&
      receipt.keys.filter(key => !pending.baseline.includes(key)).length === pending.count;
    const initial = TicketCartReceipt.read(document);
    if (hasExpectedNewKeys(initial)) return Promise.resolve(initial);
    return new Promise(resolve => {
      const finish = receipt => {
        observer.disconnect();
        clearTimeout(timer);
        resolve(receipt);
      };
      const observer = new MutationObserver(() => {
        const receipt = TicketCartReceipt.read(document);
        if (hasExpectedNewKeys(receipt)) finish(receipt);
      });
      const timer = setTimeout(() => finish(TicketCartReceipt.read(document)), 2500);
      observer.observe(document.body, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['class', 'data-seat-identifier', 'data-seat-id'] });
    });
  }
  async function run() {
    const response = await chrome.runtime.sendMessage({ type: 'goalGet' });
    if (!response?.goal) return;
    let goal = response.goal;
    if (goal.status === 'submitting') {
      const confirmation = await chrome.runtime.sendMessage({ type: 'goalReceipt', goalId: goal.id, receipt: await waitForReceipt(goal) });
      if (confirmation?.error) throw new Error(confirmation.error);
      goal = confirmation.goal;
    }
    if (!goal) return;
    const box = document.createElement('aside'); box.id = 'ticket-goal-progress';
    box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:420px;padding:18px;border-radius:12px;background:#12261f;color:#eaf1ed;font:15px/1.5 system-ui;box-shadow:0 8px 40px #0005';
    const text = document.createElement('p'); text.textContent = goal.confirmed.length + ' von ' + goal.target + ' Tickets im Warenkorb bestätigt. ' + (goal.status === 'completed' ? 'Ziel erreicht. Checkout und Zahlung erfolgen durch dich.' : goal.status === 'watching' ? 'Die Suche nach den fehlenden Tickets wird fortgesetzt.' : goal.message || 'Bitte den Warenkorb prüfen.');
    box.append(text);
    if (['watching', 'preparing', 'submitting'].includes(goal.status)) {
      const stop = document.createElement('button'); stop.textContent = 'Weitere Suche stoppen';
      stop.onclick = async () => { await chrome.runtime.sendMessage({ type: 'goalStop', goalId: goal.id }); text.textContent = 'Weitere Suche gestoppt. Bereits hinzugefügte Tickets bleiben im Warenkorb.'; stop.remove(); }; box.append(stop);
    }
    document.body.append(box);
  }
  void run().catch(error => { const p = document.createElement('p'); p.textContent = 'Ticketsuche angehalten: ' + error.message; p.setAttribute('role', 'status'); document.body?.prepend(p); });
})();
