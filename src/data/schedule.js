// The commissioner's calendar (real dates for offseason events) and the draft/room numbers he can tune.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');

// Every event the commissioner can put a date on, in calendar order.
export const SCHEDULE_EVENTS = [
  ['birthday', 'Birthday & Farewell'], ['resign', 'Re-signing opens'], ['fa_open', 'Free agency opens'],
  ['fa_round_1', 'Free agency round 1'], ['fa_round_2', 'Free agency round 2'], ['fa_round_3', 'Free agency round 3'], ['fa_round_4', 'Free agency round 4'],
  ['draft', 'Draft night'], ['camp', 'Training camp'], ['season_start', 'Season kickoff'],
];

// Test-only calendar (&sched=open puts draft night 8 minutes out, so the room is open).
const demoRows = () => {
  const open = new URLSearchParams(window.location.search).get('sched') === 'open';
  return [{ kind: 'fa_round_2', label: 'Free agency round 2', at: new Date(Date.now() + 3 * 3600e3).toISOString() },
    { kind: 'draft', label: 'Draft night', at: new Date(Date.now() + (open ? 8 * 60e3 : 2 * 86400e3 + 5 * 3600e3)).toISOString() }];
};

// Returns the season's dated events (soonest first), or null while loading.
export function useSchedule(season, version = 0) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setRows(demoRows()); return undefined; }
    db.from('league_schedule').select('kind, label, starts_at').eq('season', season).order('starts_at')
      .then(({ data }) => { if (live) setRows((data || []).map((r) => ({ kind: r.kind, label: r.label, at: r.starts_at }))); });
    return () => { live = false; };
  }, [season, version]);
  return rows;
}

export async function setScheduleItem(kind, label, atIso) {
  if (DEMO) return {};
  const { data, error } = await db.rpc('set_schedule', { p_kind: kind, p_label: label, p_at: atIso });
  if (error) throw new Error(clean(error.message));
  return data;
}

// League numbers (draft clocks, how early rooms open). Returns key -> number.
export function useLeagueNumbers(keys, version = 0) {
  const [map, setMap] = useState(null);
  const id = keys.join(',');
  useEffect(() => {
    let live = true;
    if (DEMO) { setMap({ draft_room_opens_minutes: 15, game_room_opens_minutes: 5, draft_pick_seconds_top5: 240, draft_pick_seconds_r1: 180, draft_pick_seconds: 120, draft_pick_seconds_r3: 90 }); return undefined; }
    db.from('league_settings').select('key, value').in('key', keys)
      .then(({ data }) => { if (live) setMap(Object.fromEntries((data || []).map((r) => [r.key, Number(r.value)]))); });
    return () => { live = false; };
  }, [id, version]);
  return map;
}

export async function setLeagueNumber(key, value) {
  if (DEMO) return {};
  const { data, error } = await db.rpc('set_league_number', { p_key: key, p_value: value });
  if (error) throw new Error(clean(error.message));
  return data;
}

// "2d 5h", "3h 12m", "14:05" (under an hour), "now".
export function untilText(ms) {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const whenText = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
