// Watches the live draft for one team: how many picks until they're up, and a heads-up when they go on the clock.
import { useEffect, useRef, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

// Returns null (no draft going) or { onClock, picksAway, pickNo, endsAt }.
export function useMyDraftTurn(teamId, season) {
  const [turn, setTurn] = useState(null);
  const was = useRef(false);
  useEffect(() => {
    if (!teamId || DEMO) return undefined;
    let live = true; let slots = null; let timer;
    const load = async () => {
      const { data: room } = await db.from('draft_room').select('*').eq('season', season).maybeSingle();
      if (!live) return;
      if (!room || room.status === 'done') { setTurn(null); timer = setTimeout(load, 15000); return; }
      if (!slots) slots = (await db.rpc('draft_slots', { p_season: season })).data || [];
      const next = slots.find((s) => s.team_id === teamId && s.pick_no >= room.pick_no);
      const onClock = !!next && next.pick_no === room.pick_no && room.pick_state === 'clock' && room.status === 'live';
      setTurn(next ? { onClock, picksAway: next.pick_no - room.pick_no, pickNo: next.pick_no, endsAt: room.clock_ends_at } : null);
      if (onClock && !was.current) notify(`You're on the clock! Pick #${next.pick_no} in the Season ${season} draft.`);
      was.current = onClock;
      timer = setTimeout(load, onClock || (next && next.pick_no - room.pick_no <= 2) ? 2500 : 6000);
    };
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [teamId, season]);
  return turn;
}

// A system notification (if the coach turned alerts on) plus a buzz on phones.
function notify(text) {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
  try { if (window.Notification?.permission === 'granted') new window.Notification('MFL Draft', { body: text }); } catch { /* not supported */ }
}

export const alertsState = () => (typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'unsupported');
export const askForAlerts = () => window.Notification?.requestPermission?.();
