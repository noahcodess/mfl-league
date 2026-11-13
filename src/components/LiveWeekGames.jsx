import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { networkFor, windowLabel } from '../data/games.js';
import { getTeam } from '../data/teams.js';
import { recordText } from '../lib/seasonStats.js';
import { useStadiums } from '../data/stadiums.js';
import { links } from '../lib/router.js';
import { useRivals, isRivalry } from '../data/liveSeason.js';
import { useGameStates, clockLeft, clockText, quarterText } from '../data/gameState.js';

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
// (away on top), the score once it starts, and the stadium. A game in progress blinks LIVE with its live score and clock;
// the two coaches get a Join coaching room button. Click any card to open the game.
export default function LiveWeekGames({ week, rec, teamId }) {
  const stadiums = useStadiums(), rivals = useRivals(), states = useGameStates(week.games.map((g) => String(g.id)));
  if (!week.games.length) return <p className="dim">No games scheduled for this week yet.</p>;
  return (
    <ol className="lw-games">
      {week.games.map((g) => {
        const st = states[String(g.id)], isLive = st?.status === 'live' || g.status === 'live', done = g.status === 'final' || st?.status === 'final';
        const hs = st ? st.home_score : g.homeScore, as = st ? st.away_score : g.awayScore, started = done || isLive;
        const home = getTeam(g.home), away = getTeam(g.away), net = networkFor(g.window, home), prime = g.window?.endsWith('night');
        const coach = teamId && (g.home === teamId || g.away === teamId);
        return (
          <li key={g.id} className={`lw-game ${isLive ? 'live' : g.status}${prime ? ' prime' : ''} click`} style={{ '--away': away?.color, '--home': home?.color }}
            onClick={() => { window.location.hash = links.game(g.id); }}>
            <div className="lw-top">
              <span>{g.time}{net ? ` · ${net}` : ''}</span>
              <span className="lw-status">{done ? 'Final' : isLive ? <span className="lw-live"><i className="live-pulse" />Live{st ? ` · ${quarterText(st.quarter)} ${clockText(clockLeft(st))}` : ''}</span>
                : prime ? `⭐ ${windowLabel(g.window)}` : windowLabel(g.window)}</span>
            </div>
            <Side id={g.away} score={started ? as : null} won={as > hs} rec={rec} done={done} tag="Away" />
            <Side id={g.home} score={started ? hs : null} won={hs > as} rec={rec} done={done} tag="Home" />
            <small className="lw-at">🏟️ {stadiums[g.home]?.name || home?.name}{isRivalry(g, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}</small>
            {coach && isLive && <a className="btn small lw-join" href={links.coaching(g.id)} onClick={(e) => e.stopPropagation()}>🎧 Join coaching room</a>}
          </li>
        );
      })}
    </ol>
  );
}
