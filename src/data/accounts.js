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
export const resetCoach = (userId) => call('reset', { userId });
export const moveCoach = (userId, teamId) => call('move', { userId, teamId });
export const removeCoach = (userId) => call('remove', { userId });

// One-time passcodes (invites). The plain passcode comes back once from create and is never stored in plain text.
async function rpc(fn, args) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the commissioner can do this.' : error.message.replace(/^.*?ERROR:\s*/, ''));
  return data;
}
export const createInvite = (name, teamId) => (DEMO ? { id: 1, code: 'K7QM-RZ4P-8HTX', coach_name: name, team_id: teamId, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() } : rpc('create_coach_invite', { p_name: name, p_team: teamId }));
export const listInvites = async () => (DEMO ? [{ id: 9, coach_name: 'Fins', team_id: 'lsc', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 13 * 864e5).toISOString() }] : (await rpc('list_coach_invites')) || []);
export const cancelInvite = (id) => (DEMO ? null : rpc('cancel_coach_invite', { p_id: id }));
