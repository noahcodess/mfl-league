import React from 'react';
import { useTicker, clockLeft, clockText, quarterText } from '../data/gameState.js';

// The coaching room's scorebug: just the two logos, the score, the quarter and the clock, live, in the game's program style.
export default function MiniScorebug({ bc, home, away, st }) {
  useTicker(st?.clock_running);
  const side = (t, s) => (
    <div className={`msb-team ${s}${st?.possession === t.id ? ' ball' : ''}`} style={{ '--tc': t.color }}>
      <img src={t.logo} alt={t.name} /><b>{st?.[`${s}_score`] ?? 0}</b>
    </div>
  );
  return (
    <div className={`msb sb-${bc.bug}`}>
      {side(away, 'away')}
      <div className="msb-mid"><span>{st?.status === 'final' ? 'Final' : quarterText(st?.quarter || 1)}</span><b>{clockText(clockLeft(st))}</b>{st?.clock_running ? <i className="msb-run">● Live</i> : <i>Clock stopped</i>}</div>
      {side(home, 'home')}
    </div>
  );
}
