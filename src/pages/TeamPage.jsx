import React, { useState } from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import RatingChip from '../components/RatingChip.jsx';
import CapBar from '../components/CapBar.jsx';
import Roster from '../components/Roster.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import PickList from '../components/PickList.jsx';
import IssueList from '../components/IssueList.jsx';
import { getTeam, capLimit, currentSeason } from '../data/teams.js';
import { getPlayers, getVacancies, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { getTeamIssues } from '../data/issues.js';
import { links } from '../lib/router.js';

// One team: ratings, cap, roster (click a player for his card), draft picks and any data problems.
export default function TeamPage({ teamId, viewer }) {
  const [open, setOpen] = useState(null);
  const team = getTeam(teamId);
  if (!team) return <p>Team not found. <a href={links.league}>Back to the league</a></p>;
  const players = getPlayers(team.id);
  const issues = getTeamIssues(team.id);
  const isMine = viewer?.team_id === team.id;
  const canSeePotential = isMine || viewer?.role === 'commissioner';
  return (
    <div className="team-page" style={{ '--team': team.color, '--team-accent': team.accent }}>
      {!isMine && <a className="back" href={links.league}>← League</a>}
      <div className="team-head">
        <TeamBadge team={team} size="lg" />
        <div className="team-title">
          <span className="conf-tag">{team.conference} Conference{isMine && ' · Your team'}</span>
          <h1>{team.name}</h1>
          <div className="chips">
            <RatingChip label="Overall" rating={team.overall} />
            <RatingChip label="Offense" rating={team.offense} />
            <RatingChip label="Defense" rating={team.defense} />
          </div>
        </div>
        <CapBar used={teamCapUsed(team.id)} limit={capLimit()} />
      </div>
      <Roster players={players} vacancies={getVacancies(team.id)} team={team} onOpen={setOpen} />
      <div className="two-col">
        <PickList picks={getPicks(team.id)} currentSeason={currentSeason()} />
        <section className="card">
          <h3>Data check</h3>
          <IssueList issues={issues} />
        </section>
      </div>
      <PlayerModal player={open} team={team} canSeePotential={canSeePotential} onClose={() => setOpen(null)} />
    </div>
  );
}
