// Loads hidden potentials. The database only hands back rows this person may see (own team, or the unlocked commissioner).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO, demoPotentials } from './demo.js';

// Returns { map, loaded }: map is playerId -> potential for the players this person is allowed to see.
export function usePotentials(viewerKey) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let live = true;
    if (!viewerKey) { setMap(null); return undefined; }
    if (DEMO) { setMap(demoPotentials()); return undefined; }
    db.from('player_potential').select('player_id, potential').then(({ data }) => {
      if (live) setMap(Object.fromEntries((data || []).map((r) => [r.player_id, Number(r.potential)])));
    });
    return () => { live = false; };
  }, [viewerKey]);
  return { map: map || {}, loaded: map !== null };
}
