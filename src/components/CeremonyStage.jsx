// The Live tab's award ceremony stage: just the stage (the auditorium is saved for the show), lit like a theater and
// fading into the page, with the countdown glowing on the stage's own screen. While the show is on it reads LIVE NOW
// (join the Discord call); after it, Congratulations.
import React, { useEffect, useRef } from 'react';
import { buildStill, renderStage } from '../lib/stageView.js';

const two = (n) => String(n).padStart(2, '0');
function left(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400);
  return `${d ? `${d}d ` : ''}${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}
const when = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase();
export const LIVE_CAM = { x: 160, y: 75, z: 1.28 };

// What the screen says right now.
function screenFor(state, season, now) {
  if (state?.finished) return { mode: 'winners', d: { season } };
  if (state?.started) return { mode: 'live', d: { season } };
  const at = state?.show_at ? Date.parse(state.show_at) : null;
  if (at && at > now) return { mode: 'countdown', d: { season, big: left(at - now), small: when(state.show_at) } };
  if (at) return { mode: 'countdown', d: { season, big: 'Starting soon', small: when(state.show_at) } };
  return { mode: 'countdown', d: { season, big: 'Date coming soon', small: 'THE COMMISSIONER WILL SET THE NIGHT' } };
}

export default function CeremonyStage({ season, state }) {
  const ref = useRef(null), live = useRef(state);
  live.current = state;
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext('2d'), still = buildStill(false), t0 = performance.now();
    let raf = 0, on = true;
    const frame = (ms) => {
      if (on) renderStage(ctx, still, LIVE_CAM, (ms - t0) / 1000, { screen: screenFor(live.current, season, Date.now()), light: { dark: 0.46, beams: 0.6 } });
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; });   // no drawing while it's scrolled away
    io.observe(cv); raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [season]);
  return (
    <section className="cer-stage">
      <canvas ref={ref} width={1280} height={660} className="cer-canvas" aria-label={`Season ${season} MFL Award Ceremony stage`} />
    </section>
  );
}
