(() => {
  'use strict';
  const playing = new Set();
  async function playFile(url) {
    const audio = new Audio(url);
    const release = () => playing.delete(audio);
    playing.add(audio);
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
    try { await audio.play(); }
    catch (error) { release(); throw error; }
  }
  async function play(sound) {
    if (sound === 'horn') {
      try {
        const { hornAudio } = await chrome.storage.local.get('hornAudio');
        if (hornAudio) { await playFile(hornAudio); return; }
      } catch { /* An unreadable recording falls back to the bundled horn. */ }
    }
    await playFile(chrome.runtime.getURL('sounds/' + sound + '.wav'));
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.tab || message.target !== 'ticket-audio' || !['ping', 'horn'].includes(message.sound)) return;
    play(message.sound).then(() => respond({ playing: true }), error => respond({ error: error.message }));
    return true;
  });
})();
