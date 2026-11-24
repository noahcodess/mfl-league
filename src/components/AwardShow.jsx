// The commissioner's award show: it opens on the stage and pulls back into the auditorium, then asks for full screen and
// holds on the title. "Tonight", the list of awards, then each award (MVP last): its title card, the finalists walking
// on, and the reveal with the drum roll. The winners card, then the room fades back to the stage. Next / Back at the
// bottom right or the arrow keys; Next waits for each animation. The slides are fixed when the show opens (so nothing
// restarts) and the camera always carries on from where it is. Reaching the winners card finishes the show; where he
// left off is remembered.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useShowCast from './useShowCast.js';
import { showSlides, listNames, SHORT, DRUM_AT, HIT } from '../lib/showSlides.js';
import { drawShowFrame } from '../lib/showFrame.js';
import { buildStill } from '../lib/stageView.js';
import { showTheme } from '../lib/showTheme.js';
import { SHOW_ORDER } from '../data/ceremony.js';
import { useCraftBowlPlan } from '../data/craftBowlPlans.js';
import { createCrowdAudio } from '../lib/crowdAudio.js';

const DW = 1600, DH = 900, DRUM = `${import.meta.env.BASE_URL}audio/Drum Roll.mp3`;
const saved = (season) => { try { return Number(localStorage.getItem(`mfl-show-${season}`)) || 0; } catch { return 0; } };
const remember = (season, i) => { try { localStorage.setItem(`mfl-show-${season}`, String(i)); } catch { /* private mode */ } };
const bypass = () => import.meta.env.DEV && /devshow/.test(window.location.search);   // dev: screenshots without full screen

export default function AwardShow({ season, state, onFinish, onExit }) {
  const [show] = useState(() => {   // fixed for the whole show: re-reading the ceremony never rebuilds (or restarts) a slide
    const order = SHOW_ORDER.filter((k) => state?.winners?.[k]?.length), winners = state?.winners || {};
    return { slides: showSlides(order, winners), info: { season, order, names: listNames(order), short: SHORT, winners } };
  });
  const { slides } = show, cast = useShowCast(slides), plan = useCraftBowlPlan(season), theme = showTheme(plan);
  const first = Number(new URLSearchParams(window.location.search).get('devslide')) || saved(season);
  const [idx, setIdx] = useState(Math.min(first, slides.length - 1)), [done, setDone] = useState(false), [full, setFull] = useState(!!document.fullscreenElement || bypass());
  const [sound, setSound] = useState(true), root = useRef(null), cv = useRef(null), audio = useRef(null), drum = useRef(null), finished = useRef(!!state?.finished);
  const live = useRef({ idx, t0: performance.now(), start: null, cam: null });   // what the drawing loop reads (set right away, no waiting on React)
  live.current.cast = cast; live.current.info = { ...show.info, theme };
  const sl = slides[idx];

  const go = (i) => { const L = live.current; L.idx = i; L.t0 = performance.now(); L.start = L.cam; setIdx(i); setDone(false); };
  useEffect(() => {   // the crowd: a low murmur under the show; the drum roll
    const a = createCrowdAudio(); audio.current = a; a?.setBeds([0.45, 0.3, 0, 0], 0.1); a?.setMaster(0.55, 1.5);
    drum.current = new Audio(DRUM); drum.current.preload = 'auto';
    return () => { a?.close(); drum.current?.pause(); };
  }, []);
  useEffect(() => { audio.current?.setVolume(sound ? 1 : 0); if (drum.current) drum.current.muted = !sound; }, [sound]);
  useEffect(() => {   // each slide: Next unlocks when its animation is done; its sound cues
    remember(season, idx);
    const a = audio.current, timers = [setTimeout(() => setDone(true), sl.len * 1000)];
    const at = (s, fn) => timers.push(setTimeout(fn, s * 1000));
    if (sl.kind === 'tonight') a?.pop('cheer', 0.7, 0.6);
    if (sl.kind === 'reveal') {
      at(DRUM_AT, () => { const d = drum.current; if (d) { d.currentTime = 0; d.volume = 0.9; d.play().catch(() => {}); } });
      at(HIT, () => { a?.pop('eruption', 0.9, 0); a?.pop('cheer', 0.8, 0.25); });
    }
    if (sl.kind === 'finale') a?.pop('cheer', 0.8, 0.3);
    if ((sl.kind === 'finale' || sl.kind === 'close') && !finished.current) { finished.current = true; onFinish?.(); }
    return () => { timers.forEach(clearTimeout); if (drum.current && sl.kind === 'reveal') drum.current.pause(); };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {   // draw every frame (the stills are rebuilt when the Craft Bowl's colors arrive)
    const ctx = cv.current.getContext('2d'), stills = { house: buildStill(true, theme), stage: buildStill(false, theme) }, off = document.createElement('canvas');
    off.width = DW; off.height = DH;
    let raf = 0;
    const frame = (ms) => { const L = live.current; L.cam = drawShowFrame(ctx, stills, slides[L.idx], (ms - L.t0) / 1000, L.cast, L.info, L.start, off); raf = requestAnimationFrame(frame); };
    document.fonts?.load("900 20px 'Cinzel'").finally(() => { raf = requestAnimationFrame(frame); });
    return () => cancelAnimationFrame(raf);
  }, [theme.primary, theme.secondary]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => { if (!done) return; if (idx >= slides.length - 1) { exit(); return; } go(idx + 1); };
  const back = () => { if (idx > 0) go(idx - 1); };
  useEffect(() => {
    const key = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); back(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement || bypass());
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const goFull = () => root.current?.requestFullscreen?.().catch(() => {});
  function exit() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onExit(); }
  const gate = !full && (idx > 0 || done);   // the opening plays first, then it asks for full screen

  return createPortal(
    <div className="show" ref={root}>
      <canvas ref={cv} width={DW} height={DH} className="show-canvas" />
      {!cast.ready && <div className="show-loading">Setting the stage...</div>}
      <div className="show-ctrl">
        <button className="show-btn" onClick={() => setSound(!sound)} title="Sound">{sound ? '🔊' : '🔇'}</button>
        <span className="show-count">{idx + 1} / {slides.length}</span>
        <button className="show-btn" disabled={idx === 0} onClick={back}>◀ Back</button>
        <button className={`show-btn next${done ? ' ready' : ''}`} disabled={!done} onClick={next}>
          <i key={idx} style={{ animationDuration: `${sl.len}s` }} />{idx >= slides.length - 1 ? 'Close the show' : 'Next'} ▶
        </button>
      </div>
      <button className="show-x" onClick={exit} title="Leave the show (you can resume it)">✕</button>
      {gate && (
        <div className="show-gate">
          <b>The MFL Award Ceremony runs full screen</b>
          <span>Share this screen in the Discord call, then go full screen.</span>
          <button className="btn" onClick={goFull}>⛶ Go full screen</button>
          <button className="btn ghost" onClick={exit}>Leave the show</button>
        </div>
      )}
    </div>, document.body);
}
