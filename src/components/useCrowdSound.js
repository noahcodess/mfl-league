// Runs the crowd sound for the commissioner's broadcast window: a few times a second it reads where the broadcast is
// (crowdMix decides the beds, crowdCues the pops) and drives the engine (crowdAudio). It also runs the whiteout song's
// part of the cutscene: Noah's track over the stadium shot and the huddle, then our crowd fading in as they break.
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
    // The whiteout: Noah's track takes over the stadium from the cut; as they break the huddle at the end of it, our own
    // crowd comes up slowly underneath, then the snap hands it to the usual mix.
    const woSong = st.wo && (c.phase === 'wo' || (live && t < brk + 2.5)), roar = st.wo && live && t >= brk - 1 && t < S.T0 + 0.6, hasSong = e.hasSong();
    if (woSong && hasSong && (c.phase !== 'wo' || c.hold > 0.1)) e.startSong(0); else if (!woSong) e.stopSong(0.15);
    const done = fired.current.get(play) || new Set(); fired.current.set(play, done);
    const beds = bedLevels({ play, t, T0: S.T0, tEnd: S.tEnd, e: e0, tdAt: c.tdAt, wo: { song: woSong && hasSong, roar: roar || (woSong && !hasSong) } });
    e.setBeds(beds, roar ? 1.4 : 0.4);   // the roar fades in slowly
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
