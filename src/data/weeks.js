// Game weeks: the commissioner moves the league to the next week, which also runs the bots' weekly moves. catchUpWeeks
// keeps the league's week in step with the games: playing or simming a game from a later week moves the league there,
// one week at a time, so the bots make every week's moves along the way.
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export async function advanceWeek() {
  if (DEMO) return { week: 2, bots: { blocks: 12, deals: 1, offers: 0, filled: 3 } };
  const { data, error } = await db.rpc('advance_week');
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}

// Moves the saved week up to `target` (never past 12). Quietly does nothing for anyone but the commissioner. Returns how
// many weeks it moved.
export async function catchUpWeeks(target) {
  if (DEMO || !target) return 0;
  const { data } = await db.from('league_settings').select('key, value').in('key', ['current_week', 'phase']);
  const m = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  if (m.phase !== 'regular_season') return 0;
  let wk = Number(m.current_week) || 1, n = 0;
  while (wk < Math.min(target, 12)) { try { await advanceWeek(); } catch { break; } wk += 1; n += 1; }
  if (n) window.dispatchEvent(new CustomEvent('mfl-week-changed'));
  return n;
}

// After a regular-season game goes final: catch the league up to that game's week.
export async function catchUpToGame(gameId) {
  if (DEMO) return 0;
  const { data } = await db.from('games').select('week, kind').eq('id', Number(gameId)).maybeSingle();
  return data?.kind === 'regular' ? catchUpWeeks(data.week) : 0;
}
