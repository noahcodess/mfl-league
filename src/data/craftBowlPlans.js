// The Craft Bowl plan for each season: its logo, two colors, host stadium (a team's home field) and network. The
// commissioner sets this season and the next 6; a stadium can't host again within 3 seasons, a network can't air it two
// seasons in a row. (craftBowls.js is the champions history.)
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { currentSeason } from './teams.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return null;
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}
const ROMAN = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export const roman = (n) => { let out = '', x = n; for (const [v, r] of ROMAN) while (x >= v) { out += r; x -= v; } return out; };
export const logoSrc = (url) => (!url ? null : /^https?:/.test(url) ? url : `${import.meta.env.BASE_URL}${encodeURI(url)}`);
export const AHEAD = 6;

const toPlan = (r) => ({ season: r.season, logo: r.logo_url, primary: r.primary_color, secondary: r.secondary_color, stadium: r.stadium_team, network: r.network || null });
const DEMO_STADIUMS = ['drf', 'snm', 'ocm', 'tga', 'edc', 'lsc', 'void'];
const demoPlans = () => Array.from({ length: AHEAD + 1 }, (_, k) => ({ season: currentSeason() + k, logo: k ? null : 'craft-bowl/Craft Bowl VIII Logo.png',
  primary: k ? '#19c26b' : '#19e27a', secondary: k ? '#0a3d2c' : '#0a4f3a', stadium: DEMO_STADIUMS[k], network: ['nbc', 'espn', 'fox', 'cbs'][k % 4] }));

let cache = null;
const listeners = new Set();
export async function reloadPlans() {
  cache = DEMO ? (cache || demoPlans()) : ((await rpc('craft_bowl_list')) || []).map(toPlan);
  listeners.forEach((fn) => fn(cache));
  return cache;
}
// Every planned Craft Bowl, oldest season first. Shared and loaded once.
export function useCraftBowlPlans() {
  const [list, setList] = useState(cache);
  useEffect(() => { listeners.add(setList); if (cache) setList(cache); else reloadPlans().catch(() => setList([])); return () => listeners.delete(setList); }, []);
  return list;
}
export const useCraftBowlPlan = (season) => (useCraftBowlPlans() || []).find((p) => p.season === season) || null;

// Stadiums that can host this season (none of the 3 seasons before or after has it).
export const openStadiums = (plans, season, teamIds) => teamIds.filter((id) => !(plans || []).some((p) => p.stadium === id && p.season !== season && Math.abs(p.season - season) <= 3));

export async function savePlan(p) {
  if (DEMO) { cache = cache.map((x) => (x.season === p.season ? { ...p } : x)); listeners.forEach((fn) => fn(cache)); return; }
  await rpc('craft_bowl_save', { p_season: p.season, p_logo: p.logo || '', p_primary: p.primary, p_secondary: p.secondary, p_stadium: p.stadium || null });
  await reloadPlans();
}
// The dice: the server picks (and saves) a stadium that follows the 3-season rule. Returns { id, done } where done() shows it everywhere.
export async function randomizePlan(season, teamIds) {
  let id;
  if (DEMO) { const open = openStadiums(cache, season, teamIds).filter((x) => x !== cache.find((p) => p.season === season)?.stadium); id = open[Math.floor(Math.random() * open.length)]; }
  else id = await rpc('craft_bowl_randomize', { p_season: season });
  return { id, done: () => { if (DEMO) { cache = cache.map((p) => (p.season === season ? { ...p, stadium: id } : p)); listeners.forEach((fn) => fn(cache)); return null; } return reloadPlans(); } };
}
export const CB_NETWORKS = [['fox', 'FOX'], ['cbs', 'CBS'], ['nbc', 'NBC'], ['espn', 'ESPN']];
// A network the season before or after already has (so this season can't).
export const takenNetworks = (plans, season) => (plans || []).filter((p) => Math.abs(p.season - season) === 1 && p.network).map((p) => p.network);
export async function setPlanNetwork(season, network) {
  if (DEMO) { cache = cache.map((p) => (p.season === season ? { ...p, network } : p)); listeners.forEach((fn) => fn(cache)); return; }
  await rpc('craft_bowl_set_network', { p_season: season, p_network: network });
  await reloadPlans();
}
// blob: a checked PNG from prepareLogo. Returns the public URL to save.
export async function uploadPlanLogo(season, blob) {
  if (DEMO) return URL.createObjectURL(blob);
  const path = `craft-bowl-${season}-${Date.now()}.png`;
  const { error } = await db.storage.from('team-logos').upload(path, blob, { contentType: 'image/png', upsert: false });
  if (error) throw new Error(error.message.includes('row-level') ? 'Only the commissioner can upload logos.' : error.message);
  return db.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
}
