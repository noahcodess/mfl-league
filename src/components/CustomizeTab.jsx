import React from 'react';
import UniformsTab from './UniformsTab.jsx';
import EndZoneCustomizer from './EndZoneCustomizer.jsx';
import { getTeam } from '../data/teams.js';

// My Team → Customize: everything a team can change about how it looks. Uniforms, then end zones. Every change is a request.
export default function CustomizeTab({ teamId }) {
  const team = getTeam(teamId);
  if (!team) return null;
  return (
    <div className="customize">
      <UniformsTab teamId={teamId} />
      <EndZoneCustomizer team={team} />
    </div>
  );
}
