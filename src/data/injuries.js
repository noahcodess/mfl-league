// Injuries saved from finished games: who's hurt, with what, and the week he can play again. Lineups leave injured players
// out (their backups start), and screens can show who's out. Only the commissioner's finished games save them.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { currentSeason, currentWeek } from './teams.js';

// Everyone who can't play this week: { playerId: { label, severity, weeks, return_week, week, type } }.
export async function activeInjuries() {
  if (DEMO) return {};
  const { data } = await db.from('player_injuries').select('player_id, type, label, severity, weeks, week, return_week, games!inner(status)')
    .eq('season', currentSeason()).gt('return_week', Math.max(1, currentWeek())).eq('games.status', 'final');
  const out = {};
  (data || []).forEach((r) => { if (!out[r.player_id] || r.return_week > out[r.player_id].return_week) out[r.player_id] = r; });
  return out;
}

// After a game is final: save its injuries (a re-finalized game replaces its own).
export async function recordInjuries(gameId, injuries = []) {
  if (DEMO || !injuries.length) return null;
  const list = injuries.map((x) => ({ id: x.id, side: x.side, type: x.type, label: x.label, part: x.part, severity: x.severity, weeks: x.weeks }));
  const { data, error } = await db.rpc('game_record_injuries', { p_game: Number(gameId), p_injuries: list });
  if (error) throw new Error(error.message);
  return data;
}

// For a screen: the active injuries (refreshes when asked to with version).
export function useInjuries(version = 0) {
  const [map, setMap] = useState({});
  useEffect(() => { let on = true; activeInjuries().then((m) => on && setMap(m)).catch(() => {}); return () => { on = false; }; }, [version]);
  return map;
}

// "Back Week 7", "Out for the season", "Day to day".
export const returnText = (r) => (!r ? '' : r.return_week >= 999 ? 'Out for the season' : r.weeks === 0 ? 'Day to day' : `Back Week ${r.return_week}`);
