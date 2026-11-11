import React from 'react';
import { links } from '../lib/router.js';
import { currentWeek } from '../data/teams.js';

const VIEWS = {
  resign: { lines: ['Contracts that ended are up for a new deal. Your expiring players are on your team hub.', 'Players who walk become free agents when free agency opens.'],
    link: [links.home, 'Go to my expiring players'] },
  camp: { lines: ['The draft is done and free agency is closed. Rosters are set for the season.', 'The regular season kicks off when the commissioner runs Training camp.'], link: [links.league, 'See every roster'] },
};

// The quieter Live stages: re-signing, training camp, and regular season weeks (games plug in here later).
export default function LiveSimpleView({ stage }) {
  if (stage === 'season') {
    return (
      <section className="card live-simple">
        <b className="live-week">Week {currentWeek() || 1}</b>
        <p>This week's games and scores will show here once games are built. The commissioner moves the league to the next week when every game is played, and the bots make their weekly moves.</p>
        <a className="btn" href={links.trades}>Trades</a>
      </section>
    );
  }
  const v = VIEWS[stage];
  return (
    <section className="card live-simple">
      {v.lines.map((l) => <p key={l}>{l}</p>)}
      <a className="btn" href={v.link[0]}>{v.link[1]}</a>
    </section>
  );
}
