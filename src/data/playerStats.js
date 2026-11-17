// A player's saved game stats for a season: every final game's line plus the season totals (sums; longest plays use the max).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { LONGS } from '../lib/simStats.js';

export function addUp(rows) {
  const out = {};
  rows.forEach((r) => Object.entries(r).forEach(([k, n]) => { out[k] = LONGS.has(k) ? Math.max(out[k] || 0, n) : (out[k] || 0) + n; }));
  return out;
}

// Returns { games: [{ game_id, week, team_id, stats }], total } or null while loading.
export function usePlayerSeasonStats(playerId, season) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    if (!playerId || DEMO) { setState({ games: [], total: {} }); return undefined; }
    setState(null);
    const load = () => db.from('player_game_stats').select('game_id, week, team_id, stats').eq('player_id', playerId).eq('season', season).order('week')
      .then(({ data }) => { if (live) setState({ games: data || [], total: addUp((data || []).map((g) => g.stats)) }); });
    load();
    window.addEventListener('mfl-games-changed', load);
    return () => { live = false; window.removeEventListener('mfl-games-changed', load); };
  }, [playerId, season]);
  return state;
}
