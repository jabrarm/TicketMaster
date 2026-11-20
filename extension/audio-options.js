(() => {
  'use strict';
  const fileInput = document.querySelector('#horn');
  const reset = document.querySelector('#reset');
  const status = document.querySelector('#status');
  async function update(action) {
    fileInput.disabled = reset.disabled = true;
    try { status.textContent = await action(); }
    catch (error) { status.textContent = error.message; }
    finally { fileInput.disabled = reset.disabled = false; }
  }
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    void update(async () => {
      if (file.size > 1024 * 1024) throw new Error('Die Aufnahme darf höchstens 1 MB groß sein.');
      const context = new AudioContext();
      try { await context.decodeAudioData(await file.arrayBuffer()); }
      catch { throw new Error('Chrome konnte diese Audiodatei nicht lesen.'); }
      finally { await context.close(); }
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await chrome.storage.local.set({ hornAudio: data });
      return 'Aufnahme gespeichert.';
    });
  };
  reset.onclick = () => void update(async () => {
    await chrome.storage.local.remove('hornAudio');
    return 'Synthetisches Nebelhorn aktiviert.';
  });
})();
