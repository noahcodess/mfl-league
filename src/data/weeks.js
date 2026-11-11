// Game weeks: the commissioner moves the league to the next week, which also runs the bots' weekly moves.
import { db } from './supabase.js';
import { DEMO } from './demo.js';

export async function advanceWeek() {
  if (DEMO) return { week: 2, bots: { blocks: 12, deals: 1, offers: 0, filled: 3 } };
  const { data, error } = await db.rpc('advance_week');
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}
