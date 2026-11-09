// Re-signing talks: load this team's negotiations, send an offer, get a quote, and the commissioner's approve/deny.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO, demoQuote, demoReply } from './demo.js';

const clean = (msg = '') => msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.';

export function useNegotiations(viewerKey, version) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    if (!viewerKey || DEMO) { setList([]); return undefined; }
    db.from('negotiations').select('*').order('updated_at', { ascending: false }).then(({ data }) => { if (live) setList(data || []); });
    return () => { live = false; };
  }, [viewerKey, version]);
  return list;
}

export async function getQuote(playerId) {
  if (DEMO) return demoQuote;
  const { data, error } = await db.rpc('resign_quote', { p_player: playerId });
  if (error) throw new Error(clean(error.message));
  return data;
}

// Returns { result: accepted | countered | rejected | walked, line, patience, counter }.
export async function sendOffer(playerId, years, perYear, role) {
  if (DEMO) return demoReply(perYear);
  const { data, error } = await db.rpc('negotiate_resign', { p_player: playerId, p_years: years, p_per_year: perYear, p_role: role });
  if (error) throw new Error(clean(error.message));
  return data;
}

export async function reviewDeal(id, approve, note) {
  const { error } = await db.rpc('review_deal', { p_id: id, p_approve: approve, p_note: note || null });
  if (error) throw new Error(clean(error.message));
}
