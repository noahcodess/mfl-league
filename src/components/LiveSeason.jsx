import React, { useMemo, useState } from 'react';
import WeekPicker from './WeekPicker.jsx';
import LiveWeekGames from './LiveWeekGames.jsx';
import WeekStars from './WeekStars.jsx';
import TeamRanks from './TeamRanks.jsx';
import PositionLeaders from './PositionLeaders.jsx';
import ConfStandings from './ConfStandings.jsx';
import { useLiveSeason } from '../data/liveSeason.js';
import { currentSeason } from '../data/teams.js';
import { records, seasonTotals } from '../lib/seasonStats.js';
import { teamStats } from '../lib/teamRanks.js';

// Live during the regular season. One card on top: LIVE · Season N, the week as the big heading (arrows to move) and how
// many of its games are played and left. Then that week's games two across (click yours for the coaching room), players
// of the week, top offenses and defenses, top players at each position, and the standings, all counted through the week
// shown. (The playoff bracket lives on the League tab.)
export default function LiveSeason({ preview, canControl, teamId }) {
  const season = useLiveSeason(preview);
  const [sel, setSel] = useState(null);
  const n = sel ?? season.current, week = season.weeks[n - 1];
  const upTo = useMemo(() => season.weeks.slice(0, n), [season, n]);
  const rec = useMemo(() => records(upTo), [upTo]);
  const stats = useMemo(() => teamStats(upTo), [upTo]);
  const totals = useMemo(() => seasonTotals(upTo), [upTo]);
  const count = (st) => week.games.filter((g) => g.status === st).length, live = count('live');
  return (
    <div className="live-season">
      {season.sample && <p className="ls-sample">🧪 Sample season: scores and stats are made up until the game engine is in.</p>}
      <header className="ls-top">
        <small className="ls-live"><span className="live-pulse" /> Live · Season {currentSeason()}</small>
        <WeekPicker week={n} max={season.weeks.length} current={season.current} onGo={setSel} />
        <div className="ls-sub">
          {n === season.current ? <span className="ls-tag">This week</span> : <button className="ls-back" onClick={() => setSel(season.current)}>↩ Back to Week {season.current}</button>}
          {week.games.length > 0 && <span>{count('final')} played{live ? ` · ${live} live` : ''} · {count('upcoming')} left</span>}
        </div>
      </header>
      <LiveWeekGames week={week} rec={rec} teamId={teamId} />
      <div className="ls-cards">
        <WeekStars week={week} />
        <TeamRanks stats={stats} kind="offense" through={n} />
        <TeamRanks stats={stats} kind="defense" through={n} />
        <PositionLeaders totals={totals} through={n} />
        <ConfStandings rec={rec} through={n} />
      </div>
    </div>
  );
}
