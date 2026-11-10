// Who's online: every logged-in screen checks in every 30 seconds; the commissioner sees which coaches are around.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export function usePresenceHeartbeat(signedIn) {
  useEffect(() => {
    if (!signedIn || DEMO) return undefined;
    const beat = () => { if (document.visibilityState === 'visible') db.rpc('touch_presence'); };
    beat();
    const t = setInterval(beat, 30000);
    document.addEventListener('visibilitychange', beat);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', beat); };
  }, [signedIn]);
}

// Returns teamId -> { username, online } for the commissioner (empty for everyone else).
export function useCoachPresence(enabled) {
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!enabled) return undefined;
    if (DEMO) { setMap({ snm: { username: 'noah', online: true }, crf: { username: 'blaze_gm', online: false } }); return undefined; }
    let live = true;
    const load = () => db.rpc('coach_presence').then(({ data }) => {
      if (live && data) setMap(Object.fromEntries(data.map((r) => [r.team_id, { username: r.username, online: r.online }])));
    });
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, [enabled]);
  return map;
}
