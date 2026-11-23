// The two-minute warning on the broadcast: the program cuts away to a big card in its own colors and font: TWO-MINUTE
// WARNING, the quarter and the clock, both teams with the score and the timeouts each has left. Then it cuts back and
// the teams break the huddle like they never left.
import React from 'react';

// teams: { home, away }. b4: the play's situation (score, quarter, clock, timeouts). bc: the broadcast.
export default function TwoMinuteCard({ teams, b4, bc }) {
  const q = b4.quarter === 2 ? '2nd quarter' : '4th quarter', clock = `${Math.floor(b4.clock / 60)}:${String(b4.clock % 60).padStart(2, '0')}`;
  return (
    <div className="tmw-back">
      <div className={`tmw bgx-${bc.bug}`}>
        <img className="tmw-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" />
        <b className="tmw-title"><span className="tmw-row">{[...'TWO-MINUTE'].map((ch, k) => <span key={k} style={{ animationDelay: `${0.15 + k * 0.035}s` }}>{ch}</span>)}</span><em>WARNING</em></b>
        <span className="tmw-clock"><small>{q}</small><i>{clock}</i></span>
        <div className="tmw-teams">{['away', 'home'].map((s) => (
          <div key={s} className="tmw-team" style={{ '--tc': teams[s].color }}>
            <img src={teams[s].logo} alt="" /><span><b>{teams[s].code}</b><small>{[0, 1, 2].map((n) => <i key={n} className={n < (b4.to?.[s] ?? 3) ? 'on' : ''} />)}</small></span><strong>{b4.score[s]}</strong>
          </div>))}
        </div>
      </div>
    </div>
  );
}
