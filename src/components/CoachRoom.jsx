import React from 'react';
import MiniScorebug from './MiniScorebug.jsx';
import CoachSprite from './CoachSprite.jsx';
import PlayCallPanel from './PlayCallPanel.jsx';
import TimeoutPanel from './TimeoutPanel.jsx';
import { recordText } from '../lib/seasonStats.js';

// The coaching room once it's open: the live mini scorebug in the game's program style, your coach, the play calls and the
// timeout button. It never shows the game itself; that's on the commissioner's stream.
export default function CoachRoom({ bc, game, home, away, me, coach, st, rec, onTimeout }) {
  const mine = me === home.id ? home : away, opp = mine === home ? away : home, side = mine === home ? 'home' : 'away';
  return (
    <div className={`coach-room room-${bc.bug}`} style={{ '--tc': mine.color, '--ta': mine.accent }}>
      <div className="cr-top">
        <MiniScorebug bc={bc} home={home} away={away} st={st} />
        <p className="dim">Week {game.week} · {game.time} · {bc.title} · 📺 The game is on the commissioner's stream</p>
      </div>
      <div className="cr-grid">
        <section className="cr-card cr-coach">
          <CoachSprite coach={coach} team={mine} height={200} bob />
          <b>{coach.name || 'Head coach'}</b>
          <span className="dim">{mine.name} · {recordText(rec?.[mine.id])}</span>
          <small className="dim">vs {opp.name} ({recordText(rec?.[opp.id])}) · you're the {side} team</small>
        </section>
        <PlayCallPanel />
        <TimeoutPanel st={st} side={side} onTimeout={onTimeout} />
      </div>
    </div>
  );
}
