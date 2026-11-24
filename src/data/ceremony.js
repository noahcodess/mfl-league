// The award ceremony: its date and status, the confirmed finalists and (after the show) the winners, plus the
// commissioner's moves (confirm finalists, set the date, start / finish the show). Dev demo: ?democer=open|locked|live|done.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (m = '') => (m.includes('not allowed') ? 'Only the commissioner can do this.' : m.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

function demoState(season) {
  const mode = new URLSearchParams(window.location.search).get('democer');
  if (!mode) return { season, show_at: null, locked: false, started: false, finished: false, revealed: false, finalists: null, winners: null };
  const p = (name, team, pos, line) => ({ id: name, name, team, pos, line });
  const fin = {
    mvp: [p('Mason Holloway', 'ocm', 'QB', '3,412 yds · 31 TD · 6 INT'), p('Dre Whitfield', 'snm', 'QB', '3,180 yds · 27 TD'), p('Tyrell Banks', 'crf', 'RB', '1,402 yds · 15 TD')],
    opoy: [p('Jalen Ross', 'lsc', 'WR', '1,288 yds · 12 TD'), p('Mason Holloway', 'ocm', 'QB', '3,412 yds · 31 TD'), p('Tyrell Banks', 'crf', 'RB', '1,402 yds · 15 TD')],
    dpoy: [p('Kofi Mensah', 'dst', 'DL', '14 sacks · 31 pressures'), p('Luis Ortega', 'snm', 'DB', '7 INT · 15 PD'), p('Rowan Pike', 'ntw', 'LB', '96 tackles · 4 sacks')],
    oroy: [p('Ezra Cole', 'ocn', 'WR', '842 yds · 7 TD'), p('Theo Vance', 'crf', 'RB', '690 yds · 6 TD'), p('Jace Morrow', 'lsc', 'QB', '1,980 pass yds · 14 TD')],
    droy: [p('Malik Hart', 'snm', 'DL', '8 sacks'), p('Dorian Fisk', 'dst', 'CB', '4 INT · 11 PD'), p('Kade Wren', 'ntw', 'LB', '71 tkl')],
    cpoy: [p('Rowan Pike', 'ntw', 'LB', 'Missed 8 weeks hurt last season · 96 tkl'), p('Tyrell Banks', 'crf', 'RB', 'A backup last season · 1,402 rush yds'), p('Luis Ortega', 'snm', 'SS', 'A down year last season · 7 INT')],
    coy: [p('Coach Diego', 'crf', 'Crimson Fang', '9-3 · 6 moves'), p('Coach Noah', 'snm', 'Snowy Mountain Creepers', '10-2 · 8 moves'), p('Coach Irby', 'lsc', 'Lakeside', '8-4 · 4 moves')],
    goty: [p('Creepers at Fang', null, null, 'Week 7 · 38-35 OT'), p('Lakeside at Tide', null, null, 'Week 10 · 31-30'), p('Night at Dust', null, null, 'Week 3 · 28-27')],
  };
  const mix = (k, e) => [...`${season}${k}${e.id}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);   // shuffled the same way every time, like the server
  const sorted = Object.fromEntries(Object.entries(fin).map(([k, v]) => [k, [...v].sort((a, b) => mix(k, a) - mix(k, b))]));
  return { season, show_at: new Date(Date.now() + 2 * 864e5 + 4 * 36e5 + 1234e3).toISOString(), locked: mode !== 'open', started: mode === 'live' || mode === 'done',
    finished: mode === 'done', revealed: mode === 'done', finalists: mode === 'open' ? null : sorted, winners: mode === 'live' || mode === 'done' || /devshow/.test(window.location.search) ? fin : null };
}

export async function ceremonyState(season) {
  if (DEMO) return demoState(season);
  return rpc('award_show_state', { p_season: season });
}

// The ceremony's state for a season (null while loading). Re-reads every 20 seconds, so a show starting or ending shows up.
export function useCeremony(season, version = 0) {
  const [s, setS] = useState(null), [bump, setBump] = useState(0);
  useEffect(() => {
    let live = true;
    ceremonyState(season).then((v) => { if (live) setS(v); }).catch(() => {});
    const t = setInterval(() => setBump((n) => n + 1), 20000);
    return () => { live = false; clearInterval(t); };
  }, [season, version, bump]);
  return s;
}

export const lockFinalists = (season) => rpc('lock_award_finalists', { p_season: season });
export const setShowDate = (season, iso) => rpc('set_award_show_date', { p_season: season, p_at: iso });
export const showStep = (season, step) => rpc('award_show_step', { p_season: season, p_step: step });

// Is it ceremony time? After every Week 12 game is final (or the league is past Week 12), or once the finalists are in.
export function ceremonyTime(games, state, week) {
  if (state?.locked) return true;
  if ((week || 0) > 12) return true;
  const reg = (games || []).filter((g) => g.kind === 'regular' && g.week <= 12);
  return reg.length > 0 && reg.every((g) => g.status === 'final');
}

// The order the show reveals them: MVP last.
export const SHOW_ORDER = ['goty', 'coy', 'oroy', 'droy', 'cpoy', 'opoy', 'dpoy', 'mvp'];
