import React, { useMemo, useState } from 'react';
import WeekPicker from './WeekPicker.jsx';
import LiveWeekGames from './LiveWeekGames.jsx';
import WeekStars from './WeekStars.jsx';
import TeamRanks from './TeamRanks.jsx';
import PositionLeaders from './PositionLeaders.jsx';
import ConfStandings from './ConfStandings.jsx';
import { useLiveSeason } from '../data/liveSeason.js';
import { records, seasonTotals } from '../lib/seasonStats.js';
import { teamStats } from '../lib/teamRanks.js';

const PLAYOFFS_FROM = 6;

// Live during the regular season: the week as the big heading (arrows to move), that week's games two across, then players of
// the week, top offenses and defenses, top players at each position, and the standings (all counted through the week shown).
// From Week 6 a Playoffs button appears (the bracket comes later).
export default function LiveSeason({ preview, canControl }) {
  const season = useLiveSeason(preview);
  const [sel, setSel] = useState(null);
  const view = sel ?? season.current, playoffs = view === 'playoffs';
  const n = playoffs ? season.current : view, week = season.weeks[n - 1];
  const upTo = useMemo(() => season.weeks.slice(0, n), [season, n]);
  const rec = useMemo(() => records(upTo), [upTo]);
  const stats = useMemo(() => teamStats(upTo), [upTo]);
  const totals = useMemo(() => seasonTotals(upTo), [upTo]);
  const count = (s) => week.games.filter((g) => g.status === s).length;
  return (
    <div className="live-season">
      {season.sample && <p className="ls-sample">🧪 Sample season: scores and stats are made up until the game engine is in.</p>}
      <header className="ls-top">
        <WeekPicker week={n} max={season.weeks.length} current={season.current} onGo={setSel} />
        <div className="ls-sub">
          {n === season.current ? <span className="ls-tag">This week</span> : <button className="ls-back" onClick={() => setSel(season.current)}>↩ Back to Week {season.current}</button>}
          {week.games.length > 0 && <span>{count('final')} final · {count('live')} live · {count('upcoming')} upcoming</span>}
          {season.current >= PLAYOFFS_FROM && <button className={`ls-playoffs${playoffs ? ' on' : ''}`} onClick={() => setSel(playoffs ? season.current : 'playoffs')}>🏆 Playoffs</button>}
        </div>
      </header>
      {playoffs ? (
        <section className="lv-card ls-soon"><h2>🏆 Playoffs</h2><p className="dim">The playoff picture and bracket will show here. Coming soon.</p></section>
      ) : (
        <>
          <LiveWeekGames week={week} rec={rec} clickable={canControl} />
          <div className="ls-cards">
            <WeekStars week={week} />
            <TeamRanks stats={stats} kind="offense" through={n} />
            <TeamRanks stats={stats} kind="defense" through={n} />
            <PositionLeaders totals={totals} through={n} />
            <ConfStandings rec={rec} through={n} />
          </div>
        </>
      )}
    </div>
  );
}
