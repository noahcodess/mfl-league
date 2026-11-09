// Coach accounts, managed by the commissioner through the admin-accounts server function. Passwords are never readable.
import { db } from './supabase.js';
import { DEMO, demoAccounts } from './demo.js';

async function call(action, fields = {}) {
  const { data, error } = await db.functions.invoke('admin-accounts', { body: { action, ...fields } });
  if (error) {
    let message = 'Could not reach the league server';
    try {
      message = (await error.context.json()).error || message;
    } catch { /* keep the default message */ }
    throw new Error(message);
  }
  return data;
}

export const listAccounts = async () => (DEMO ? demoAccounts : (await call('list')).accounts);
export const createCoach = (username, teamId, displayName) => call('create', { username, teamId, displayName });
export const resetCoach = (userId) => call('reset', { userId });
export const moveCoach = (userId, teamId) => call('move', { userId, teamId });
export const removeCoach = (userId) => call('remove', { userId });
