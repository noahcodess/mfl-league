import React from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import RatingChip from '../components/RatingChip.jsx';
import CapBar from '../components/CapBar.jsx';
import DepthChart from '../components/DepthChart.jsx';
import ContractTable from '../components/ContractTable.jsx';
import PickList from '../components/PickList.jsx';
import IssueList from '../components/IssueList.jsx';
import { getTeam, capLimit } from '../data/teams.js';
import { getPlayers, getVacancies, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { getTeamIssues } from '../data/issues.js';
import { links } from '../lib/router.js';

// One team: ratings, cap, depth chart, contracts, draft picks and any data problems.
export default function TeamPage({ teamId }) {
  const team = getTeam(teamId);
  if (!team) return <p>Team not found. <a href={links.league}>Back to teams</a></p>;
  const players = getPlayers(team.id);
  const issues = getTeamIssues(team.id);
  return (
    <div>
      <a className="back" href={links.league}>← All teams</a>
      <div className="team-head" style={{ borderColor: team.color }}>
        <TeamBadge team={team} size="lg" />
        <div className="team-title">
          <h1>{team.name}</h1>
          <div className="chips">
            <RatingChip label="Overall" rating={team.overall} />
            <RatingChip label="Offense" rating={team.offense} />
            <RatingChip label="Defense" rating={team.defense} />
          </div>
        </div>
        <CapBar used={teamCapUsed(team.id)} limit={capLimit()} posted={team.capUsedReported} />
      </div>
      <DepthChart players={players} vacancies={getVacancies(team.id)} />
      <div className="two-col wide-left">
        <ContractTable players={players} />
        <div>
          <PickList picks={getPicks(team.id)} ownCode={team.code} />
          <section className="card">
            <h3>Data check</h3>
            <IssueList issues={issues} />
          </section>
        </div>
      </div>
    </div>
  );
}
