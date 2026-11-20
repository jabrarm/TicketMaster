(() => {
  'use strict';
  let context;
  const playing = new Set();
  async function play(sound) {
    if (sound === 'horn') {
      const { hornAudio } = await chrome.storage.local.get('hornAudio');
      if (hornAudio) {
        const recording = new Audio(hornAudio);
        const release = () => playing.delete(recording);
        playing.add(recording);
        recording.addEventListener('ended', release, { once: true });
        recording.addEventListener('error', release, { once: true });
        try { await recording.play(); return; } catch { release(); }
      }
    }
    context ||= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    const start = context.currentTime;
    const tone = (frequency, volume, offset, length, attack, type = 'sine') => {
      const at = start + offset;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, at + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at);
      oscillator.stop(at + length);
    };
    if (sound === 'ping') tone(880, 0.16, 0, 0.16, 0.01);
    else for (const offset of [0, 0.87]) {
      tone(112, 0.21, offset, 0.78, 0.09, 'triangle');
      tone(167, 0.08, offset, 0.78, 0.12);
      tone(224, 0.06, offset, 0.76, 0.10);
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.tab || message.target !== 'ticket-audio' || !['ping', 'horn'].includes(message.sound)) return;
    play(message.sound).then(() => respond({}), error => respond({ error: error.message }));
    return true;
  });
})();
