import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { networkFor, windowLabel } from '../data/games.js';
import { getTeam } from '../data/teams.js';
import { recordText } from '../lib/seasonStats.js';
import { useStadiums } from '../data/stadiums.js';
import { links } from '../lib/router.js';
import { useRivals, isRivalry } from '../data/liveSeason.js';

function Side({ id, score, won, rec, done, tag }) {
  const t = getTeam(id);
  return (
    <div className={`lw-side${done && !won ? ' lost' : ''}${done && won ? ' won' : ''}`}>
      <TeamBadge team={t} size="md" />
      <div className="lw-name"><b>{t?.name || id}</b><small>{recordText(rec[id])} · {tag}</small></div>
      <span className="lw-score">{score ?? ''}</span>
    </div>
  );
}

// Live → a week: every game in the order it airs, two across. Each card: day, kickoff time, network, the two teams stacked
// (away on top), the score once it starts, and the stadium. Colored by both teams. The commissioner can click one to open it.
export default function LiveWeekGames({ week, rec, clickable }) {
  const stadiums = useStadiums(), rivals = useRivals();
  if (!week.games.length) return <p className="dim">No games scheduled for this week yet.</p>;
  return (
    <ol className="lw-games">
      {week.games.map((g) => {
        const done = g.status === 'final', started = done || g.status === 'live', home = getTeam(g.home), away = getTeam(g.away);
        const net = networkFor(g.window, home), prime = g.window?.endsWith('night');
        return (
          <li key={g.id} className={`lw-game ${g.status}${prime ? ' prime' : ''}${clickable ? ' click' : ''}`} style={{ '--away': away?.color, '--home': home?.color }}
            onClick={clickable ? () => { window.location.hash = links.game(g.id); } : undefined}>
            <div className="lw-top">
              <span>{g.time}{net ? ` · ${net}` : ''}</span>
              <span className="lw-status">{done ? 'Final' : g.status === 'live' ? <><i className="live-pulse" />Live · {g.clock}</> : prime ? `⭐ ${windowLabel(g.window)}` : windowLabel(g.window)}</span>
            </div>
            <Side id={g.away} score={started ? g.awayScore : null} won={g.awayScore > g.homeScore} rec={rec} done={done} tag="Away" />
            <Side id={g.home} score={started ? g.homeScore : null} won={g.homeScore > g.awayScore} rec={rec} done={done} tag="Home" />
            <small className="lw-at">🏟️ {stadiums[g.home]?.name || home?.name}{isRivalry(g, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}</small>
          </li>
        );
      })}
    </ol>
  );
}
