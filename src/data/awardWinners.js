// Every award winner people may see (finished seasons, and this season once its ceremony is over), for the 🏆 tags on
// player cards. Loaded once and shared. Dev: ?demobadge gives every player a couple of trophies.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

let cache = null, loading = null;
async function load() {
  if (DEMO) return /demobadge/.test(window.location.search) ? [{ season: 8, award: 'mvp', id: '*' }, { season: 7, award: 'opoy', id: '*' }] : [];   // any player
  const { data } = await db.rpc('award_winners');
  return data || [];
}

// The awards one player has won: [{ season, award }], newest first.
export function usePlayerAwards(playerId) {
  const [all, setAll] = useState(cache);
  useEffect(() => {
    if (cache) return;
    loading ||= load().then((v) => { cache = v; return v; }).catch(() => []);
    loading.then(setAll);
  }, []);
  return (all || []).filter((w) => w.id === '*' || String(w.id) === String(playerId));
}
