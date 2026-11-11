// Morale: player moods, why they feel that way, trade requests (locked on the block, cut at the deadline) and the commissioner's mood tools.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { currentSeason } from './teams.js';

export const MOODS = ['excited', 'happy', 'normal', 'unhappy', 'angry'];
export const MOOD_NAMES = { excited: 'Excited', happy: 'Happy', normal: 'Normal', unhappy: 'Unhappy', angry: 'Angry' };
const RANK = { angry: 0, unhappy: 1, normal: 2, happy: 3, excited: 4 };
export const moodRank = (m) => RANK[m] ?? 2;
export const moodImg = (m) => `${import.meta.env.BASE_URL}img/mood/${MOOD_NAMES[m] ? m : 'normal'}.png`;

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

const toRequest = (r) => ({ id: r.id, playerId: r.player_id, teamId: r.team_id, season: r.season, mood: r.mood, madeBy: r.made_by, status: r.status, at: r.created_at, closedAt: r.closed_at, note: r.note });
const demoReasons = [{ icon: '⏳', v: -1.2, text: 'Running out of time. Wants to win now, not rebuild (team ranked #13)' }, { icon: '🪑', v: -0.7, text: 'Wants more snaps' }, { icon: '🤝', v: 0.3, text: 'Loyal. Willing to ride it out.' }];

// One player: { target, score, reasons: [{icon, text, v}] } computed live, and his open trade request (or null).
export function usePlayerMorale(playerId, version = 0) {
  const [m, setM] = useState(null);
  useEffect(() => {
    let live = true;
    if (!playerId) return undefined;
    if (DEMO) { setM({ target: 'unhappy', score: -1.1, reasons: demoReasons, request: null }); return undefined; }
    Promise.all([db.rpc('mood_target', { p_player: playerId }), db.from('trade_requests').select('*').eq('player_id', playerId).eq('status', 'open').maybeSingle()])
      .then(([t, r]) => { if (live) setM({ target: t.data?.mood ?? null, score: t.data?.score ?? null, reasons: t.data?.reasons || [], request: r.data ? toRequest(r.data) : null }); });
    return () => { live = false; };
  }, [playerId, version]);
  return m;
}

// A team's locker room: Map(playerId -> { target, reasons }) from the last morale check.
export function useTeamMorale(playerIds, version = 0) {
  const [map, setMap] = useState(null);
  const key = playerIds.join(',');
  useEffect(() => {
    let live = true;
    if (DEMO) { setMap(new Map(playerIds.map((id, i) => [id, { target: i % 9 === 3 ? 'unhappy' : i % 5 === 0 ? 'normal' : 'happy', reasons: demoReasons }]))); return undefined; }
    if (!playerIds.length) { setMap(new Map()); return undefined; }
    db.from('player_morale').select('player_id, target, reasons').in('player_id', playerIds)
      .then(({ data }) => { if (live) setMap(new Map((data || []).map((r) => [r.player_id, { target: r.target, reasons: r.reasons || [] }]))); });
    return () => { live = false; };
  }, [key, version]);
  return map;
}

// Trade requests, newest first. open only, or the last few of any status (for the news feed and the Desk).
export function useTradeRequests(version = 0, { all = false } = {}) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setList([]); return undefined; }
    let q = db.from('trade_requests').select('*').order('created_at', { ascending: false }).limit(20);
    if (!all) q = q.eq('status', 'open');
    q.then(({ data }) => { if (live) setList((data || []).map(toRequest)); });
    return () => { live = false; };
  }, [version, all]);
  return list;
}

// This season's trade deadline as an ISO date, or null if the commissioner hasn't set one (then it's "after Week 8").
export function useTradeDeadline() {
  const [at, setAt] = useState(undefined);
  useEffect(() => {
    let live = true;
    if (DEMO) { setAt(new Date(Date.now() + 9 * 864e5).toISOString()); return undefined; }
    db.from('league_schedule').select('starts_at').eq('season', currentSeason()).eq('kind', 'trade_deadline').maybeSingle()
      .then(({ data }) => { if (live) setAt(data?.starts_at ?? null); });
    return () => { live = false; };
  }, []);
  return at;
}

export const setPlayerMood = (playerId, mood) => rpc('commish_update_player', { p_player: playerId, p: { mood } });
export const forceTradeRequest = (playerId) => rpc('commish_trade_request', { p_player: playerId });
export const cancelTradeRequest = (id) => rpc('commish_cancel_trade_request', { p_id: id });
