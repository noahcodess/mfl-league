// The inbox: trade offers, trade block alerts, league-wide news and commissioner notices. Checks for new mail every 30 seconds.
import { useEffect, useState, useCallback } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const demoMail = () => [
  { id: 3, kind: 'trade_offer', title: 'Trade offer from the Crimson Forest Dragons', body: 'They send: QB ... They want: WR ...', createdAt: new Date().toISOString() },
  { id: 2, kind: 'trade_block', title: 'On the block: DE Trevor Callahan (3.5★)', body: 'The Snowy Mountain Creepers are listening to offers.', createdAt: new Date().toISOString() },
  { id: 1, kind: 'trade_done', title: 'Trade: DST ⇄ WRF', body: 'Two-player swap.', createdAt: new Date(Date.now() - 86400e3).toISOString() },
];

// Returns { mail (newest first), unread, markAllRead }.
export function useInbox(userId) {
  const [state, setState] = useState({ mail: [], lastRead: 0 });
  useEffect(() => {
    if (!userId) return undefined;
    if (DEMO) { setState({ mail: demoMail(), lastRead: 1 }); return undefined; }
    let live = true;
    const load = async () => {
      const [{ data: mail }, { data: read }] = await Promise.all([
        db.from('inbox').select('*').order('id', { ascending: false }).limit(80),
        db.from('inbox_reads').select('last_read_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (live) setState({ mail: (mail || []).map((m) => ({ id: m.id, kind: m.kind, title: m.title, body: m.body, data: m.data, toCommish: m.to_commish, createdAt: m.created_at })), lastRead: read?.last_read_id || 0 });
    };
    load();
    const t = setInterval(load, 30000);
    return () => { live = false; clearInterval(t); };
  }, [userId]);
  const markAllRead = useCallback(async () => {
    const top = state.mail[0]?.id || 0;
    setState((s) => ({ ...s, lastRead: top }));
    if (!DEMO && top) await db.rpc('inbox_mark_read', { p_last: top });
  }, [state.mail]);
  return { mail: state.mail, lastRead: state.lastRead, unread: state.mail.filter((m) => m.id > state.lastRead).length, markAllRead };
}

export const MAIL_ICON = { trade_offer: '🔁', trade_declined: '✋', trade_vetoed: '⛔', trade_done: '🤝', trade_block: '📣', trade_window: '🚦',
  coach_edit: '🧢', number_request: '🔢', number_approved: '✅', number_denied: '✋',
  jersey_request: '👕', jersey_approved: '✅', jersey_denied: '✋', drip_request: '🧢', drip_approved: '✅', drip_denied: '✋', trade_request: '📣', morale: '🚪',
  endzone_request: '🏁', endzone_approved: '✅', endzone_denied: '✋' };
