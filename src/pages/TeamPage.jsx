import React, { useState } from 'react';
import TeamBadge from '../components/TeamBadge.jsx';
import TeamTrophies from '../components/TeamTrophies.jsx';
import RatingChip from '../components/RatingChip.jsx';
import CapBar from '../components/CapBar.jsx';
import Roster from '../components/Roster.jsx';
import CoachCard from '../components/CoachCard.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import PickList from '../components/PickList.jsx';
import { getTeam, capLimit, currentSeason } from '../data/teams.js';
import { getPlayers, getVacancies, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { links } from '../lib/router.js';
import { usePotentials } from '../data/potentials.js';
import { usePlayerTraits } from '../data/traits.js';

// One team: ratings, cap, roster (click a player for his card), draft picks and any data problems.
export default function TeamPage({ teamId, viewer }) {
  const [open, setOpen] = useState(null);
  const potentials = usePotentials(viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}` : null);
  const team = getTeam(teamId);
  const traits = usePlayerTraits(viewer ? `${viewer.user_id}-${viewer.role}` : null, teamId);
  if (!team) return <p>Team not found. <a href={links.league}>Back to the league</a></p>;
  const players = getPlayers(team.id);
  const isMine = viewer?.team_id === team.id;
  const canSeePotential = isMine || viewer?.role === 'commissioner' || !!viewer?.site_owner;
  return (
    <div className="team-page" style={{ '--team': team.color, '--team-accent': team.accent }}>
      {!isMine && <a className="back" href={links.league}>← League</a>}
      <div className="team-head">
        <TeamBadge team={team} size="lg" />
        <div className="team-title">
          <span className="conf-tag">{team.conference} Conference{isMine && ' · Your team'}</span>
          <h1>{team.name}</h1>
          <TeamTrophies teamId={team.id} />
          <div className="chips">
            <RatingChip label="Overall" rating={team.overall} />
            <RatingChip label="Offense" rating={team.offense} />
            <RatingChip label="Defense" rating={team.defense} />
          </div>
        </div>
        <CapBar used={teamCapUsed(team.id)} limit={capLimit()} />
      </div>
      <CoachCard team={team} mine={isMine && viewer?.role === 'coach'} />
      <Roster players={players} vacancies={getVacancies(team.id)} team={team} onOpen={setOpen} insider={canSeePotential ? potentials.map : null} />
      <PickList picks={getPicks(team.id)} currentSeason={currentSeason()} />
      <PlayerModal player={open} team={team} myTeamId={viewer?.role === 'coach' ? viewer.team_id : null} canSeePotential={canSeePotential} potential={open && potentials.loaded ? (potentials.map[open.id] ?? null) : undefined} traits={open ? traits[open.id] : null} onClose={() => setOpen(null)} />
    </div>
  );
}
