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
    const rival = [['snm', 'void'], ['edc', 'snm'], ['edc', 'void']].some(([x, y]) => (g.home === x && g.away === y) || (g.home === y && g.away === x));
    return { id: i + 1, ...g, kind: 'regular', rivalry: rival, slot: null, status: 'scheduled', starts_at: null, prime: i % 8 === 7 ? 'sun_night' : null,
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
export const setGameWindow = (id, win) => rpc('set_game_window', { p_game: id, p_window: win || null });
export const setWeekWindows = (season, week, ids, windows) => rpc('set_week_windows', { p_season: season, p_week: week, p_ids: ids, p_windows: windows });
export const createPreseason = (home, away, atIso, win) => rpc('create_preseason_game', { p_home: home, p_away: away, p_at: atIso || null, p_window: win || null });
export const deletePreseason = (id) => rpc('delete_preseason_game', { p_game: id });

// Rivalries: [{ id, team_a, team_b, name }].
export function useRivalries(version = 0) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setRows([{ id: 1, team_a: 'snm', team_b: 'void' }, { id: 2, team_a: 'edc', team_b: 'snm' }, { id: 3, team_a: 'edc', team_b: 'void' }]); return undefined; }
    db.from('rivalries').select('*').order('id').then(({ data }) => { if (live) setRows(data || []); });
    return () => { live = false; };
  }, [version]);
  return rows;
}
export async function rivalPairs() {
  if (DEMO) return [['snm', 'void'], ['edc', 'snm'], ['edc', 'void']];
  const { data } = await db.from('rivalries').select('team_a, team_b');
  return (data || []).map((r) => [r.team_a, r.team_b]);
}
export const addRivalry = (a, b, name) => rpc('add_rivalry', { p_a: a, p_b: b, p_name: name || null });
export const removeRivalry = (id) => rpc('remove_rivalry', { p_id: id });

// Broadcast windows, in the order they air. Night windows hold one game a week. Day games go to FOX or CBS by the
// home team's conference. (Network logos and broadcast graphics come later.)
export const WINDOWS = [
  ['thu_night', 'Thursday Night Football', 'NBC'], ['sat_day', 'Saturday day game', null], ['sat_night', 'Saturday Night Football', 'ESPN'],
  ['sun_day', 'Sunday day game', null], ['sun_night', 'Sunday Night Football', 'NBC'], ['mon_night', 'Monday Night Football', 'ESPN'],
];
export function networkFor(win, homeTeam) {
  const w = WINDOWS.find(([k]) => k === win);
  if (!w) return null;
  return w[2] || (homeTeam?.conference === 'Overworld' ? 'FOX' : 'CBS');
}
export const windowLabel = (win) => WINDOWS.find(([k]) => k === win)?.[1] || null;
// Best game of the week → Sunday night, then Monday night, Thursday night, Saturday night; everything else day games.
export const PRIME_PLAN = ['sun_night', 'mon_night', 'thu_night', 'sat_night', 'sun_day', 'sun_day', 'sat_day', 'sat_day'];
export const swapWeeks = (season, a, b) => rpc('swap_schedule_weeks', { p_season: season, p_a: a, p_b: b });

export const RATING = {
  great: { label: 'Great matchup', icon: '🔥' }, good: { label: 'Good matchup', icon: '👍' }, okay: { label: 'Okay matchup', icon: '🙂' },
  bad: { label: 'Bad matchup', icon: '😴' }, blowout: { label: 'Blowout', icon: '💥' },
};
