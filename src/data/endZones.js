// End zone change requests: a coach asks for a new font and background, the commissioner approves or denies from his inbox.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { reloadStadiums } from './stadiums.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));
async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

// The team's waiting request, if any: { id, font, design, shadow, shadowColor, at } or null.
export function usePendingEndZone(teamId, version = 0) {
  const [req, setReq] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO || !teamId) { setReq(null); return undefined; }
    db.from('endzone_requests').select('*').eq('team_id', teamId).eq('status', 'pending').order('id', { ascending: false }).limit(1)
      .then(({ data }) => { const r = data?.[0]; if (live) setReq(r ? { id: r.id, font: r.font, design: r.design, shadow: r.shadow, shadowColor: r.shadow_color, at: r.created_at } : null); });
    return () => { live = false; };
  }, [teamId, version]);
  return req;
}

export const requestEndZone = (look) => rpc('request_endzone_change', { p_font: look.font, p_design: look.design, p_shadow: look.shadow, p_shadow_color: look.shadowColor });
export async function decideEndZone(id, approve) {
  await rpc('decide_endzone_change', { p_request: id, p_approve: approve });
  await reloadStadiums();
}
