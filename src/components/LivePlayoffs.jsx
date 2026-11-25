import React, { useMemo, useState } from 'react';
import LiveWeekGames from './LiveWeekGames.jsx';
import PlayoffBracket from './PlayoffBracket.jsx';
import { useLiveSeason } from '../data/liveSeason.js';
import { useCraftBowlPlan, logoSrc, roman } from '../data/craftBowlPlans.js';
import { trophyImg } from '../data/craftBowls.js';
import { useStadiums } from '../data/stadiums.js';
import { currentSeason, currentWeek, getTeams, getTeam } from '../data/teams.js';
import { records } from '../lib/seasonStats.js';
import { playoffSeeds } from '../lib/playoffSeeds.js';
import { ROUNDS, roundOfWeek } from '../lib/playoffRounds.js';
import { DEMO_PLAY } from '../data/playoffDemo.js';

// Live during the playoffs (after the award ceremony): the round as the big heading with tabs for every round, that round's
// games (the same cards as a regular week, each team tagged with its seed), then the bracket filling in. Craft Bowl week
// puts this season's Craft Bowl logo, colors and host stadium on top.
export default function LivePlayoffs({ canControl, teamId }) {
  const season = useLiveSeason(), plan = useCraftBowlPlan(currentSeason()), stadiums = useStadiums();
  const now = roundOfWeek(DEMO_PLAY || currentWeek()) || ROUNDS[0];
  const [sel, setSel] = useState(null);
  const round = ROUNDS.find((r) => r.week === (sel ?? now.week)) || now;
  const rounds = season.playoffs || [];
  const games = rounds.find((r) => r.kind === round.kind)?.games || [];
  const rec = useMemo(() => records(season.weeks), [season]);
  const seedOf = useMemo(() => Object.fromEntries(Object.values(playoffSeeds(getTeams(), rec)).flat().map((s) => [s.id, s.seed])), [rec]);
  const bowl = round.kind === 'craft_bowl', host = plan?.stadium && getTeam(plan.stadium);
  const done = games.filter((g) => g.status === 'final').length;
  return (
    <div className={`live-season live-playoffs${bowl ? ' is-bowl' : ''}`} style={{ '--cb1': plan?.primary || '#19c26b', '--cb2': plan?.secondary || '#0a3d2c' }}>
      <header className="ls-top lp-top">
        <small className="ls-live"><span className="live-pulse" /> Live · Season {currentSeason()} Playoffs</small>
        {bowl && <img className="lp-bowl" src={logoSrc(plan?.logo) || trophyImg()} alt={`Craft Bowl ${roman(currentSeason())}`} />}
        <h2 className="lp-round">{bowl ? `Craft Bowl ${roman(currentSeason())}` : `${round.icon} ${round.name}`}</h2>
        {bowl && <small className="lp-host">📍 {host ? stadiums[host.id]?.name || host.name : 'Stadium to be picked'} · neutral site</small>}
        <nav className="lp-tabs">
          {ROUNDS.map((r) => {
            const set = rounds.some((x) => x.kind === r.kind);
            return <button key={r.kind} className={r.kind === round.kind ? 'on' : ''} disabled={!set} onClick={() => setSel(r.week)}>{r.icon} {r.name}{r.week === now.week ? ' · now' : ''}</button>;
          })}
        </nav>
        <div className="ls-sub">{games.length > 0 && <span>{done} played · {games.length - done} left</span>}</div>
      </header>
      {games.length ? <LiveWeekGames week={{ week: round.week, games }} rec={rec} teamId={teamId} canControl={canControl} seedOf={seedOf} />
        : <p className="dim">The {round.name} {bowl ? 'is' : 'are'} set once the round before is done.</p>}
      <PlayoffBracket rec={rec} settled rounds={rounds} />
    </div>
  );
}
