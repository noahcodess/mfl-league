import React from 'react';

// Team logo, or a colored code chip if the team has no logo yet.
export default function TeamBadge({ team, size = 'md' }) {
  if (team.logo) return <img className={`logo logo-${size}`} src={team.logo} alt={`${team.name} logo`} />;
  return (
    <span className={`badge badge-${size}`} style={{ background: team.color, color: team.accent }}>
      {team.code}
    </span>
  );
}
