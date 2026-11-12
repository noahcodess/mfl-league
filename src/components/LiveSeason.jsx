import React, { useMemo, useState } from 'react';
import LiveWeekGames from './LiveWeekGames.jsx';
import WeekStars from './WeekStars.jsx';
import ConfStandings from './ConfStandings.jsx';
import { useLiveSeason } from '../data/liveSeason.js';
import { records } from '../lib/seasonStats.js';

const PLAYOFFS_FROM = 6;

// Live during the regular season: week tabs 1 to 12 (the current one marked), that week's games with times and scores, the week's
// top players and the standings. From Week 6 a Playoffs button appears (the bracket comes later).
export default function LiveSeason({ preview }) {
  const season = useLiveSeason(preview);
  const [sel, setSel] = useState(null);
  const rec = useMemo(() => records(season.weeks), [season]);
  const view = sel ?? season.current;
  const week = season.weeks[(view === 'playoffs' ? season.current : view) - 1];
  const count = (s) => week.games.filter((g) => g.status === s).length;
  return (
    <div className="live-season">
      {season.sample && <p className="ls-sample">🧪 Sample season: scores and stats are made up until the game engine is in. The layout is final.</p>}
      <nav className="ls-weeks">
        {season.weeks.map((w) => (
          <button key={w.week} className={`${view === w.week ? 'on' : ''}${w.week === season.current ? ' now' : ''}${w.week < season.current ? ' past' : ''}`} onClick={() => setSel(w.week)}>
            <small>Week</small>{w.week}
          </button>
        ))}
        {season.current >= PLAYOFFS_FROM && <button className={`ls-playoffs${view === 'playoffs' ? ' on' : ''}`} onClick={() => setSel('playoffs')}>🏆 Playoffs</button>}
      </nav>
      {view === 'playoffs' ? (
        <section className="card ls-soon"><h2>🏆 Playoffs</h2><p>The playoff picture and bracket will show here. Coming soon.</p></section>
      ) : (
        <div className="ls-grid">
          <section>
            <h2 className="ls-head">Week {week.week}{week.week === season.current && <span className="ls-tag">This week</span>}</h2>
            <p className="dim">{week.games.length ? `${count('final')} final · ${count('live')} live · ${count('upcoming')} upcoming` : 'No games scheduled for this week yet.'}</p>
            <LiveWeekGames week={week} rec={rec} />
          </section>
          <aside className="ls-side">
            <WeekStars week={week} />
            <ConfStandings rec={rec} />
          </aside>
        </div>
      )}
    </div>
  );
}
