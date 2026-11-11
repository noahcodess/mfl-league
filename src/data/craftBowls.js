// Craft Bowl history: every champion (season, runner-up, winning coach, score, MVP), titles per team and per coach, and the commissioner's edits.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export const trophyImg = () => `${import.meta.env.BASE_URL}img/craft-bowl.png`;

const toBowl = (r) => ({ id: r.id, season: r.season, champion: r.champion, runnerUp: r.runner_up, coach: r.champion_coach, score: r.score, mvp: r.mvp, note: r.note });
const DEMO_BOWLS = [
  { id: 5, season: 7, champion: 'lsc', runnerUp: 'crf' }, { id: 1, season: null, champion: 'snm', coach: 'Noah' }, { id: 2, season: null, champion: 'snm', coach: 'Noah' },
  { id: 3, season: null, champion: 'void' }, { id: 4, season: null, champion: 'void' },
];

let cache = null;
const listeners = new Set();
async function load() {
  const rows = DEMO ? DEMO_BOWLS : ((await db.from('craft_bowls').select('*')).data || []).map(toBowl);
  cache = [...rows].sort((a, b) => (b.season ?? 0) - (a.season ?? 0) || b.id - a.id);
  listeners.forEach((fn) => fn(cache));
  return cache;
}

// Every Craft Bowl, newest season first (unknown seasons last). Shared and loaded once.
export function useCraftBowls() {
  const [list, setList] = useState(cache);
  useEffect(() => {
    listeners.add(setList);
    if (cache) setList(cache); else load();
    return () => listeners.delete(setList);
  }, []);
  return list;
}

export const teamTitles = (bowls, teamId) => (bowls || []).filter((b) => b.champion === teamId);
export const coachTitles = (bowls, name) => (name ? (bowls || []).filter((b) => b.coach && b.coach.toLowerCase() === name.toLowerCase()) : []);

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  await load();
  return data;
}

export const saveCraftBowl = (b) => rpc('commish_save_craft_bowl', {
  p_id: b.id ?? null, p_season: b.season === '' || b.season == null ? null : Number(b.season), p_champion: b.champion, p_runner_up: b.runnerUp || null,
  p_coach: b.coach || null, p_score: b.score || null, p_mvp: b.mvp || null,
});
export const deleteCraftBowl = (id) => rpc('commish_delete_craft_bowl', { p_id: id });
