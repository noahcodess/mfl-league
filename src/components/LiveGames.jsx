import React, { useEffect, useState } from 'react';
import GameOdds from './GameOdds.jsx';
import GameUniforms from './GameUniforms.jsx';
import { useSeasonGames, networkFor, windowLabel } from '../data/games.js';
import { currentSeason, currentWeek, getTeam } from '../data/teams.js';
import { untilText } from '../data/schedule.js';

// Live during the preseason (the commissioner's one-off games) or a regular season week: each game with its broadcast
// window and network, a countdown to kickoff once the commissioner sets one, and the matchup odds.
export default function LiveGames({ kind }) {
  const games = useSeasonGames(currentSeason());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!games) return <p className="dim">Loading games...</p>;
  const week = currentWeek() || 1;
  const list = games.filter((g) => (kind === 'preseason' ? g.kind === 'preseason' : g.kind === 'regular' && g.week === week));
  if (!list.length) {
    return (
      <section className="card live-simple">
        <p>{kind === 'preseason' ? "The commissioner hasn't set any preseason matchups." : `The Season ${currentSeason()} schedule isn't out yet.`}</p>
        <p className="dim">{kind === 'preseason' ? 'Preseason games are optional. The regular season starts when the commissioner runs Training camp.' : 'The commissioner makes the schedule from the Commissioner\'s Desk.'}</p>
      </section>
    );
  }
  return (
    <section className="live-games">
      <h2>{kind === 'preseason' ? '🏟️ Preseason games' : `🏈 Week ${week}`}</h2>
      <ol>
        {list.map((g) => {
          const left = g.starts_at ? Date.parse(g.starts_at) - now : null;
          const net = networkFor(g.prime, getTeam(g.home));
          return (
            <li key={g.id} className={g.prime?.endsWith('night') ? 'prime' : ''}>
              <div className="lg-top">
                <span className="lg-window">{g.prime ? `📺 ${windowLabel(g.prime)}${net ? ` · ${net}` : ''}` : '📺 Broadcast to be set'}</span>
                <span className="lg-clock">{g.status === 'final' ? `Final: ${g.away_score}-${g.home_score}` : left == null ? 'Kickoff time to be set' : left > 0 ? `Kickoff in ${untilText(left)}` : '🔴 Game time'}</span>
              </div>
              <GameOdds game={g} />
              <GameUniforms game={g} />
            </li>
          );
        })}
      </ol>
      <p className="dim">Game day: the commissioner plays or sims each game here and can share his screen to call it live.</p>
    </section>
  );
}
