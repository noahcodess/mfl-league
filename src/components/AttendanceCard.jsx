import React, { useEffect, useState } from 'react';

// The attendance graphic over the stadium shot. Every program has its own design in its own spot (attendance.css):
// FOX bottom left, CBS along the bottom, TNF top right, SNF bottom middle around a circle, ESPN top left.
// The number counts up to the real crowd (fan support and the occasion decide it, data/gameCrowd.js); then the chip pops in: SOLD OUT at a sellout, otherwise how full it is ("72% full"). --fill tracks how full.
export default function AttendanceCard({ bc, home, stadium, att = null }) {
  const cap = stadium?.capacity || 60000, goal = att?.count ?? cap;
  const [n, setN] = useState(0), [done, setDone] = useState(false);
  useEffect(() => {
    let raf; const t0 = performance.now() + 900;
    const step = (now) => { const k = Math.max(0, Math.min(1, (now - t0) / 1700)); setN(Math.round(goal * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); else setTimeout(() => setDone(true), 250); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [goal]);
  const full = n >= cap, pct = Math.round(goal / cap * 100);
  return (
    <div className={`att att-${bc.bug}${full ? ' full' : ''}`} style={{ '--tc': home.color, '--ta': home.accent, '--fill': n / cap }}>
      <span className="att-logo"><img src={home.logo} alt="" /></span>
      <div className="att-body">
        <small className="att-label">Attendance</small>
        <b className="att-where">{stadium?.name || home.name}</b>
      </div>
      <span className="att-num">{n.toLocaleString('en-US')}</span>
      <i className="att-meter" aria-hidden="true" />
      {done && <span className={`att-full${full ? '' : ' att-pct'}`} key={full ? 'so' : 'pct'}>{full ? 'Sold out' : `${pct}% full`}</span>}
    </div>
  );
}
