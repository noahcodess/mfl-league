// Scouts: how many this team has left (draft and free agency), who it already scouted, and sending one.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.';

export function useMyScouts(viewerKey, version) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    if (!viewerKey) { setState(null); return undefined; }
    if (DEMO) { setState({ draft: 4, fa: 5, scouted: [] }); return undefined; }
    db.rpc('my_scouts').then(({ data }) => { if (live) setState(data || null); });
    return () => { live = false; };
  }, [viewerKey, version]);
  return state;
}

// Returns { left, potential, ceilings }.
export async function scoutPlayer(playerId) {
  if (DEMO) return { left: 3, potential: 4, ceilings: null };
  const { data, error } = await db.rpc('scout_player', { p_player: playerId });
  if (error) throw new Error(clean(error.message));
  return data;
}
