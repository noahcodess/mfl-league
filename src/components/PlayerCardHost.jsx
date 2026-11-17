import React, { useEffect, useState } from 'react';
import PlayerModal from './PlayerModal.jsx';
import { usePotentials } from '../data/potentials.js';
import { usePlayerTraits } from '../data/traits.js';
import { getTeam } from '../data/teams.js';

// Listens for "open this player's card" from anywhere and shows the full card. Potential only shows if this person may see it (own team, commissioner, scouted).
const FREE = { name: 'Free agent', color: '#3a3f47', accent: '#9aa4b2' };

export default function PlayerCardHost({ viewer }) {
  const [open, setOpen] = useState(null);
  const key = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}` : null;
  const potentials = usePotentials(open ? key : null);
  const traits = usePlayerTraits(open ? key : null, open?.teamId);
  useEffect(() => {
    const on = (e) => setOpen(e.detail || null);
    window.addEventListener('mfl-card', on);
    return () => window.removeEventListener('mfl-card', on);
  }, []);
  if (!open) return null;
  const team = getTeam(open.teamId) || FREE;
  const boss = viewer?.role === 'commissioner' || !!viewer?.site_owner;
  const scouted = potentials.map[open.id] != null;
  const canSee = boss || (viewer?.team_id && viewer.team_id === open.teamId) || scouted;
  return <PlayerModal player={open} team={team} canSeePotential={canSee} myTeamId={viewer?.role === 'coach' ? viewer.team_id : null}
    potential={canSee ? (potentials.loaded ? (potentials.map[open.id] ?? null) : undefined) : null} traits={traits[open.id]} onClose={() => setOpen(null)} />;
}
