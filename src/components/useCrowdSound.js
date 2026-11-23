// Runs the crowd sound for the commissioner's broadcast window: a few times a second it reads where the broadcast is
// (crowdMix decides the beds, crowdCues the pops) and drives the engine (crowdAudio). It also runs the whiteout song's
// part of the cutscene: Noah's track over the stadium shot, the huddle and the snap, then a slow crossfade into our crowd.
// The on/off switch and volume are remembered in this browser. read(): { play, S, c (the broadcast clock), brk, paused,
// done, wo (this play's whiteout cutscene ran) }. crowd: the game's crowd (data/gameCrowd), or null for no sound at all.
import { useEffect, useRef, useState } from 'react';
import { createCrowdAudio } from '../lib/crowdAudio.js';
import { bedLevels, masterLevel } from '../lib/crowdMix.js';
import { cuesFor } from '../lib/crowdCues.js';
import { crowdEnergy } from '../lib/stadiumPulse.js';
import { WO } from '../lib/whiteoutPlan.js';
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
    // The whiteout: Noah's track takes over the stadium from the cut and keeps going through the snap; a little past the
    // middle of that first play it crossfades into our crowd (the track fades out slowly as our loud crowd fades up).
    const fadeAt = S.T0 + 0.55 * Math.max(1, (S.tEnd ?? S.T0 + 3) - S.T0), hasSong = e.hasSong();
    const woSong = st.wo && (c.phase === 'wo' || (live && t < fadeAt)), roar = st.wo && live && t >= fadeAt && t < (S.tEnd ?? 0) + 1.5;
    if (woSong && hasSong && (c.phase !== 'wo' || c.hold > 0.1)) e.startSong(0); else e.stopSong(st.wo && live ? 1.1 : 0.15);
    const done = fired.current.get(play) || new Set(); fired.current.set(play, done);
    const beds = bedLevels({ play, t, T0: S.T0, tEnd: S.tEnd, e: e0, tdAt: c.tdAt, wo: { song: woSong && hasSong, roar: roar || (woSong && !hasSong) } });
    e.setBeds(beds, st.wo && live ? 1.25 : 0.4);   // the crossfade: our crowd comes up as slowly as the track goes
    if (import.meta.env.DEV) window.__crowd = { beds, phase: c.phase, t, song: woSong && hasSong, roar, i: play.n };   // dev only: tests read the mix
    e.setMaster(masterLevel({ phase: c.phase, paused: st.paused, brk: st.brk, done: st.done }));
    const call = c.phase === 'call' && c.hold >= CALL_PANEL + 0.15;   // the referee's announcement is up
    if ((!live && !call) || st.paused) return;
    if (!cues.current.has(play)) cues.current.set(play, cuesFor(play, S, seed));
    cues.current.get(play).forEach((q, n) => {
      if (q.at === 'call') { if (call && !done.has(n)) { done.add(n); e.pop(q.name, q.gain * (0.4 + 0.6 * e0)); } return; }
      const at = q.at === 'score' ? c.tdAt : q.at;
      if (!live || at == null || done.has(n) || t < at) return;
      done.add(n); if (t < at + 1.5) { e.pop(q.name, q.gain * (0.4 + 0.6 * e0)); if (import.meta.env.DEV) (window.__pops ||= []).push([play.n, q.name]); }   // jumped past it: skip it
    });
  }
  return {
    on: prefs.on, vol: prefs.vol,
    setOn: (v) => { setPrefs((p) => ({ ...p, on: v })); eng.current?.resume(); },
    setVol: (v) => setPrefs((p) => ({ ...p, vol: v })),
  };
}
