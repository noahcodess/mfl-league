import React, { useState } from 'react';
import DashHero from '../components/DashHero.jsx';
import OffseasonSteps from '../components/OffseasonSteps.jsx';
import ContractWatch from '../components/ContractWatch.jsx';
import PickList from '../components/PickList.jsx';
import ConferenceTable from '../components/ConferenceTable.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import NegotiationModal from '../components/NegotiationModal.jsx';
import { getTeam, getTeams, capLimit, currentSeason, offseasonStep, resignOpen } from '../data/teams.js';
import { getPlayers, teamCapUsed } from '../data/players.js';
import { getPicks } from '../data/picks.js';
import { usePotentials } from '../data/potentials.js';
import { usePlayerTraits } from '../data/traits.js';
import { useNegotiations } from '../data/negotiations.js';
import { currentPhase } from '../data/teams.js';

// A coach's home: his team in its colors, the offseason road map, contracts to deal with, next draft and his conference.
export default function DashboardPage({ viewer, reload }) {
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
      <div className="two-col wide-left">
        <OffseasonSteps current={offseasonStep()} compact />
        <PickList picks={draftPicks} currentSeason={currentSeason()} title={`Season ${currentSeason()} draft`} />
      </div>
      <ContractWatch players={players} team={team} potentials={potentials.map} traits={traits} negotiations={negotiations} onOpen={setOpen} onNegotiate={setTalk} />
      <ConferenceTable name={team.conference} teams={getTeams().filter((t) => t.conference === team.conference)} />
      <PlayerModal player={open} team={team} canSeePotential traits={open ? traits[open.id] : null} potential={open && potentials.loaded ? (potentials.map[open.id] ?? null) : undefined} onClose={() => setOpen(null)} />
      {talk && (
        <NegotiationModal player={talk} team={team} traits={traits[talk.id]} windowOpen={resignOpen()}
          negotiation={negotiations.find((n) => n.player_id === talk.id && ['open', 'agreed', 'walked'].includes(n.status))}
          onClose={() => setTalk(null)} onChanged={() => { setVersion((v) => v + 1); reload?.(); }} />
      )}
    </div>
  );
}
