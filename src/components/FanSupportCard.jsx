// Team page → fan support: the public meter (1-100%), the fans' mood, what it's made of, and the crowd it draws.
import React from 'react';
import { useFanSupport } from '../data/fanSupport.js';
import { useStadiums, capacityText } from '../data/stadiums.js';
import { moodColor } from '../lib/fanSupport.js';
import { gameAttendance } from '../lib/attendance.js';

const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

export default function FanSupportCard({ team }) {
  const fans = useFanSupport(), st = useStadiums()[team.id];
  const f = fans.map?.[team.id];
  if (!f) return null;
  const crowd = (o) => { let s = 0; for (let id = 1; id <= 24; id++) s += gameAttendance({ fan: f.value, capacity: st?.capacity, gameId: id, ...o }).pct; return Math.round(s / 24 * 100); };
  const day = crowd({}), prime = crowd({ prime: true }), p = f.parts;
  const bits = [
    ['📚', 'Last 3 seasons', `${p.memory}%`],
    ['🏈', `This season (${f.record})`, sign(p.season)],
    p.streak ? [p.streak > 0 ? '🔥' : '🥶', p.streak > 0 ? 'Win streak' : 'Losing streak', sign(p.streak)] : null,
    p.hope ? ['🌱', 'New coach hope', sign(p.hope)] : null,
    p.loyalty ? ['🏆', 'Craft Bowl loyalty', sign(p.loyalty)] : null,
  ].filter(Boolean);
  return (
    <section className="card fan-card" style={{ '--fc': moodColor(f.value), '--k': f.value / 100 }}>
      <div className="fan-ring"><b>{f.value}<small>%</small></b></div>
      <div className="fan-body">
        <h3>📣 Fan support <em>{f.mood}</em></h3>
        <div className="fan-meter" aria-label={`Fan support ${f.value}%`}><i /></div>
        <ul className="fan-bits">{bits.map(([e, l, v]) => <li key={l}><span>{e} {l}</span><b>{v}</b></li>)}</ul>
        <p className="dim fan-crowd">Crowds right now: day games about {day}% full{st ? ` of ${capacityText(st.capacity)}` : ''}, primetime {prime >= 99 ? 'sold out' : `about ${prime}%`}. Rivalries and special events draw more.</p>
      </div>
    </section>
  );
}
