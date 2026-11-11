import React, { useState } from 'react';
import DashHero from './DashHero.jsx';
import OffseasonSteps from './OffseasonSteps.jsx';
import ContractWatch from './ContractWatch.jsx';
import PickList from './PickList.jsx';
import ConferenceTable from './ConferenceTable.jsx';
import PlayerModal from './PlayerModal.jsx';
import NegotiationModal from './NegotiationModal.jsx';
import ComingUp from './ComingUp.jsx';
import CoachCard from './CoachCard.jsx';
import LockerRoom from './LockerRoom.jsx';
import { getTeam, getTeams, capLimit, currentSeason, offseasonStep, resignOpen } from '../data/teams.js';
import { getPlayers, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { usePotentials } from '../data/potentials.js';
import { usePlayerTraits } from '../data/traits.js';
import { useNegotiations } from '../data/negotiations.js';
import { currentPhase } from '../data/teams.js';

// My Team → Overview: his team in its colors, countdowns to the next league events, the offseason road map, the locker room, contracts to deal with,
// next draft and his conference.
export default function TeamOverview({ viewer, reload }) {
  const [open, setOpen] = useState(null);
  const [talk, setTalk] = useState(null);
  const [version, setVersion] = useState(0);
  const team = getTeam(viewer.team_id);
  const key = `${viewer.user_id}-${viewer.team_id}`;
  const potentials = usePotentials(key);
  const traits = usePlayerTraits(key, viewer.team_id);
  const negotiations = useNegotiations(key, version);
  if (!team) return <div className="notice">You don't have a team yet. The commissioner will assign you one.</div>;
  const players = getPlayers(team.id);
  const draftPicks = getPicks(team.id).filter((p) => p.season === currentSeason());
  return (
    <div className="team-page dashboard" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <DashHero team={team} capUsed={teamCapUsed(team.id)} capLimit={capLimit()} coachName={viewer.display_name || viewer.username} />
      <CoachCard team={team} mine />
      <ComingUp />
      <div className="two-col wide-left">
        <OffseasonSteps current={offseasonStep()} compact />
        <PickList picks={draftPicks} currentSeason={currentSeason()} title={`Season ${currentSeason()} draft`} />
      </div>
      <LockerRoom team={team} players={players} onOpen={setOpen} />
      <ContractWatch players={players} team={team} potentials={potentials.map} traits={traits} negotiations={negotiations} onOpen={setOpen} onNegotiate={setTalk} />
      <ConferenceTable name={team.conference} teams={getTeams().filter((t) => t.conference === team.conference)} />
      <PlayerModal player={open} team={team} myTeamId={viewer.team_id} canSeePotential traits={open ? traits[open.id] : null} potential={open && potentials.loaded ? (potentials.map[open.id] ?? null) : undefined} onClose={() => setOpen(null)} />
      {talk && (
        <NegotiationModal player={talk} team={team} traits={traits[talk.id]} windowOpen={resignOpen()}
          negotiation={negotiations.find((n) => n.player_id === talk.id && ['open', 'agreed', 'walked'].includes(n.status))}
          onClose={() => setTalk(null)} onChanged={() => { setVersion((v) => v + 1); reload?.(); }} />
      )}
    </div>
  );
}
