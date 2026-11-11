import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { useSeasonGames, RATING } from '../data/games.js';
import { getTeam, currentSeason } from '../data/teams.js';

// A team's 12 games: week, home or away, opponent, kickoff (if set), Thursday night, chance to win and the game rating.
export default function TeamSchedule({ teamId }) {
  const games = useSeasonGames(currentSeason());
  if (!games) return <p className="dim">Loading the schedule...</p>;
  const mine = games.filter((g) => g.home === teamId || g.away === teamId).sort((a, b) => a.week - b.week);
  if (!mine.length) return <section className="card"><h3>📅 Schedule</h3><p className="dim">The Season {currentSeason()} schedule isn't out yet. The commissioner makes it before the season.</p></section>;
  return (
    <section className="card tsched">
      <h3>📅 Season {currentSeason()} schedule <span className="count">12 games</span></h3>
      <ol>
        {mine.map((g) => {
          const home = g.home === teamId;
          const opp = getTeam(home ? g.away : g.home);
          const p = Math.round((home ? g.odds?.home_win : g.odds?.away_win) * 100);
          const r = RATING[g.odds?.rating] || RATING.okay;
          return (
            <li key={g.id} className={g.prime ? 'prime' : ''} style={{ '--team': opp?.color }}>
              <span className="ts-week">W{g.week}</span>
              <span className="ts-where">{home ? 'vs' : '@'}</span>
              <span className="ts-opp">{opp && <TeamBadge team={opp} size="sm" />}<b>{opp?.name}</b>{!g.conference && <small>other conference</small>}</span>
              <span className="ts-when">{g.prime ? '🌙 Thursday night' : ''}{g.starts_at ? ` ${new Date(g.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}</span>
              <span className={`ts-win ${p >= 55 ? 'up' : p <= 45 ? 'down' : ''}`}>{p}%</span>
              <span className={`grating ${g.odds?.rating}`}>{r.icon} {r.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="dim">Win chances come from your starters lined up against theirs (WR1 vs CB1, tackles vs edge rushers and more), plus home field. They update as rosters change.</p>
    </section>
  );
}
