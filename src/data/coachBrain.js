// Bot brains: what a coach thinks of his team (coach_brain), and "answer now" for a bot's trade.
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

// Commissioner: the bot answers this trade right now.
export async function botAnswerNow(tradeId) {
  if (DEMO) return {};
  const { data, error } = await db.rpc('bot_answer_now', { p_trade: tradeId });
  if (error) throw new Error(error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}

