import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { useSeasonGames, RATING, networkFor, windowLabel } from '../data/games.js';
import { getTeam, currentSeason } from '../data/teams.js';
import { weekNow } from '../data/liveSeason.js';
import SpecialtyPick from './SpecialtyPick.jsx';
import { useJerseys, useGamePicks, fansDressed } from '../data/jerseys.js';

// A team's 12 games, each a little scorecard: the visitors' logo @ the home team's logo, the opponent (and rivalry), the
// broadcast window and kickoff, then W or L and the score once it's played (the matchup rating before). On your own team
// you pick your 2 specialty (alternate uniform) home games here.
export default function TeamSchedule({ teamId, canPick }) {
  const games = useSeasonGames(currentSeason());
  const jerseys = useJerseys(getTeam(teamId));
  const picks = useGamePicks(currentSeason());
  if (!games) return <p className="dim">Loading the schedule...</p>;
  const mine = games.filter((g) => g.kind === 'regular' && (g.home === teamId || g.away === teamId)).sort((a, b) => a.week - b.week);
  if (!mine.length) return <section className="card"><h3>📅 Schedule</h3><p className="dim">The Season {currentSeason()} schedule isn't out yet. The commissioner makes it before the season.</p></section>;
  const open = canPick, wk = weekNow(games);   // picks stay open all season; a game whose week has passed (or that started) is locked
  const used = mine.filter((g) => g.home === teamId && picks.has(g.id)).length;
  return (
    <section className="card tsched">
      <h3>📅 Season {currentSeason()} schedule <span className="count">12 games</span></h3>
      {canPick && <p className={`sp-note${open ? '' : ' dim'}`}>⭐ <b>Specialty games: {Math.max(0, 2 - used)} of 2 left.</b> Pick 2 home games to wear an alternate uniform, any time before that game's week. A light alternate puts the visitors in their dark jerseys. You can also dress every fan in that color. Once a game's week has passed, its pick is locked. Playoff home games: pick as many as you want.</p>}
      <ol>
        {mine.map((g) => {
          const home = g.home === teamId;
          const opp = getTeam(home ? g.away : g.home), done = g.status === 'final';
          const mine2 = home ? g.home_score : g.away_score, theirs = home ? g.away_score : g.home_score, won = done && mine2 > theirs;
          const r = RATING[g.odds?.rating] || RATING.okay;
          return (
            <li key={g.id} className={g.prime?.endsWith('night') ? 'prime' : ''} style={{ '--team': opp?.color }}>
              <span className="ts-week">W{g.week}</span>
              <span className="ts-card"><TeamBadge team={getTeam(g.away)} size="sm" /><i>@</i><TeamBadge team={getTeam(g.home)} size="sm" /></span>
              <span className="ts-opp"><b>{home ? 'vs' : '@'} {opp?.name}</b>{g.rivalry && <small className="riv">⚔️ Rivalry</small>}{!g.conference && <small>other conference</small>}</span>
              <span className="ts-when">{g.prime ? `📺 ${windowLabel(g.prime)} · ${networkFor(g.prime, getTeam(g.home))}` : ''}{g.starts_at ? ` ${new Date(g.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
              {done ? <span className={`ts-result ${won ? 'w' : 'l'}`}><b>{won ? 'W' : 'L'}</b> {mine2}-{theirs}</span> : <span className={`grating ${g.odds?.rating}`}>{r.icon} {r.label}</span>}
              {home && canPick && <SpecialtyPick game={g} jerseys={jerseys} pick={picks.get(g.id)} fans={fansDressed(g.id)} open={open && !done && g.week >= wk} left={2 - used} season={currentSeason()} taken={g.kind === 'regular' ? mine.filter((x) => x.home === teamId && x.id !== g.id && x.kind === 'regular').map((x) => picks.get(x.id)).filter(Boolean) : []} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
