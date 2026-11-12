import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { networkFor, windowLabel } from '../data/games.js';
import { getTeam } from '../data/teams.js';
import { recordText } from '../lib/seasonStats.js';
import { useStadiums } from '../data/stadiums.js';

function Side({ id, score, won, rec, done }) {
  const t = getTeam(id);
  return (
    <div className={`lw-side${done && !won ? ' lost' : ''}`}>
      <TeamBadge team={t} size="sm" /><b>{t?.name || id}</b><small>{recordText(rec[id])}</small>
      <span className="lw-score">{score ?? ''}</span>
    </div>
  );
}

// Live → a week: every game in the order it airs, with its day, kickoff time, network and stadium, and the score once it starts.
export default function LiveWeekGames({ week, rec }) {
  const stadiums = useStadiums();
  return (
    <ol className="lw-games">
      {week.games.map((g) => {
        const done = g.status === 'final', started = done || g.status === 'live', home = getTeam(g.home);
        const net = networkFor(g.window, home), prime = g.window?.endsWith('night');
        return (
          <li key={g.id} className={`lw-game ${g.status}${prime ? ' prime' : ''}`}>
            <div className="lw-top">
              <span>{g.time}{g.window ? ` · ${windowLabel(g.window)}` : ''}{net ? ` · ${net}` : ''}</span>
              <span className="lw-status">{done ? 'FINAL' : g.status === 'live' ? <><i className="live-pulse" />LIVE · {g.clock}</> : 'Upcoming'}</span>
            </div>
            <Side id={g.away} score={started ? g.awayScore : null} won={g.awayScore > g.homeScore} rec={rec} done={done} />
            <Side id={g.home} score={started ? g.homeScore : null} won={g.homeScore > g.awayScore} rec={rec} done={done} />
            <small className="dim lw-at">🏟️ {stadiums[g.home]?.name || home?.name}</small>
          </li>
        );
      })}
    </ol>
  );
}
