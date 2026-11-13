import React, { useState } from 'react';
import CoachBoard from './CoachBoard.jsx';
import CoachSprite from './CoachSprite.jsx';
import KeyPlayPanel from './KeyPlayPanel.jsx';
import KeyPlayOverlay from './KeyPlayOverlay.jsx';
import ClockTimeout from './ClockTimeout.jsx';
import { recordText } from '../lib/seasonStats.js';
import { TEST_MOMENTS, momentText } from '../lib/keyPlays.js';

// The coaching room once it's open: the full scoreboard built into the page in the game's program style, a reminder to join
// the Discord call (the game itself is only on the commissioner's stream), your coach, key plays, and the clock-shaped
// timeout button. Everything follows the live game state.
export default function CoachRoom({ bc, game, home, away, me, coach, st, rec, onTimeout, canTest }) {
  const [moment, setMoment] = useState(null), [last, setLast] = useState(null);
  const mine = me === home.id ? home : away, opp = mine === home ? away : home, side = mine === home ? 'home' : 'away';
  const test = () => setMoment(TEST_MOMENTS[Math.floor(Math.random() * TEST_MOMENTS.length)]);
  return (
    <div className={`coach-room cr-${bc.bug}`} style={{ '--tc': mine.color, '--ta': mine.accent }}>
      <CoachBoard bc={bc} home={home} away={away} st={st} rec={rec} />
      <p className="cr-discord">🎧 <b>Join the Discord call to watch the game.</b> <span>Week {game.week} · {game.time} · {bc.title}</span></p>
      <div className="cr-grid">
        <section className="cr-card cr-coach">
          <div className="cr-stage"><CoachSprite coach={coach} team={mine} height={190} bob /></div>
          <b>{coach.name || 'Head coach'}</b>
          <span>{mine.name} · {recordText(rec?.[mine.id])}</span>
          <small className="dim">vs {opp.name} ({recordText(rec?.[opp.id])}) · {side === 'home' ? 'Home' : 'Away'}</small>
          <span className="cr-headset">🎧 Headset on</span>
        </section>
        <KeyPlayPanel last={last} canTest={canTest} onTest={test} />
        <ClockTimeout st={st} side={side} onTimeout={onTimeout} />
      </div>
      {moment && <KeyPlayOverlay moment={moment} team={mine} onPick={(p) => setLast({ name: p.name, moment: momentText(moment) })} onClose={() => setMoment(null)} />}
    </div>
  );
}
