import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import RatingChip from './RatingChip.jsx';
import CapBar from './CapBar.jsx';
import { links } from '../lib/router.js';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';

// Top of the coach dashboard: logo, team name and ratings in team colors, where the league is, and cap space.
export default function DashHero({ team, capUsed, capLimit, coachName }) {
  return (
    <div className="team-head dash-hero">
      <TeamBadge team={team} size="lg" />
      <div className="team-title">
        <span className="conf-tag">Welcome back{coachName ? `, ${coachName}` : ''} · Season {currentSeason()} {PHASE_NAMES[currentPhase()]}</span>
        <h1>{team.name}</h1>
        <div className="chips">
          <RatingChip label="Overall" rating={team.overall} />
          <RatingChip label="Offense" rating={team.offense} />
          <RatingChip label="Defense" rating={team.defense} />
        </div>
        <div className="dash-links">
          <a className="btn small" href={links.team(team.id)}>Roster &amp; depth chart</a>
          <a className="btn small ghost" href={links.league}>League</a>
        </div>
      </div>
      <CapBar used={capUsed} limit={capLimit} />
    </div>
  );
}
