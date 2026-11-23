// The crowd's sound engine (Web Audio): the four crowd beds loop together the whole game and only their volumes move, so
// every change is a smooth crossfade; the pops play on top (a little louder or softer and higher or lower each time, so
// the same clip never sounds twice the same) and dip the beds for a moment; the whiteout track has its own fader. Knows
// nothing about football: crowdMix and crowdCues decide what plays.
const BEDS = ['Crowd Bed 1 Hush', 'Crowd Bed 2 Murmur', 'Crowd Bed 3 Loud', 'Crowd Bed 4 Third Down'];
const BED_GAIN = [0.55, 0.62, 0.9, 1];   // the files are all leveled the same; this is the mix
const POPS = { eruption: 'Pop Eruption', cheer: 'Pop Big Cheer', groan: 'Pop Groan', boo: 'Pop Boo' };
const THIRDS = [1, 2, 3, 4].map((n) => [`third${n}`, `Third Down ${n}`]);   // the announcer clips: optional, skipped if missing
const SONG = 'Whiteout Creepers';   // Noah's own whiteout track
const url = (name) => `${import.meta.env.BASE_URL}audio/${encodeURIComponent(name)}.mp3`;

export function createCrowdAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx(), vol = ctx.createGain(), master = ctx.createGain(), bedBus = ctx.createGain(), popBus = ctx.createGain(), songGain = ctx.createGain();
  vol.connect(ctx.destination); master.connect(vol); bedBus.connect(master); popBus.connect(master); songGain.connect(master);
  master.gain.value = 0; songGain.gain.value = 0; popBus.gain.value = 0.9;
  const buf = {}, beds = BEDS.map(() => { const g = ctx.createGain(); g.gain.value = 0; g.connect(bedBus); return g; });
  let song = null, closed = false;
  const load = async (key, name) => {
    try { const r = await fetch(url(name)); if (!r.ok || /html/.test(r.headers.get('content-type') || '')) return; buf[key] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch { /* a missing clip just doesn't play */ }
  };
  const ready = Promise.all([...BEDS.map((n, i) => load(`bed${i}`, n)), ...Object.entries(POPS).map(([k, n]) => load(k, n)), ...THIRDS.map(([k, n]) => load(k, n)), load('whiteout', SONG)]).then(() => {
    if (closed) return;
    BEDS.forEach((_, i) => {   // all four start together and loop forever; a hair trimmed off each end hides the mp3 gap
      const b = buf[`bed${i}`]; if (!b) return;
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = 0.04; s.loopEnd = b.duration - 0.04;
      s.connect(beds[i]); s.start(0, 0.04 + (i * 3.7) % 3);
    });
  });
  const ramp = (param, v, tau) => { const now = ctx.currentTime; param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); param.setTargetAtTime(v, now, tau); };
  return {
    ready,
    resume: () => (ctx.state === 'suspended' ? ctx.resume().catch(() => {}) : Promise.resolve()),
    setVolume: (v) => ramp(vol.gain, Math.max(0, Math.min(1, v)), 0.05),
    setMaster: (v, tau = 0.35) => ramp(master.gain, v, tau),
    // levels: [hush, murmur, loud, third] 0-1. Equal-power: a fade in sounds as smooth as a fade out.
    setBeds: (levels, tau = 0.4) => levels.forEach((v, i) => ramp(beds[i].gain, Math.sin((Math.max(0, Math.min(1, v)) * Math.PI) / 2) * BED_GAIN[i], tau)),
    has: (key) => !!buf[key],
    pop(key, gain = 1) {
      const b = buf[key]; if (!b) return;
      const s = ctx.createBufferSource(), g = ctx.createGain(), now = ctx.currentTime;
      s.buffer = b; s.playbackRate.value = 0.96 + Math.random() * 0.08;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain * (0.85 + Math.random() * 0.2), now + 0.06);
      s.connect(g); g.connect(popBus); s.start(now);
      if (!key.startsWith('third')) { bedBus.gain.cancelScheduledValues(now); bedBus.gain.setTargetAtTime(0.72, now, 0.08); bedBus.gain.setTargetAtTime(1, now + 1.2, 0.6); }   // the beds give it room
    },
    hasSong: () => !!buf.whiteout,
    startSong(from = 0) {
      const b = buf.whiteout; if (!b || song) return;
      song = ctx.createBufferSource(); song.buffer = b; song.connect(songGain); song.start(0, Math.min(from, b.duration - 1));
      ramp(songGain.gain, 1, 0.12);
    },
    stopSong(fade = 0.25) {
      if (!song) return;
      const s = song, end = ctx.currentTime + fade * 4; song = null;
      ramp(songGain.gain, 0, fade); try { s.stop(end); } catch { /* already stopped */ }
    },
    close() { closed = true; try { song?.stop(); } catch { /* fine */ } ctx.close().catch(() => {}); },
  };
}
