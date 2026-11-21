// Fan support, kept simple: the number (1-100%), the fans' mood and a meter. What it's built from stays behind the scenes.
import React from 'react';
import { useFanSupport } from '../data/fanSupport.js';
import { moodColor } from '../lib/fanSupport.js';

export default function FanSupportCard({ team }) {
  const f = useFanSupport().map?.[team.id];
  if (!f) return null;
  return (
    <section className="card fan-card" style={{ '--fc': moodColor(f.value), '--k': f.value / 100 }}>
      <div className="fan-ring"><b>{f.value}<small>%</small></b></div>
      <div className="fan-body">
        <h3>📣 Fan support <em>{f.mood}</em></h3>
        <div className="fan-meter" aria-label={`Fan support ${f.value}%`}><i /></div>
      </div>
    </section>
  );
}
