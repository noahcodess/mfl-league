// Runs the crowd sound for the commissioner's broadcast window: a few times a second it reads where the broadcast is
// (crowdMix decides the beds, crowdCues the pops and whistles) and drives the engine (crowdAudio). It also runs the sound
// of the cutscenes (cutPlan): the whiteout and Bloodbath tracks, the timeout whistle for the two-minute warning.
// The on/off switch and volume are remembered in this browser. read(): { play, S, c (the broadcast clock), brk, paused,
// done, cut ('wo' | 'bb' | 'tmw' when this play's cutscene ran), tout (a timeout bar is up) }. crowd: the game's crowd
// (data/gameCrowd), or null for no sound at all.
import { useEffect, useRef, useState } from 'react';
import { createCrowdAudio } from '../lib/crowdAudio.js';
import { bedLevels, masterLevel } from '../lib/crowdMix.js';
import { cuesFor } from '../lib/crowdCues.js';
import { crowdEnergy } from '../lib/stadiumPulse.js';
import { CALL_PANEL } from '../lib/refCallShow.js';

const PREFS = 'mfl-crowd-sound';
const readPrefs = () => { try { return { on: true, vol: 0.7, ...JSON.parse(localStorage.getItem(PREFS) || '{}') }; } catch { return { on: true, vol: 0.7 }; } };

export default function useCrowdSound(crowd, seed, read) {
  const [prefs, setPrefs] = useState(readPrefs);
  const eng = useRef(null), get = useRef(read), fired = useRef(new WeakMap()), cues = useRef(new WeakMap());
  get.current = read;
  const on = !!crowd && prefs.on, e0 = crowd ? crowdEnergy(crowd) : 0.6;
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private mode */ } }, [prefs]);
  useEffect(() => {
    if (!on) return undefined;
    const e = createCrowdAudio(); if (!e) return undefined;
    eng.current = e; e.setVolume(prefs.vol); e.resume();
    const wake = () => e.resume(); window.addEventListener('pointerdown', wake);   // browsers only allow sound after a click
    const id = setInterval(() => tick(e), 100);
    return () => { clearInterval(id); window.removeEventListener('pointerdown', wake); e.close(); eng.current = null; };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { eng.current?.setVolume(prefs.vol); }, [prefs.vol]);

  function tick(e) {
    const st = get.current(), { play, S, c } = st || {};
    if (!play || !S || !c) return;
    const t = c.t, brk = S.breakAt ?? 0.4, live = c.phase === 'live';
    const done = fired.current.get(play) || new Set(); fired.current.set(play, done);
    const once = (key, fn) => { if (!done.has(key)) { done.add(key); fn(); } };
    const cut = st.cut, inCut = c.phase === 'cut', sz = 0.45 + 0.55 * e0;
    // The whiteout: Noah's track takes over the stadium from the cut and keeps going through the snap; a little past the
    // middle of that first play it crossfades into our crowd (the track fades out slowly as our loud crowd fades up).
    const fadeAt = S.T0 + 0.55 * Math.max(1, (S.tEnd ?? S.T0 + 3) - S.T0), wo = cut === 'wo', hasWo = e.hasSong('whiteout');
    const woSong = wo && (inCut || (live && t < fadeAt)), roar = wo && live && t >= fadeAt && t < (S.tEnd ?? 0) + 1.5;
    // A Bloodbath opener: the track starts with the cut, but a few seconds in the crowd goes deafening over it and stays
    // that way through the snap; the track sits underneath and runs out as they break the huddle.
    const bb = cut === 'bb', deaf = bb && ((inCut && c.hold >= 3) || (live && t < S.T0 + 0.6));
    if (woSong && hasWo && (!inCut || c.hold > 0.1)) e.startSong('whiteout', 1);
    else if (bb && inCut && c.hold > 0.1) e.startSong('bloodbath', 0.42);
    else if (!(bb && live && t < S.T0 + 1)) e.stopSong(wo && live ? 1.1 : 0.15);
    if (deaf) once('bbRoar', () => e.pop('eruption', 1));
    if (cut === 'tmw' && inCut && c.hold > 0.15) once('tmw', () => e.pop('whTimeout', 0.9));   // the official's whistle for the two-minute warning
    if (st.tout) once('tout', () => e.pop('whTimeout', 0.9));   // a timeout
    const beds = deaf ? [0, 0.75 * sz, sz, 0.95 * sz] : bedLevels({ play, t, T0: S.T0, tEnd: S.tEnd, e: e0, tdAt: c.tdAt, wo: { song: woSong && hasWo, roar: roar || (woSong && !hasWo) } });
    e.setBeds(beds, wo && live ? 1.25 : deaf ? 0.9 : 0.4);   // the whiteout crossfade comes up as slowly as the track goes; the Bloodbath roar swells in
    if (import.meta.env.DEV) window.__crowd = { beds, phase: c.phase, t, song: woSong && hasWo, roar: roar || deaf, cut, i: play.n };   // dev only: tests read the mix
    e.setMaster(masterLevel({ phase: c.phase, cut, paused: st.paused, brk: st.brk, done: st.done }));
    const call = c.phase === 'call' && c.hold >= CALL_PANEL + 0.15;   // the referee's announcement is up
    if ((!live && !call) || st.paused) return;
    if (!cues.current.has(play)) cues.current.set(play, cuesFor(play, S, seed, st.next));
    cues.current.get(play).forEach((q, n) => {
      if (q.at === 'call') { if (call && !done.has(n)) { done.add(n); e.pop(q.name, q.gain * (0.4 + 0.6 * e0)); } return; }
      const at = q.at === 'score' ? c.tdAt : q.at;
      if (!live || at == null || done.has(n) || t < at) return;
      done.add(n); if (t < at + 1.5) { e.pop(q.name, /^wh/.test(q.name) ? q.gain : q.gain * (0.4 + 0.6 * e0), q.delay || 0); if (import.meta.env.DEV) (window.__pops ||= []).push([play.n, q.name]); }   // jumped past it: skip it
    });
  }
  return {
    on: prefs.on, vol: prefs.vol,
    setOn: (v) => { setPrefs((p) => ({ ...p, on: v })); eng.current?.resume(); },
    setVol: (v) => setPrefs((p) => ({ ...p, vol: v })),
  };
}
