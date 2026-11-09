// Commissioner controls for the league calendar: run the next offseason step, or undo the last one.
import { db } from './supabase.js';

const friendly = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.includes('nothing to undo') ? 'Nothing to undo.' : msg || 'Could not reach the league server.');

export async function advanceOffseason() {
  const { data, error } = await db.rpc('advance_offseason');
  if (error) throw new Error(friendly(error.message));
  return data;
}

export async function undoLastStep() {
  const { data, error } = await db.rpc('undo_last_step');
  if (error) throw new Error(friendly(error.message));
  return data;
}

export async function lastSnapshotLabel() {
  const { data } = await db.rpc('last_snapshot_label');
  return data || null;
}
