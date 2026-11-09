// Commissioner key: first-time setup, unlocking each session, and locking again on sign-out.
import { db } from './supabase.js';

const friendly = (msg = '') => {
  if (msg.includes('locked')) return 'Too many wrong tries. The key is locked for 15 minutes.';
  if (msg.includes('already set')) return 'A key already exists. Use the unlock screen.';
  if (msg.includes('too weak')) return 'That key is too weak.';
  if (msg.includes('not allowed')) return 'Only the commissioner can do this.';
  return 'Could not reach the league server.';
};

// Sends the new key to be scrambled (bcrypt) and stored. The plain key never leaves this browser again.
export async function setKey(key) {
  const { error } = await db.rpc('set_commish_key', { new_key: key });
  if (error) throw new Error(friendly(error.message));
}

// Returns true if the key was right. Wrong keys return false; the 5th wrong try locks it.
export async function unlock(key) {
  const { data, error } = await db.rpc('unlock_commish', { key });
  if (error) throw new Error(friendly(error.message));
  return data === true;
}

export async function lock() {
  await db.rpc('lock_commish');
}
