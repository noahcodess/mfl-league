import React, { useState } from 'react';
import DashHero from '../components/DashHero.jsx';
import OffseasonSteps from '../components/OffseasonSteps.jsx';
import ContractWatch from '../components/ContractWatch.jsx';
import PickList from '../components/PickList.jsx';
import ConferenceTable from '../components/ConferenceTable.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import { getTeam, getTeams, capLimit, currentSeason, offseasonStep } from '../data/teams.js';
import { getPlayers, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { usePotentials } from '../data/potentials.js';

// A coach's home: his team in its colors, the offseason road map, contracts to deal with, next draft and his conference.
export default function DashboardPage({ viewer }) {
  const [open, setOpen] = useState(null);
  const team = getTeam(viewer.team_id);
  const potentials = usePotentials(`${viewer.user_id}-${viewer.team_id}`);
  if (!team) return <div className="notice">You don't have a team yet. The commissioner will assign you one.</div>;
  const players = getPlayers(team.id);
  const draftPicks = getPicks(team.id).filter((p) => p.season === currentSeason());
  return (
    <div className="team-page dashboard" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <DashHero team={team} capUsed={teamCapUsed(team.id)} capLimit={capLimit()} coachName={viewer.display_name || viewer.username} />
      <div className="two-col wide-left">
        <OffseasonSteps current={offseasonStep()} />
        <PickList picks={draftPicks} currentSeason={currentSeason()} title={`Season ${currentSeason()} draft`} />
      </div>
      <ContractWatch players={players} team={team} potentials={potentials.map} onOpen={setOpen} />
      <ConferenceTable name={team.conference} teams={getTeams().filter((t) => t.conference === team.conference)} />
      <PlayerModal player={open} team={team} canSeePotential potential={open && potentials.loaded ? (potentials.map[open.id] ?? null) : undefined} onClose={() => setOpen(null)} />
    </div>
  );
}
