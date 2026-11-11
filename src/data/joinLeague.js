// First-time coaches: check the commissioner's one-time passcode, then create their own username and password.
import { db } from './supabase.js';
import { DEMO } from './demo.js';

async function call(action, fields) {
  if (DEMO) return action === 'check' ? { coachName: 'Fins', teamId: 'lsc', teamName: 'Lush Cave Axolotls' } : { username: fields.username };
  const { data, error } = await db.functions.invoke('join-league', { body: { action, ...fields } });
  if (error) {
    let message = 'Could not reach the league server';
    try { message = (await error.context.json()).error || message; } catch { /* keep the default */ }
    throw new Error(message);
  }
  return data;
}

export const checkPasscode = (code) => call('check', { code });
export const joinLeague = (code, username, password) => call('join', { code, username, password });
