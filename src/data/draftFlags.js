// A coach's flagged prospects (his private draft wish list).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { toggleFlag } from './draftActions.js';

export function useDraftFlags(teamId) {
  const [flags, setFlags] = useState(() => new Set());
  useEffect(() => {
    let live = true;
    if (!teamId) { setFlags(new Set()); return undefined; }
    if (DEMO) { setFlags(new Set(['demo-dr-3', 'demo-dr-11'])); return undefined; }
    db.from('draft_flags').select('player_id').eq('team_id', teamId).then(({ data }) => {
      if (live) setFlags(new Set((data || []).map((r) => r.player_id)));
    });
    return () => { live = false; };
  }, [teamId]);
  const toggle = async (playerId) => {
    const on = await toggleFlag(playerId);
    setFlags((old) => { const next = new Set(old); if (on) next.add(playerId); else next.delete(playerId); return next; });
  };
  return { flags, toggle };
}
