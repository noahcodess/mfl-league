// The Live tab's award ceremony stage: the pixel-art auditorium with sweeping spotlights, and over it, in a plain readable
// font, the countdown to the show (or "happening now: join the Discord call", or "date coming soon").
import React, { useEffect, useRef, useState } from 'react';
import { drawStage, W, H } from '../lib/stageArt.js';
import { drawLights } from '../lib/stageLights.js';

const two = (n) => String(n).padStart(2, '0');
function left(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400);
  return `${d ? `${d}d ` : ''}${two(Math.floor((s % 86400) / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}
const when = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// season: number. state: from useCeremony.
export default function CeremonyStage({ season, state }) {
  const ref = useRef(null), [now, setNow] = useState(Date.now());
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext('2d'), still = document.createElement('canvas');
    still.width = W; still.height = H; drawStage(still.getContext('2d'), season);
    let raf = 0, on = true, t0 = performance.now();
    const frame = (ms) => {
      if (on) { ctx.drawImage(still, 0, 0); drawLights(ctx, (ms - t0) / 1000); }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; });   // no drawing while it's scrolled away
    io.observe(cv); raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [season]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const at = state?.show_at ? Date.parse(state.show_at) : null;
  let big, small;
  if (state?.finished) { big = 'The winners are in'; small = state.revealed ? 'Scroll down for every winner.' : 'Revealing on the site in a moment...'; }
  else if (state?.started) { big = '🔴 The ceremony is happening now'; small = 'Join the Discord call to watch it live.'; }
  else if (at && at > now) { big = left(at - now); small = when(state.show_at); }
  else if (at) { big = 'Starting soon'; small = `Scheduled for ${when(state.show_at)}`; }
  else { big = 'Date coming soon'; small = 'The commissioner will set the night.'; }
  return (
    <section className="cer-stage">
      <canvas ref={ref} width={W} height={H} className="cer-canvas" aria-label={`Season ${season} MFL Award Ceremony stage`} />
      <div className={`cer-count${state?.started && !state?.finished ? ' live' : ''}`}>
        <small>MFL Award Ceremony · Season {season}</small>
        <b>{big}</b>
        <span>{small}</span>
      </div>
    </section>
  );
}
