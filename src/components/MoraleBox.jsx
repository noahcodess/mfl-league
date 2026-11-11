import React, { useEffect, useState } from 'react';
import MoodTag from './MoodTag.jsx';
import { usePlayerMorale, useTradeDeadline, MOOD_NAMES, moodRank } from '../data/morale.js';
import { untilText, whenText } from '../data/schedule.js';

// Player card → Morale: his mood, which way it's heading, every reason behind it, and a trade request banner with the deadline countdown.
export default function MoraleBox({ player }) {
  const m = usePlayerMorale(player.teamId ? player.id : null);
  const deadline = useTradeDeadline();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!player.teamId) return null;
  const trend = m?.target && m.target !== player.mood ? (moodRank(m.target) > moodRank(player.mood) ? 'up' : 'down') : null;
  return (
    <section className={`morale-box mb-${player.mood || 'normal'}`}>
      <div className="mb-head">
        <MoodTag mood={player.mood || 'normal'} size={44} iconOnly />
        <div>
          <small>Morale</small>
          <b>{MOOD_NAMES[player.mood] || 'Normal'}</b>
          {m && <span className={`mb-trend ${trend || ''}`}>{trend === 'up' ? `↗ Cheering up, heading toward ${MOOD_NAMES[m.target]}` : trend === 'down' ? `↘ Heading toward ${MOOD_NAMES[m.target]}` : 'Settled'}</span>}
        </div>
      </div>
      {m?.request && (
        <div className="mb-request">
          <b>📣 He asked for a trade</b>
          <span>He's locked on the trade block. If he isn't traded by the deadline, he's cut.</span>
          <span className="mb-deadline">⏰ {deadline ? <>Deadline {whenText(deadline)} · <b>{untilText(new Date(deadline) - now)}</b></> : 'Deadline: after Week 8'}</span>
        </div>
      )}
      {!m ? <p className="dim">Checking the locker room...</p> : m.reasons.length ? (
        <ul className="mb-reasons">
          {m.reasons.map((r) => <li key={r.text} className={r.v > 0 ? 'pos' : r.v < 0 ? 'neg' : ''}><span>{r.icon}</span>{r.text}</li>)}
        </ul>
      ) : <p className="dim">Nothing bugging him, nothing special lifting him. Just playing ball.</p>}
      <p className="mb-foot dim">Moods move one step at a time, each week and at a few offseason steps.</p>
    </section>
  );
}
