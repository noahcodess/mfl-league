// Loads what the game engine needs to line two teams up: every player's ratings and archetype plus his injury ratings,
// then builds both lineups and kick teams. Works offline in demo mode with stand-in ratings.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getTeam } from './teams.js';
import { getPlayers } from './players.js';
import { buildLineup } from '../lib/simLineup.js';
import { buildKickTeams } from '../lib/simKickTeams.js';

const chunks = (a, n) => a.length ? [a.slice(0, n), ...chunks(a.slice(n), n)] : [];

export async function loadLineups(teamIds) {
  const rosters = teamIds.map((id) => getPlayers(id)), ids = rosters.flat().map((p) => p.id), attrs = {}, inj = {};
  if (!DEMO) {
    await Promise.all(chunks(ids, 150).flatMap((part) => [
      db.from('player_attributes').select('player_id, ratings, style').in('player_id', part).then(({ data }) => (data || []).forEach((r) => { attrs[r.player_id] = r; })),
      db.from('player_injury_ratings').select('player_id, durability, recovery').in('player_id', part).then(({ data }) => (data || []).forEach((r) => { inj[r.player_id] = r; })),
    ]));
  }
  return teamIds.map((id, i) => { const lineup = buildLineup(getTeam(id), rosters[i], attrs, inj); return { ...lineup, kickTeams: buildKickTeams(lineup) }; });
}

// Returns { home, away } lineups, or null while loading.
export function useGameLineups(homeId, awayId) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true; setState(null);
    if (homeId && awayId) loadLineups([homeId, awayId]).then(([home, away]) => { if (live) setState({ home, away }); });
    return () => { live = false; };
  }, [homeId, awayId]);
  return state;
}
