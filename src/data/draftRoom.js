// The live draft room: reads the room every 2 seconds (and nudges the clock along) so every screen stays in step.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { toPlayer } from './loadLeague.js';
import { runDemoRoom } from './draftDemo.js';

// Returns { loaded, room, slots, picks (announced, in order), pending (a pick that's in but not announced yet: 'pending' = waiting on the commissioner, 'ready' = accepted), coached (team ids with a coach), offset, refresh }.
export function useDraftRoom(season) {
  const [state, setState] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (DEMO) return runDemoRoom(season, setState);
    let live = true; let timer; let slots = null; let coached = null; let n = 0;
    const load = async () => {
      try {
        const tick = await db.rpc('draft_tick');
        const offset = tick.data?.now ? Date.parse(tick.data.now) - Date.now() : 0;
        if (!slots?.length || n++ % 5 === 0) slots = (await db.rpc('draft_slots', { p_season: season })).data || slots || []; // re-read now and then: trades move picks
        if (!coached) coached = (await db.rpc('coached_teams')).data || [];
        const [{ data: room }, { data: rows }] = await Promise.all([
          db.from('draft_room').select('*').eq('season', season).maybeSingle(),
          db.from('draft_selections').select('*, player:players(*)').eq('season', season).neq('status', 'denied').order('pick_no'),
        ]);
        if (!live) return;
        const all = (rows || []).map((s) => ({ ...s, player: s.player ? toPlayer(s.player) : null }));
        setState({ room: room || null, slots, picks: all.filter((s) => s.status === 'approved'), pending: all.find((s) => s.status === 'pending' || s.status === 'ready') || null, coached, offset });
        timer = setTimeout(load, room?.status === 'live' ? 2000 : 5000);
      } catch {
        if (live) timer = setTimeout(load, 5000);
      }
    };
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [season, version]);
  return { ...(state || {}), loaded: state !== null, refresh: () => setVersion((v) => v + 1) };
}

// Just the room's status for settings screens: null (not started), or { status: 'live'|'paused'|'done', pickNo }.
export function useDraftStatus(season, version = 0) {
  const [status, setStatus] = useState(undefined);
  useEffect(() => {
    let live = true;
    if (DEMO) { setStatus(null); return undefined; }
    db.from('draft_room').select('status, pick_no').eq('season', season).maybeSingle()
      .then(({ data }) => { if (live) setStatus(data ? { status: data.status, pickNo: data.pick_no } : null); });
    return () => { live = false; };
  }, [season, version]);
  return status;
}
