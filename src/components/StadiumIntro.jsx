import React, { useEffect, useRef, useState } from 'react';
import { SW, SH, painter, crowdColors } from '../lib/stadiumScene.js';
import { SHOTS } from '../lib/stadiumShots.js';
import { capacityText } from '../lib/stadiumList.js';

const SHOT_SECONDS = 4.5;
// Pre-game runs all 7 shots; "back from the break" uses the outside and crowd shots (the biome and the building).
export const SEQUENCES = { pregame: SHOTS.map((s) => s.key), break: ['arrival', 'approach', 'crowd', 'endzone'] };

// Plays a stadium's cinematic shots like a TV open: each shot pans or pushes in, fades into the next, with a broadcast caption.
// env.time / env.weather are passed through for later; crowd mode 'bloodbath' fills the stands with red.
export default function StadiumIntro({ st, team, env = { time: 'day', weather: 'clear' }, sequence = 'pregame' }) {
  const ref = useRef(null);
  const [logo, setLogo] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [idx, setIdx] = useState(0);
  const [blood, setBlood] = useState(false);
  const keys = SEQUENCES[sequence] || SEQUENCES.pregame;
  const shots = keys.map((k) => SHOTS.find((s) => s.key === k));
  const clock = useRef({ start: performance.now(), idx: 0 });

  useEffect(() => { if (!team?.logo) return; const img = new Image(); img.onload = () => setLogo(img); img.src = team.logo; }, [team?.logo]);
  useEffect(() => { clock.current = { start: performance.now(), idx }; }, [idx]);
  useEffect(() => {
    let raf;
    const a = { st, team, env: { ...env, crowd: blood ? 'bloodbath' : 'normal' }, crowd: crowdColors(team, blood ? 'bloodbath' : 'normal'), logo };
    const frame = (now) => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      const p = painter(ctx);
      let el = (now - clock.current.start) / 1000;
      if (playing && el > SHOT_SECONDS) { const n = (clock.current.idx + 1) % shots.length; clock.current = { start: now, idx: n }; setIdx(n); el = 0; }
      if (!playing) el = Math.min(el, SHOT_SECONDS * 0.5);
      const k = Math.min(1, el / SHOT_SECONDS);
      shots[clock.current.idx].draw(p, a, now / 1000, k);
      const fade = Math.max(0, 1 - el / 0.5, (el - (SHOT_SECONDS - 0.4)) / 0.4);
      if (playing && fade > 0) p.rect(0, 0, SW, SH, `rgba(0,0,0,${Math.min(1, fade)})`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [st, team, logo, playing, blood, sequence]); // eslint-disable-line react-hooks/exhaustive-deps

  const shot = shots[idx];
  const a = { st, team, env: { ...env, crowd: blood ? 'bloodbath' : 'normal' } };
  return (
    <div className="stadium-intro">
      <div className="si-screen">
        <canvas ref={ref} width={SW} height={SH} />
        <div className="si-lower" style={{ '--tc': team.color }}><b>{shot.caption(a)}</b><small>{st.name} · {capacityText(st.capacity)} seats</small></div>
        <span className="si-bug">MFL</span>
      </div>
      <div className="si-controls">
        <button className="btn small ghost" onClick={() => setIdx((idx + shots.length - 1) % shots.length)}>◀</button>
        <button className="btn small" onClick={() => setPlaying(!playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <button className="btn small ghost" onClick={() => setIdx((idx + 1) % shots.length)}>▶</button>
        <span className="si-dots">{shots.map((s, i) => <button key={s.key} title={s.label} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>{s.label}</button>)}</span>
        {team.id === 'crf' && <label className="si-toggle"><input type="checkbox" checked={blood} onChange={(e) => setBlood(e.target.checked)} /> Bloodbath crowd</label>}
      </div>
    </div>
  );
}
