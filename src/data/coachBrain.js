// Bot brains: what a coach thinks of his team (coach_brain), the bot tick that lets bots answer trades, and "answer now".
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const DEMO_BRAIN = (teamId) => ({
  mode: teamId === 'snm' ? 'win_now' : 'rebuild', rank: teamId === 'snm' ? 2 : 13, strength: teamId === 'snm' ? 4.45 : 3.55,
  old_core: 6, young_core: 4, expiring: 11, cap_room: 1899673, firsts: 2, picks: 6, draft_season: 8, needs: ['TE', 'C', 'OT'],
  human: teamId === 'snm', reserved: false, style: 'rebuilding',
  brain: { archetype: 'architect', aggression: 2, patience: 5, loyalty: 3, values: { picks: 92, youth: 81, stars: 37, cap: 58 } },
});

// The coach's personality plus what he sees: mode, rank, needs, picks, cap. Null while loading.
export function useCoachBrain(teamId) {
  const [brain, setBrain] = useState(null);
  useEffect(() => {
    let live = true;
    if (!teamId) return undefined;
    if (DEMO) { setBrain(DEMO_BRAIN(teamId)); return undefined; }
    db.rpc('coach_brain', { p_team: teamId }).then(({ data }) => { if (live) setBrain(data || null); });
    return () => { live = false; };
  }, [teamId]);
  return brain;
}

// While someone is signed in, nudge the server every 30s so bot coaches answer trades that are due.
export function useBotTick(on) {
  useEffect(() => {
    if (!on || DEMO) return undefined;
    const tick = () => db.rpc('bot_tick').then(() => {}, () => {});
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [on]);
}

// Commissioner: the bot answers this trade right now.
export async function botAnswerNow(tradeId) {
  if (DEMO) return {};
  const { data, error } = await db.rpc('bot_answer_now', { p_trade: tradeId });
  if (error) throw new Error(error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}

// Commissioner: run a bot week now (blocks, rare bot trades, rare offers to coaches, in-season signings).
export async function botRunWeek() {
  if (DEMO) return { blocks: 12, deals: 1, offers: 0, filled: 0 };
  const { data, error } = await db.rpc('bot_run_week');
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}

// When the last bot week ran (ISO string), or null.
export function useBotWeekLast(version = 0) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    if (DEMO) { setLast(new Date(Date.now() - 2 * 864e5).toISOString()); return; }
    db.from('league_settings').select('value').eq('key', 'bot_week_last').maybeSingle().then(({ data }) => setLast(data?.value || null));
  }, [version]);
  return last;
}
