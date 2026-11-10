// Free agency: this team's offers, a free agent's quote, making or pulling an offer, and the commissioner's round button.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { store } from './store.js';
import { FA_WINDOW } from './teams.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');

export const faRound = () => Number(store.league.meta.faRound ?? 0);
export const faRounds = () => Number(store.league.meta.faRounds ?? 4);
export const maxOpenOffers = () => Number(store.league.meta.maxOpenOffers ?? 6);
export const faOpen = () => store.league.meta.phase === 'offseason' && Number(store.league.meta.offseasonStep) === FA_WINDOW;

// Offers this person may see (own team; the commissioner and owner see all). Newest first.
export function useFaOffers(viewerKey, version) {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    if (!viewerKey || DEMO) { setList([]); return undefined; }
    db.from('fa_offers').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => { if (live) setList(data || []); });
    return () => { live = false; };
  }, [viewerKey, version]);
  return list;
}

export async function getFaQuote(playerId) {
  if (DEMO) return { ask: 85000, years: 2, max_years: 3, market: 80000, round: 0, rounds: 4, cap_room: 1500000, offers_out: 1, interest: 3, mine: null, need: { starter: [80000, 75000, 80000], backup: [95000, 90000, 95000] } };
  const { data, error } = await db.rpc('fa_quote', { p_player: playerId });
  if (error) throw new Error(clean(error.message));
  return data;
}

// Returns { read: strong | close | low }: how he feels about it heading into the next round.
export async function makeFaOffer(playerId, years, perYear, role) {
  if (DEMO) return { read: perYear >= 85000 ? 'strong' : perYear >= 72000 ? 'close' : 'low' };
  const { data, error } = await db.rpc('make_fa_offer', { p_player: playerId, p_years: years, p_per_year: perYear, p_role: role });
  if (error) throw new Error(clean(error.message));
  return data;
}

export async function getFaBoard(playerId) {
  if (DEMO) return [{ team_id: 'crf', years: 2, per_year: 95000, role: 'starter', interest: 86, mine: false }, { team_id: 'snm', years: 2, per_year: 85000, role: 'starter', interest: 74, mine: true }, { team_id: 'pln', years: 1, per_year: 70000, role: 'backup', interest: 51, mine: false }];
  const { data, error } = await db.rpc('fa_board', { p_player: playerId });
  if (error) throw new Error(clean(error.message));
  return data || [];
}

export async function withdrawFaOffer(playerId) {
  const { error } = await db.rpc('withdraw_fa_offer', { p_player: playerId });
  if (error) throw new Error(clean(error.message));
}

export async function runFaRound() {
  const { data, error } = await db.rpc('run_fa_round');
  if (error) throw new Error(clean(error.message));
  return data;
}
