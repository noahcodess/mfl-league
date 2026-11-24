// The award show's own sounds (Web Audio, so they can overlap): the signature chime, the slide transition, the finalist
// ping, the drum roll, the winner fanfare and theater applause. play() returns a stop function. The distant chatter
// under the show still comes from crowdAudio's quiet beds.
const BASE = `${import.meta.env.BASE_URL}audio/`;
const FILES = { chime: 'Show Chime.mp3', whoosh: 'Show Transition.mp3', ping: 'Show Ping.mp3', drum: 'Drum Roll.mp3', fanfare: 'Show Fanfare.mp3', applause: 'Show Applause.mp3' };

export function createShowAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC(), master = ctx.createGain(), bufs = {};
  master.connect(ctx.destination);
  Object.entries(FILES).forEach(([k, f]) => {
    fetch(BASE + encodeURI(f)).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((d) => { bufs[k] = d; }).catch(() => {});
  });
  return {
    // key: a sound. gain 0..1. delay: seconds from now. fadeAfter: seconds before it fades out (for long ones).
    play(key, { gain = 1, delay = 0, fadeAfter = null } = {}) {
      const b = bufs[key]; if (!b) return () => {};
      if (ctx.state === 'suspended') ctx.resume();
      const src = ctx.createBufferSource(), g = ctx.createGain(), at = ctx.currentTime + delay;
      src.buffer = b; g.gain.value = gain; src.connect(g); g.connect(master); src.start(at);
      if (fadeAfter != null) { g.gain.setValueAtTime(gain, at + fadeAfter); g.gain.linearRampToValueAtTime(0, at + fadeAfter + 1.5); src.stop(at + fadeAfter + 1.6); }
      return () => { try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); src.stop(ctx.currentTime + 0.4); } catch { /* already stopped */ } };
    },
    setVolume(v) { master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    close() { ctx.close().catch(() => {}); },
  };
}
