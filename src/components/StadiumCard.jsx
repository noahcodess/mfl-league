import React, { useState } from 'react';
import StadiumIntro from './StadiumIntro.jsx';
import { stadiumFor, capacityText } from '../lib/stadiumList.js';

// Team page → the team's stadium: name, capacity, description, and the TV open (pre-game or back-from-the-break shots).
export default function StadiumCard({ team }) {
  const st = stadiumFor(team.id);
  const [seq, setSeq] = useState('pregame');
  if (!st) return null;
  return (
    <section className="card stadium-card">
      <header className="sc-head">
        <div><h3>🏟️ {st.name}</h3><small className="dim">{capacityText(st.capacity)} seats · {st.blurb}</small></div>
        <div className="drip-kits">
          <button className={seq === 'pregame' ? 'on' : ''} onClick={() => setSeq('pregame')}>Pre-game open</button>
          <button className={seq === 'break' ? 'on' : ''} onClick={() => setSeq('break')}>Back from the break</button>
        </div>
      </header>
      <StadiumIntro key={seq} st={st} team={team} sequence={seq} />
    </section>
  );
}
