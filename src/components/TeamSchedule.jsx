import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { useSeasonGames, RATING, networkFor, windowLabel } from '../data/games.js';
import { getTeam, currentSeason, currentPhase } from '../data/teams.js';
import SpecialtyPick from './SpecialtyPick.jsx';
import { useJerseys, useGamePicks } from '../data/jerseys.js';

// A team's 12 games: week, home or away, opponent (and rivalry), broadcast window and network, kickoff (if set), chance to win
// and the matchup rating. On your own team you pick your 2 specialty (alternate uniform) home games here.
export default function TeamSchedule({ teamId, canPick }) {
  const games = useSeasonGames(currentSeason());
  const jerseys = useJerseys(getTeam(teamId));
  const picks = useGamePicks(currentSeason());
  if (!games) return <p className="dim">Loading the schedule...</p>;
  const mine = games.filter((g) => g.kind === 'regular' && (g.home === teamId || g.away === teamId)).sort((a, b) => a.week - b.week);
  if (!mine.length) return <section className="card"><h3>📅 Schedule</h3><p className="dim">The Season {currentSeason()} schedule isn't out yet. The commissioner makes it before the season.</p></section>;
  const open = canPick && currentPhase() === 'offseason';
  const used = mine.filter((g) => g.home === teamId && picks.has(g.id)).length;
  return (
    <section className="card tsched">
      <h3>📅 Season {currentSeason()} schedule <span className="count">12 games</span></h3>
      {canPick && <p className={`sp-note${open ? '' : ' dim'}`}>⭐ <b>Specialty games: {Math.max(0, 2 - used)} of 2 left.</b> {open ? 'Pick 2 home games to wear an alternate uniform. A light alternate puts the visitors in their dark jerseys. Picks lock when the regular season starts.' : 'Picks are made during the preseason.'} Playoff home games: pick as many as you want.</p>}
      <ol>
        {mine.map((g) => {
          const home = g.home === teamId;
          const opp = getTeam(home ? g.away : g.home);
          const p = Math.round((home ? g.odds?.home_win : g.odds?.away_win) * 100);
          const r = RATING[g.odds?.rating] || RATING.okay;
          return (
            <li key={g.id} className={g.prime?.endsWith('night') ? 'prime' : ''} style={{ '--team': opp?.color }}>
              <span className="ts-week">W{g.week}</span>
              <span className="ts-where">{home ? 'vs' : '@'}</span>
              <span className="ts-opp">{opp && <TeamBadge team={opp} size="sm" />}<b>{opp?.name}</b>{g.rivalry && <small className="riv">⚔️ Rivalry</small>}{!g.conference && <small>other conference</small>}</span>
              <span className="ts-when">{g.prime ? `📺 ${windowLabel(g.prime)} · ${networkFor(g.prime, getTeam(g.home))}` : ''}{g.starts_at ? ` ${new Date(g.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
              <span className={`ts-win ${p >= 55 ? 'up' : p <= 45 ? 'down' : ''}`}>{p}%</span>
              <span className={`grating ${g.odds?.rating}`}>{r.icon} {r.label}</span>
              {home && canPick && <SpecialtyPick game={g} jerseys={jerseys} pick={picks.get(g.id)} open={open} left={2 - used} season={currentSeason()} />}
            </li>
          );
        })}
      </ol>
      <p className="dim">Win chances come from your starters lined up against theirs (WR1 vs CB1, tackles vs edge rushers and more), plus home field. They update as rosters change.</p>
    </section>
  );
}
