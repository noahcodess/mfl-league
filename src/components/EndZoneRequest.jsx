import React from 'react';
import EndZonePreview from './EndZonePreview.jsx';
import { getTeam } from '../data/teams.js';

// Inbox: the before and after end zones on a coach's end zone change request.
export default function EndZoneRequest({ data }) {
  const team = getTeam(data.team);
  if (!team) return null;
  return (
    <div className="ez-request">
      {data.before && <EndZonePreview team={team} look={data.before} label="Now" />}
      <EndZonePreview team={team} look={{ font: data.font, design: data.design, shadow: data.shadow, shadowColor: data.shadowColor }} label="Asking for" />
    </div>
  );
}
