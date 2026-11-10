// TEST mode (sandbox): the commissioner turns it on to try anything for real; turning it off resets the league.
import { db } from './supabase.js';
import { store } from './store.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');

export const inSandbox = () => store.league.meta.sandbox === true;

export async function enterSandbox() {
  const { error } = await db.rpc('sandbox_enter');
  if (error) throw new Error(clean(error.message));
}

export async function exitSandbox() {
  const { error } = await db.rpc('sandbox_exit');
  if (error) throw new Error(clean(error.message));
}
