// Loads hidden potentials. The database only hands back rows this person may see (own team, or the unlocked commissioner).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO, demoPotentials } from './demo.js';

export function usePotentials(viewerKey) {
  const [map, setMap] = useState({});
  useEffect(() => {
    let live = true;
    if (!viewerKey) { setMap({}); return undefined; }
    if (DEMO) { setMap(demoPotentials()); return undefined; }
    db.from('player_potential').select('player_id, potential').then(({ data }) => {
      if (live) setMap(Object.fromEntries((data || []).map((r) => [r.player_id, Number(r.potential)])));
    });
    return () => { live = false; };
  }, [viewerKey]);
  return map;
}
