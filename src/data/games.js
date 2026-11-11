// The regular season schedule: every game with its odds (season_games), saving a generated schedule, and the
// commissioner's tools (order inside a week, kickoff time, Thursday night, swap weeks). Also last season's win %.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getTeams } from './teams.js';
import { makeSchedule } from '../lib/scheduleGen.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return null;
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

const demoGames = () => makeSchedule(getTeams(), {}, (() => { let s = 7; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })())
  .map((g, i) => {
    const p = 0.2 + ((i * 37) % 60) / 100;
    const lop = Math.abs(p - 0.5);
    return { id: i + 1, ...g, slot: null, status: 'scheduled', starts_at: null, prime: null,
      odds: { home_win: p, away_win: 1 - p, rating: lop >= 0.32 ? 'blowout' : lop <= 0.1 ? 'great' : lop <= 0.15 ? 'good' : lop <= 0.25 ? 'okay' : 'bad', keys: [] } };
  });

// Null while loading, then the season's games (week order, then slot).
export function useSeasonGames(season, version = 0) {
  const [games, setGames] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setGames(new URLSearchParams(window.location.search).get('nosched') ? [] : demoGames()); return undefined; }
    db.rpc('season_games', { p_season: season }).then(({ data }) => { if (live) setGames(data || []); });
    return () => { live = false; };
  }, [season, version]);
  return games;
}

// Last finished season's win % by team (for the "better teams play each other a little more" lean).
export async function lastWinPct() {
  if (DEMO) return {};
  const latest = await db.from('team_seasons').select('season').order('season', { ascending: false }).limit(1).maybeSingle();
  if (!latest.data) return {};
  const { data } = await db.from('team_seasons').select('team_id, wins, losses').eq('season', latest.data.season);
  return Object.fromEntries((data || []).map((r) => [r.team_id, r.wins / Math.max(1, r.wins + r.losses)]));
}

export const saveSchedule = (season, games) => rpc('save_season_schedule', { p_season: season, p_games: games.map(({ week, home, away }) => ({ week, home, away })) });
export const setWeekOrder = (season, week, ids) => rpc('set_week_order', { p_season: season, p_week: week, p_ids: ids });
export const setGameTime = (id, atIso) => rpc('set_game_time', { p_game: id, p_at: atIso });
export const setGamePrime = (id, on) => rpc('set_game_prime', { p_game: id, p_on: on });
export const swapWeeks = (season, a, b) => rpc('swap_schedule_weeks', { p_season: season, p_a: a, p_b: b });

export const RATING = {
  great: { label: 'Great', icon: '🔥' }, good: { label: 'Good', icon: '👍' }, okay: { label: 'Okay', icon: '🙂' },
  bad: { label: 'Bad', icon: '😴' }, blowout: { label: 'Blowout', icon: '💥' },
};
