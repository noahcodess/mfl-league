import React from 'react';
import TeamWall from '../components/TeamWall.jsx';
import { getTeams, currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { useOpenTeams } from '../data/openTeams.js';
import { leagueLogo } from '../data/logos.js';
import { links } from '../lib/router.js';

// Front door for visitors: "Play MFL", how many teams are open, every team, and how to join.
export default function HomePage({ signedIn }) {
  const teams = getTeams();
  const openIds = useOpenTeams();
  return (
    <div className="home">
      <section className="hero">
        <img className="hero-logo" src={leagueLogo.light} alt="MFL" />
        <div className="hero-text">
          <div className="hero-kicker">Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}</div>
          <h1 className="hero-title">PLAY MFL</h1>
          <p className="hero-tag">A virtual football league. Real coaches, simulated games, streamed live every week.</p>
          <div className="hero-open">
            <span className="open-count">{openIds ? openIds.length : '…'}</span>
            <span>{openIds && openIds.length === 1 ? 'team open' : 'teams open'}</span>
          </div>
          <div className="hero-actions">
            {!signedIn && <a className="btn" href={links.login}>Coach log in</a>}
            <a className="btn ghost" href={links.league}>Browse the league</a>
          </div>
        </div>
      </section>
      <section className="card join">
        <h3>How to join</h3>
        <ol className="join-steps">
          <li><b>Pick an open team</b><span>Any team tagged OPEN below is free to claim.</span></li>
          <li><b>Ask the commissioner</b><span>Message him on Discord. He sets up your login and gives you a temporary password.</span></li>
          <li><b>Run your franchise</b><span>Set your depth chart, sign players, make trades and call key plays on game day.</span></li>
        </ol>
      </section>
      <TeamWall teams={teams} openIds={openIds} />
    </div>
  );
}
