import React from 'react';
import ScoreNum from './ScoreNum.jsx';
import { useTicker, clockLeft, clockText, quarterText, downText, ballText } from '../data/gameState.js';
import { recordText } from '../lib/seasonStats.js';

// The coaching room's scoreboard, built into the page (not a floating bug): both teams (logo, name, record, timeouts, score,
// who has the ball), and in the middle the program's logo, quarter, game clock, play clock, down and distance and the ball spot.
// Colored and lettered in the game's program style; live and in sync with the game.
export default function CoachBoard({ bc, home, away, st, rec = {} }) {
  useTicker(st?.clock_running);
  const has = st?.possession, offense = has === home.id ? home : has === away.id ? away : null, defense = offense && (offense === home ? away : home);
  const side = (t, s) => (
    <div className={`cb-team ${s}${has === t.id ? ' ball' : ''}`} style={{ '--tc': t.color, '--ta': t.accent }}>
      <img className="cb-logo" src={t.logo} alt="" />
      <div className="cb-name"><small>{s === 'home' ? 'Home' : 'Away'}</small><b>{t.name}</b><span>{recordText(rec[t.id])}{has === t.id ? ' · 🏈 Ball' : ''}</span>
        <span className="cb-tos">{[0, 1, 2].map((i) => <i key={i} className={i < (st?.[`${s}_timeouts`] ?? 3) ? 'on' : ''} />)}</span></div>
      <ScoreNum className="cb-score" value={st?.[`${s}_score`] ?? 0} />
    </div>
  );
  return (
    <section className={`cb cb-${bc.bug}`}>
      {side(away, 'away')}
      <div className="cb-mid">
        <img className="cb-net" src={bc.logo} alt={bc.title} />
        <div className="cb-clock"><span>{st?.status === 'final' ? 'Final' : quarterText(st?.quarter || 1)}</span><b>{clockText(clockLeft(st))}</b><em title="Play clock">{st?.play_clock ?? 40}</em></div>
        <span className="cb-down">{downText(st)}</span>
        <small className="cb-spot">{offense ? ballText(st, offense.code, defense.code) : st?.clock_running ? 'Clock running' : 'Clock stopped'}</small>
      </div>
      {side(home, 'home')}
    </section>
  );
}
