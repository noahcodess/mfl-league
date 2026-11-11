// Commissioner-only draft intel: which teams scouted and flagged each prospect. (The database only hands this to the commissioner.)
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { openWindow } from '../lib/windows.js';

const group = (rows) => rows.reduce((m, r) => { (m[r.player_id] ||= []).push(r.team_id); return m; }, {});

// Returns { scouted: playerId -> [teamIds], flagged: playerId -> [teamIds] }, refreshed every 15 seconds.
export function useDraftIntel(season, enabled) {
  const [intel, setIntel] = useState({ scouted: {}, flagged: {} });
  useEffect(() => {
    if (!enabled) return undefined;
    if (DEMO) { setIntel({ scouted: { 'demo-dr-0': ['snm', 'crf'], 'demo-dr-4': ['dst'] }, flagged: { 'demo-dr-0': ['snm'], 'demo-dr-2': ['crf'] } }); return undefined; }
    let live = true;
    const load = async () => {
      const [{ data: s }, { data: f }] = await Promise.all([
        db.from('scout_reports').select('player_id, team_id').eq('season', season),
        db.from('draft_flags').select('player_id, team_id').eq('season', season),
      ]);
      if (live) setIntel({ scouted: group(s || []), flagged: group(f || []) });
    };
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, [season, enabled]);
  return intel;
}

// The desk opens through the named commissioner windows (src/lib/windows.js).
export const openDeskWindow = () => openWindow('draftDesk');
