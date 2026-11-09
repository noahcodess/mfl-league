import React from 'react';

// Colored team code chip. Swapped for real logos once the league sends them.
export default function TeamBadge({ team, size = 'md' }) {
  return (
    <span className={`badge badge-${size}`} style={{ background: team.color, color: team.accent }}>
      {team.code}
    </span>
  );
}
