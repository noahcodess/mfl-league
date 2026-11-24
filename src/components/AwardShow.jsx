// The commissioner's full-screen award show: the auditorium's lights come up, "tonight", the list of awards, then each
// award's finalists walk on, its graphic, and the winner, MVP last, and the winners card before the room fades back to
// the stage. Next / Back at the bottom right or the arrow keys; Next waits for each animation to finish. It has to run
// full screen. Reaching the winners card finishes the show (coaches see the winners 2 minutes later). Where he left off is
// remembered, so closing it and coming back resumes.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useShowCast from './useShowCast.js';
import { showSlides, listNames } from '../lib/showSlides.js';
import { drawShowFrame } from '../lib/showFrame.js';
import { buildStill } from '../lib/stageView.js';
import { SHOW_ORDER } from '../data/ceremony.js';
import { createCrowdAudio } from '../lib/crowdAudio.js';

const DW = 1600, DH = 900;
const saved = (season) => { try { return Number(localStorage.getItem(`mfl-show-${season}`)) || 0; } catch { return 0; } };
const remember = (season, i) => { try { localStorage.setItem(`mfl-show-${season}`, String(i)); } catch { /* private mode */ } };
const bypass = () => import.meta.env.DEV && /devshow/.test(window.location.search);   // dev: screenshots without full screen

// state: from useCeremony (the commissioner sees the winners once the show has started). onFinish(): the show reached
// the winners card. onExit(): closed.
export default function AwardShow({ season, state, onFinish, onExit }) {
  const order = useMemo(() => SHOW_ORDER.filter((k) => state?.winners?.[k]?.length), [state?.winners]);
  const slides = useMemo(() => showSlides(order, state?.winners || {}), [order]); // eslint-disable-line react-hooks/exhaustive-deps
  const cast = useShowCast(slides), info = useMemo(() => ({ season, order, names: listNames(order), winners: state?.winners || {} }), [season, order]); // eslint-disable-line react-hooks/exhaustive-deps
  const startAt = Number(new URLSearchParams(window.location.search).get('devslide')) || saved(season);
  const [idx, setIdx] = useState(Math.min(startAt, Math.max(0, slides.length - 1))), [done, setDone] = useState(false), [full, setFull] = useState(!!document.fullscreenElement || bypass());
  const [sound, setSound] = useState(true), root = useRef(null), cv = useRef(null), t0 = useRef(performance.now()), audio = useRef(null), finished = useRef(!!state?.finished);
  const sl = slides[idx];

  useEffect(() => {   // the crowd: a low murmur under the show, applause on the big moments
    const a = createCrowdAudio(); audio.current = a;
    a?.setBeds([0.5, 0.35, 0, 0], 0.1); a?.setMaster(0.55, 1.5);
    return () => a?.close();
  }, []);
  useEffect(() => { audio.current?.setVolume(sound ? 1 : 0); }, [sound]);
  useEffect(() => {   // each slide: restart its clock, lock Next until its animation is done, cue the crowd
    t0.current = performance.now(); setDone(false); remember(season, idx);
    const a = audio.current, timer = setTimeout(() => setDone(true), (sl?.len || 1) * 1000);
    if (sl?.kind === 'tonight') a?.pop('cheer', 0.8, 0.5);
    if (sl?.kind === 'winner') { a?.pop('eruption', 0.9, 2); a?.pop('cheer', 0.8, 2.3); }
    if (sl?.kind === 'finale') a?.pop('cheer', 0.9, 0.3);
    if ((sl?.kind === 'finale' || sl?.kind === 'close') && !finished.current) { finished.current = true; onFinish?.(); }
    return () => clearTimeout(timer);
  }, [idx, sl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {   // draw every frame
    if (!sl) return undefined;
    const ctx = cv.current.getContext('2d'), stills = { house: buildStill(true), stage: buildStill(false) }, off = document.createElement('canvas');
    off.width = DW; off.height = DH;
    let raf = 0;
    const frame = (ms) => { drawShowFrame(ctx, stills, slides[idxRef.current], (ms - t0.current) / 1000, castRef.current, info, off); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [slides.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const idxRef = useRef(idx), castRef = useRef(cast); idxRef.current = idx; castRef.current = cast;

  const next = () => { if (!done) return; if (idx >= slides.length - 1) { onExit(); return; } setIdx(idx + 1); };
  const back = () => { if (idx > 0) setIdx(idx - 1); };
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
  const exit = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); onExit(); };
  if (!sl) return null;
  const last = idx >= slides.length - 1, label = last ? 'Close the show' : 'Next';

  return createPortal(
    <div className="show" ref={root}>
      <canvas ref={cv} width={DW} height={DH} className="show-canvas" />
      {!cast.ready && <div className="show-loading">Setting the stage...</div>}
      <div className="show-ctrl">
        <button className="show-btn" onClick={() => setSound(!sound)} title="Crowd sound">{sound ? '🔊' : '🔇'}</button>
        <span className="show-count">{idx + 1} / {slides.length}</span>
        <button className="show-btn" disabled={idx === 0} onClick={back}>◀ Back</button>
        <button className={`show-btn next${done ? ' ready' : ''}`} disabled={!done} onClick={next}>
          <i key={idx} style={{ animationDuration: `${sl.len}s` }} />{label} ▶
        </button>
      </div>
      <button className="show-x" onClick={exit} title="Leave the show (you can resume it)">✕</button>
      {!full && (
        <div className="show-gate">
          <b>The show runs full screen</b>
          <span>Share this screen in the Discord call, then go full screen.</span>
          <button className="btn" onClick={goFull}>⛶ Go full screen</button>
          <button className="btn ghost" onClick={exit}>Leave the show</button>
        </div>
      )}
    </div>, document.body);
}
