// Coaches: every team's coach (name, look, 5 ratings, potential, scheme), the coach's own outfit and scheme, the commissioner's
// full coach editor, and number change requests.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');

// The 5 coach ratings that make up his stars. Every effect is slight.
export const COACH_RATINGS = [
  ['motivation', 'Motivation', 'His players develop a little faster.'],
  ['clutch', 'Clutch', 'A small boost in clutch-time moments.'],
  ['legacy', 'Legacy', 'All-time record, Craft Bowls won and more. Grows with his career.'],
  ['recruiting', 'Recruiting', 'Free agents are a little more interested in his team.'],
  ['game_planning', 'Game Planning', 'His scheme runs a little better on game day.'],
];

// Stars from the 5 ratings, on the same scale as players (matches the database's coach_stars).
export function coachStars(r = {}) {
  const avg = COACH_RATINGS.reduce((s, [k]) => s + (Number(r[k]) || 50), 0) / COACH_RATINGS.length;
  return Math.max(0.5, Math.min(5, Math.round(((avg - 28) / 13) * 2) / 2));
}

const DEMO_COACH = (teamId) => ({ team_id: teamId, name: teamId === 'snm' ? 'Noah' : 'Andre Irby', potential: teamId === 'snm' ? 5 : 3,
  ratings: { motivation: 72, clutch: 68, legacy: 58, recruiting: 75, game_planning: 71 },
  looks: teamId === 'snm' ? { skin: '#f3cfb3', hair: '#d9b871', style: 'messy', head: 'oval', eyes: '#4f7fa8', mouth: 'smirk', beard: 'none', glasses: 'sun', shirt: 'hoodie', shirtColor: '#2f6fd6', pants: 'sweats', pantsColor: '#1b1b1f' } : {} });

// Every coach, as teamId -> coach. Refreshes when `version` changes.
export function useCoaches(version = 0) {
  const [map, setMap] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setMap(Object.fromEntries(['snm', 'crf', 'lsc', 'dst', 'ocn', 'ntw'].map((t) => [t, DEMO_COACH(t)]))); return undefined; }
    db.from('coaches').select('*').then(({ data }) => { if (live) setMap(Object.fromEntries((data || []).map((c) => [c.team_id, c]))); });
    return () => { live = false; };
  }, [version]);
  return map;
}

export async function saveMyCoach(outfit) {
  if (DEMO) return {};
  const { data, error } = await db.rpc('set_my_coach', { p_name: null, p_outfit: outfit });
  if (error) throw new Error(clean(error.message));
  return data;
}

async function call(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}
export const saveMyScheme = (offense, defense, auto) => call('set_my_scheme', { p_offense: offense, p_defense: defense, p_auto: auto });
// Commissioner: anything about any coach.
export const saveCoach = (teamId, name, looks, ratings, potential) => call('set_coach', { p_team: teamId, p_name: name, p_looks: looks, p_ratings: ratings, p_potential: potential });
export const saveCoachScheme = (teamId, scheme) => call('set_coach_scheme', { p_team: teamId, p_scheme: scheme });
export const requestNumber = (playerId, number) => call('request_number_change', { p_player: playerId, p_number: number });
export const decideNumber = (requestId, approve) => call('decide_number_change', { p_request: requestId, p_approve: approve });
// Number changes still waiting on the commissioner for a team: Map(playerId -> requested number).
export function usePendingNumbers(teamId, version = 0) {
  const [map, setMap] = useState(new Map());
  useEffect(() => {
    let live = true;
    if (DEMO || !teamId) return undefined;
    db.from('number_requests').select('player_id, to_number').eq('team_id', teamId).eq('status', 'pending')
      .then(({ data }) => { if (live) setMap(new Map((data || []).map((r) => [r.player_id, r.to_number]))); });
    return () => { live = false; };
  }, [teamId, version]);
  return map;
}
