// A final game's saved box: the result row (team totals, scoring plays) and every player's line from player_game_stats.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

// Returns { result, rows } once loaded, null while loading, or { result: null, rows: [] } when nothing was saved.
export function useGameBox(gameId, final) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    let live = true;
    if (!final || DEMO) { setBox({ result: null, rows: [] }); return undefined; }
    Promise.all([
      db.from('game_results').select('*').eq('game_id', Number(gameId)).maybeSingle(),
      db.from('player_game_stats').select('player_id, team_id, stats').eq('game_id', Number(gameId)),
    ]).then(([a, b]) => { if (live) setBox({ result: a.data || null, rows: b.data || [] }); });
    return () => { live = false; };
  }, [gameId, final]);
  return box;
}
