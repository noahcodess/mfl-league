import React from 'react';
import { useDraftFlags } from '../data/draftFlags.js';

// 👀 Watch: put any player (prospect, free agent, someone on another team) on your private watch list. Coaches only.
export default function WatchButton({ player, myTeamId }) {
  const { flags, toggle } = useDraftFlags(myTeamId);
  if (!myTeamId || !player || player.teamId === myTeamId) return null;
  const on = flags.has(player.id);
  return (
    <div className="watch-btn-row">
      <button className={`btn small ghost watch-btn${on ? ' on' : ''}`} onClick={() => toggle(player.id)}>
        {on ? '👀 On your watch list' : '👀 Add to watch list'}
      </button>
    </div>
  );
}
