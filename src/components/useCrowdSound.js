// Runs the crowd sound for the commissioner's broadcast window: a few times a second it reads where the broadcast is
// (crowdMix decides the beds, crowdCues the pops) and drives the engine (crowdAudio). It also runs the whiteout song's
// part of the cutscene: on under the stadium shot and the huddle, off the moment they break, and the place erupts.
// The on/off switch and volume are remembered in this browser. read(): { play, S, c (the broadcast clock), brk, paused,
// done, wo (this play's whiteout cutscene ran) }. crowd: the game's crowd (data/gameCrowd), or null for no sound at all.
import { useEffect, useRef, useState } from 'react';
import { createCrowdAudio } from '../lib/crowdAudio.js';
import { bedLevels, masterLevel } from '../lib/crowdMix.js';
import { cuesFor } from '../lib/crowdCues.js';
import { crowdEnergy } from '../lib/stadiumPulse.js';
import { WO } from '../lib/whiteoutPlan.js';
import { loadWhiteoutSong, saveWhiteoutSong, clearWhiteoutSong } from '../data/whiteoutSong.js';

const PREFS = 'mfl-crowd-sound';
const readPrefs = () => { try { return { on: true, vol: 0.7, ...JSON.parse(localStorage.getItem(PREFS) || '{}') }; } catch { return { on: true, vol: 0.7 }; } };

export default function useCrowdSound(crowd, seed, read) {
  const [prefs, setPrefs] = useState(readPrefs), [song, setSong] = useState(null), songData = useRef(null);
  const eng = useRef(null), get = useRef(read), fired = useRef(new WeakMap()), cues = useRef(new WeakMap());
  get.current = read;
  const on = !!crowd && prefs.on, e0 = crowd ? crowdEnergy(crowd) : 0.6;
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private mode */ } }, [prefs]);
  useEffect(() => { if (crowd) loadWhiteoutSong().then((s) => { if (s) { songData.current = s.data; setSong({ name: s.name }); eng.current?.setSong(s.data); } }); }, [!!crowd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!on) return undefined;
    const e = createCrowdAudio(); if (!e) return undefined;
    eng.current = e; e.setVolume(prefs.vol); e.resume(); if (songData.current) e.setSong(songData.current);
    const wake = () => e.resume(); window.addEventListener('pointerdown', wake);   // browsers only allow sound after a click
    const id = setInterval(() => tick(e), 100);
    return () => { clearInterval(id); window.removeEventListener('pointerdown', wake); e.close(); eng.current = null; };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { eng.current?.setVolume(prefs.vol); }, [prefs.vol]);

  function tick(e) {
    const st = get.current(), { play, S, c } = st || {};
    if (!play || !S || !c) return;
    const t = c.t, brk = S.breakAt ?? 0.4, live = c.phase === 'live';
    const woSong = st.wo && (c.phase === 'wo' || (live && t < brk)), roar = st.wo && live && t >= brk && t < S.T0 + 0.6, hasSong = e.hasSong();
    if (woSong && hasSong && (c.phase !== 'wo' || c.hold > 0.1)) e.startSong(WO.songAt); else if (!woSong) e.stopSong(0.08);   // the song stops right as they break
    const done = fired.current.get(play) || new Set(); fired.current.set(play, done);
    if (st.wo && live && t >= brk && !done.has('wo')) { done.add('wo'); e.pop('eruption', 1); }
    const beds = bedLevels({ play, t, T0: S.T0, tEnd: S.tEnd, e: e0, tdAt: c.tdAt, wo: { song: woSong && hasSong, roar: roar || (woSong && !hasSong) } });
    e.setBeds(beds, roar ? 0.12 : 0.4);
    if (import.meta.env.DEV) window.__crowd = { beds, phase: c.phase, t, song: woSong && hasSong, roar, i: play.n };   // dev only: tests read the mix
    e.setMaster(masterLevel({ phase: c.phase, paused: st.paused, brk: st.brk, done: st.done }));
    if (!live || st.paused) return;
    if (!cues.current.has(play)) cues.current.set(play, cuesFor(play, S, seed));
    cues.current.get(play).forEach((q, n) => {
      const at = q.at === 'score' ? c.tdAt : q.at;
      if (at == null || done.has(n) || t < at) return;
      done.add(n); if (t < at + 1.5) { e.pop(q.name, q.gain * (0.4 + 0.6 * e0)); if (import.meta.env.DEV) (window.__pops ||= []).push([play.n, q.name]); }   // jumped past it: skip it
    });
  }
  return {
    on: prefs.on, vol: prefs.vol, song: song?.name || null,
    setOn: (v) => { setPrefs((p) => ({ ...p, on: v })); eng.current?.resume(); },
    setVol: (v) => setPrefs((p) => ({ ...p, vol: v })),
    pickSong: async (file) => { const s = await saveWhiteoutSong(file); songData.current = s.data; eng.current?.setSong(s.data); setSong({ name: s.name }); },
    clearSong: async () => { await clearWhiteoutSong(); songData.current = null; eng.current?.setSong(null); setSong(null); },
  };
}
