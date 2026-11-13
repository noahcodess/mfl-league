// The live state of a game, shared by the commissioner's game screen and both coaching rooms: score, quarter, clock,
// timeouts, who has the ball, who received the opening kick and which way the home team goes. Read every 1.5 seconds.
// Sample-season games (ids like "w6-ocn") aren't in the database, so they keep a local state instead.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}
export const isRealGame = (id) => /^\d+$/.test(String(id)) && !DEMO;

// A fresh state for a game that hasn't kicked off (also the local state for sample games).
export const PREGAME = { status: 'pregame', quarter: 1, quarter_seconds: 900, clock_left: 900, clock_running: false, clock_since: null,
  home_score: 0, away_score: 0, home_timeouts: 3, away_timeouts: 3, possession: null, receiving: null, home_dir: null, last_timeout: null };

// A coin flip for sample games: who receives and which way the home team goes.
export const flipKickoff = (game) => ({ receiving: Math.random() < 0.5 ? game.home : game.away, home_dir: Math.random() < 0.5 ? 'left' : 'right' });

export function useGameState(gameId, version = 0) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    if (!isRealGame(gameId)) { setSt(PREGAME); return undefined; }
    let live = true; let timer;
    const load = async () => {
      const { data } = await db.from('game_state').select('*').eq('game_id', gameId).maybeSingle();
      if (!live) return;
      setSt(data || PREGAME);
      timer = setTimeout(load, 1500);
    };
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [gameId, version]);
  return st;
}

export const startGame = (id) => rpc('game_start', { p_game: Number(id) });
export const setGameClock = (id, run) => rpc('game_clock', { p_game: Number(id), p_run: run });
export const callTimeout = (id) => rpc('call_timeout', { p_game: Number(id) });
export const resetGame = (id) => rpc('game_reset', { p_game: Number(id) });

// Seconds left on the game clock right now.
export function clockLeft(st, now = Date.now()) {
  if (!st) return 900;
  if (!st.clock_running || !st.clock_since) return st.clock_left;
  return Math.max(0, st.clock_left - Math.floor((now - Date.parse(st.clock_since)) / 1000));
}
export const clockText = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const quarterText = (q) => (q >= 5 ? 'OT' : ['1st', '2nd', '3rd', '4th'][q - 1] || '1st');

// Re-renders every quarter second while the clock runs, so it counts down smoothly between reads.
export function useTicker(on) {
  const [, setN] = useState(0);
  useEffect(() => { if (!on) return undefined; const id = setInterval(() => setN((n) => n + 1), 250); return () => clearInterval(id); }, [on]);
}

export const testScore = (id, side, points) => rpc('game_test_score', { p_game: Number(id), p_side: side, p_points: points });

const ORD = ['1st', '2nd', '3rd', '4th'];
// "3rd & 7", "4th & Goal", or what's happening when there's no down yet.
export function downText(st) {
  if (!st || st.status === 'pregame') return 'Pregame';
  if (st.status === 'final') return 'Final';
  if (!st.down) return 'Kickoff';
  const goal = st.ball_on != null && 100 - st.ball_on <= st.togo;
  return `${ORD[st.down - 1]} & ${goal ? 'Goal' : st.togo}`;
}
// Where the ball is, from the offense's view: "OWN 25", "50", "OPP 34". teamCode labels it like a broadcast ("NE 34").
export function ballText(st, own, opp) {
  if (st?.ball_on == null) return '';
  const b = st.ball_on;
  return b === 50 ? 'Ball on the 50' : b < 50 ? `Ball on ${own || 'OWN'} ${b}` : `Ball on ${opp || 'OPP'} ${100 - b}`;
}

// The live states of several games at once (the Live tab's week), read every 3 seconds: { gameId: state }.
export function useGameStates(ids) {
  const key = ids.filter(isRealGame).join(',');
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!key) { setMap({}); return undefined; }
    let live = true; let timer;
    const load = async () => {
      const { data } = await db.from('game_state').select('*').in('game_id', key.split(',').map(Number));
      if (!live) return;
      setMap(Object.fromEntries((data || []).map((r) => [String(r.game_id), r])));
      timer = setTimeout(load, 3000);
    };
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [key]);
  return map;
}
