// Every draft button: start, pick, approve/deny, announce, go back a pick, pause, skip, sim to the end, and flagging a prospect.
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { demoAction } from './draftDemo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');

async function call(fn, args) {
  if (DEMO) return demoAction(fn, args);
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

export const startDraft = () => call('draft_start');
export const makePick = (playerId) => call('draft_make_pick', { p_player: playerId });
export const decidePick = (selectionId, approve) => call('draft_decide', { p_selection: selectionId, p_approve: approve });
export const announcePick = () => call('draft_announce');
export const undoPick = () => call('draft_undo_pick');
export const pauseDraft = (pause) => call('draft_pause', { p_pause: pause });
export const autoPick = () => call('draft_skip');
export const pickFor = (playerId) => call('draft_pick_for', { p_player: playerId });
export const simDraft = () => call('draft_sim_to_end');
export const restartDraftTest = () => call('draft_restart_test');
export const toggleFlag = (playerId) => call('toggle_draft_flag', { p_player: playerId });
