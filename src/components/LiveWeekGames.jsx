import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { networkFor } from '../data/games.js';
import { broadcastFor } from '../data/broadcast.js';
import { getTeam, currentSeason } from '../data/teams.js';
import { recordText } from '../lib/seasonStats.js';
import { useStadiums } from '../data/stadiums.js';
import { links } from '../lib/router.js';
import { useRivals, isRivalry } from '../data/liveSeason.js';
import { useGameStates, clockLeft, gameClockText, quarterText, finalText } from '../data/gameState.js';
import { useCraftBowlPlan } from '../data/craftBowlPlans.js';

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
// the two coaches get a Join coaching room button. Click any card to open the game; your own game this week (not played
// yet) opens your coaching room, unless you can run games (the commissioner, or the owner while testing): then every card
// opens the game page (start, sim, watch) and your own game gets its coaching room button instead. In the playoffs (seedOf =
// id -> seed) each team shows its seed, and the Craft Bowl is at this season's host stadium.
export default function LiveWeekGames({ week, rec, teamId, canControl = false, seedOf = null }) {
  const stadiums = useStadiums(), rivals = useRivals(), states = useGameStates(week.games.map((g) => String(g.id))), plan = useCraftBowlPlan(currentSeason());
  if (!week.games.length) return <p className="dim">No games scheduled for this week yet.</p>;
  return (
    <ol className="lw-games">
      {week.games.map((g) => {
        const st = states[String(g.id)], isLive = st?.status === 'live' || g.status === 'live', done = g.status === 'final' || st?.status === 'final';
        const hs = st ? st.home_score : g.homeScore, as = st ? st.away_score : g.awayScore, started = done || isLive;
        const home = getTeam(g.home), away = getTeam(g.away), net = networkFor(g.window, home), bc = net && broadcastFor(g, home), prime = !!bc?.prime;
        const coach = teamId && (g.home === teamId || g.away === teamId), bowl = g.kind === 'craft_bowl', host = bowl && plan?.stadium ? plan.stadium : g.home;
        const tag = (id, side) => (seedOf?.[id] ? `#${seedOf[id]} seed${bowl ? '' : ` · ${side}`}` : side);
        return (
          <li key={g.id} className={`lw-game ${isLive ? 'live' : g.status}${prime ? ' prime' : ''} click`} style={{ '--away': away?.color, '--home': home?.color }}
            onClick={() => { window.location.hash = coach && !done && !canControl ? links.coaching(g.id) : links.game(g.id); }} title={coach && !done && !canControl ? 'Your game: open the coaching room' : undefined}>
            <div className="lw-top">
              <span className="lw-when">{g.time}{bc && <span className={`lw-prog net-${bc.net.key}${bc.prime ? ` show-${bc.show.key}` : ''}`} title={bc.title}><img src={bc.logo} alt={bc.title} />{!bc.prime && <b>Day game</b>}</span>}</span>
              <span className="lw-status">{done ? finalText(st?.quarter) : isLive ? <span className="lw-live"><i className="live-pulse" />Live{st ? ` · ${quarterText(st.quarter)} ${gameClockText(st.quarter, clockLeft(st))}` : ''}</span>
                : ''}</span>
            </div>
            <Side id={g.away} score={started ? as : null} won={as > hs} rec={rec} done={done} tag={tag(g.away, 'Away')} />
            <Side id={g.home} score={started ? hs : null} won={hs > as} rec={rec} done={done} tag={tag(g.home, 'Home')} />
            <small className="lw-at">🏟️ {stadiums[host]?.name || getTeam(host)?.name}{isRivalry(g, rivals) && <span className="rival-badge">⚔️ Rivalry</span>}</small>
            {coach && (isLive || (canControl && !done)) && <a className="btn small lw-join" href={links.coaching(g.id)} onClick={(e) => e.stopPropagation()}>🎧 Join coaching room</a>}
          </li>
        );
      })}
    </ol>
  );
}
