// Team jerseys: each team's 4 uniforms (Home, Away, two named alternates), coach change requests, commissioner approvals and edits,
// specialty games (2 home games a season, unlimited in the playoffs) and the game-day rule (the home team wears the darker uniform).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { brightness } from '../lib/pixels.js';
import { contrast } from '../lib/uniformDraw.js';

export const PARTS = [['helmet', 'Helmet'], ['stripe', 'Helmet stripe'], ['mask', 'Facemask'], ['jersey', 'Jersey'], ['numbers', 'Numbers & decals'],
  ['trim', 'Collar, sleeves & gloves'], ['pants', 'Pants'], ['socks', 'Socks']];
export const SLOT_NAMES = { 1: 'Home', 2: 'Away' };
export const isDark = (c) => brightness(c.jersey) < 0.5;
// Where a jersey can be worn: dark ones at home, light ones on the road (the home team always wears the darker uniform).
export const whereWorn = (j) => (j.slot === 1 ? 'Home games' : j.slot === 2 ? 'Road games' : isDark(j.colors) ? 'Home games only (dark)' : 'Road games only (light)');

const W = '#f1f3f5', BLK = '#18191c', MASK = '#9aa0a8';
// Starting jerseys from team colors (used in demo mode and if a team has none saved yet). Matches the database seed.
export function defaultJerseys(team) {
  const c = team.color, a = team.accent;
  const ink = (on, ...pref) => contrast(on, ...pref);
  const home = { helmet: c, mask: MASK, stripe: ink(c, a), jersey: c, numbers: ink(c, a), trim: ink(c, a), pants: W, socks: c };
  const away = { helmet: c, mask: MASK, stripe: ink(c, a), jersey: W, numbers: ink(W, c, a), trim: ink(W, c, a), pants: brightness(c) < 0.75 ? c : BLK, socks: c };
  const white = { helmet: W, mask: team.id === 'snm' ? '#d9dde2' : MASK, stripe: ink(W, c, a), jersey: W, numbers: ink(W, c, a), trim: ink(W, c, a), pants: W, socks: W };
  const rush = { helmet: c, mask: MASK, stripe: a, jersey: a, numbers: ink(a, c), trim: ink(a, c), pants: a, socks: a };
  const black = { helmet: BLK, mask: BLK, stripe: ink(BLK, c, a), jersey: BLK, numbers: ink(BLK, c, a), trim: ink(BLK, c, a), pants: BLK, socks: BLK };
  const alt3 = brightness(a) > 0.8 || team.id === 'snm' ? ['Whiteout', white] : ['Color Rush', rush];
  const alt4 = team.id === 'snm' ? ['Overdrive', black] : ['Blackout', black];
  return [['Home', home], ['Away', away], alt3, alt4].map(([name, colors], i) => ({ teamId: team.id, slot: i + 1, name, colors }));
}

const cache = new Map();
const listeners = new Set();
async function loadTeam(teamId) {
  if (DEMO) return null;
  const { data } = await db.from('team_jerseys').select('*').eq('team_id', teamId).order('slot');
  const list = (data || []).map((r) => ({ teamId: r.team_id, slot: r.slot, name: r.name, colors: r.colors }));
  cache.set(teamId, list);
  listeners.forEach((fn) => fn());
  return list;
}

// A team's 4 jerseys in slot order (falls back to the team-color defaults).
export function useJerseys(team, version = 0) {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    if (team) loadTeam(team.id);
    return () => listeners.delete(fn);
  }, [team?.id, version]);
  if (!team) return [];
  const saved = cache.get(team.id);
  const base = defaultJerseys(team);
  return base.map((d) => saved?.find((s) => s.slot === d.slot) || d);
}

// Pending requests for a team (one per slot at most).
export function usePendingJerseys(teamId, version = 0) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    if (DEMO || !teamId) { setList([]); return undefined; }
    db.from('jersey_requests').select('*').eq('team_id', teamId).eq('status', 'pending')
      .then(({ data }) => { if (live) setList((data || []).map((r) => ({ id: r.id, slot: r.slot, name: r.name, colors: r.colors, at: r.created_at }))); });
    return () => { live = false; };
  }, [teamId, version]);
  return list;
}

// Specialty picks for a season: Map(gameId -> slot) for the home team's pick. Shared, reloads when someone picks.
const picks = { season: null, map: new Map(), subs: new Set() };
async function loadPicks(season) {
  if (DEMO) return;
  const { data } = await db.from('game_uniforms').select('game_id, team_id, slot, games!inner(season, home_team)').eq('games.season', season);
  picks.season = season;
  picks.map = new Map((data || []).filter((r) => r.team_id === r.games.home_team).map((r) => [r.game_id, r.slot]));
  picks.subs.forEach((fn) => fn());
}
export function useGamePicks(season) {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    picks.subs.add(fn);
    if (picks.season !== season) loadPicks(season);
    return () => picks.subs.delete(fn);
  }, [season]);
  return picks.map;
}
export async function pickSpecialty(gameId, slot, season) {
  await rpc('pick_specialty_game', { p_game: gameId, p_slot: slot });
  await loadPicks(season);
}

// Game day: home team in its Home jersey, away team in its Away jersey (the home team is always the darker one).
// A specialty pick puts the home team in that alternate; if it's a light one, the visitors switch to their dark Home jersey.
export function gameUniforms(homeJerseys, awayJerseys, homePick) {
  const alt = homePick && homeJerseys.find((j) => j.slot === homePick);
  if (alt) return isDark(alt.colors) ? { home: alt, away: awayJerseys[1], special: true } : { home: alt, away: awayJerseys[0], special: true, flipped: true };
  const home = homeJerseys[0], away = awayJerseys[1];
  if (home && away && brightness(home.colors.jersey) > brightness(away.colors.jersey)) {
    const lightest = [...awayJerseys].sort((x, y) => brightness(y.colors.jersey) - brightness(x.colors.jersey))[0];
    return { home, away: lightest };
  }
  return { home, away };
}

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args, teamId) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  if (teamId) await loadTeam(teamId);
  return data;
}
export const requestJersey = (slot, name, colors) => rpc('request_jersey_change', { p_slot: slot, p_name: name, p_colors: colors });
export const setJersey = (teamId, slot, name, colors) => rpc('commish_set_jersey', { p_team: teamId, p_slot: slot, p_name: name, p_colors: colors }, teamId);
export const decideJersey = (id, approve, teamId) => rpc('decide_jersey_change', { p_request: id, p_approve: approve }, teamId);
