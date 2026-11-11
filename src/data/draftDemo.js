// Test-only pretend draft so the draft room can be screenshotted offline.
// ?draft=pre|live|reveal|mine|pending|accepted|round2|done|timeup
import { demoClass } from './draft.js';

const ORDER = ['dst', 'wrf', 'drf', 'ocn', 'pln', 'ocm', 'wsl', 'ddc', 'ntw', 'edc', 'flf', 'snm', 'void', 'tga', 'crf', 'lsc'];
const mode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('draft') || 'live' : 'live';
const GRADES = [['A', ['Best player left on the board', 'Fills a hole: they were short a starting LB', 'Rebuilding team lands a high-ceiling prospect']],
  ['B-', ['Good value at this pick', 'Depth piece: their WR room was already full', 'Scouts love his upside']],
  ['D+', ['Big reach: 9 higher-rated players were still on the board', 'Win-now team, but he won\'t help much this season']]];
let demo = null; let push = () => {};

const slotsFor = () => [1, 2, 3].flatMap((round) => ORDER.map((team, i) => ({ pick_no: (round - 1) * 16 + i + 1, round, slot: i + 1, original_team_id: team, team_id: round === 1 && team === 'drf' ? 'void' : team })));
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const slotNow = () => demo.slots.find((s) => s.pick_no === demo.room.pick_no);
const emit = () => push({ room: demo.room, slots: demo.slots, picks: demo.picks, pending: demo.pending, coached: ['snm', 'crf'], offset: 0 });

function selection(slot, player, how, status) {
  const [grade, notes] = GRADES[slot.pick_no % 3];
  return { id: slot.pick_no, season: demo.season, pick_no: slot.pick_no, round: slot.round, slot: slot.slot, team_id: slot.team_id, original_team_id: slot.original_team_id,
    how, status, grade, grade_notes: notes, player: { ...player, teamId: slot.team_id, number: 10 + slot.pick_no, draftRound: slot.round, draftPick: slot.pick_no } };
}

function setClock(delay) {
  const slot = slotNow();
  const human = slot?.team_id === 'snm' || slot?.team_id === 'crf';
  const secs = !slot ? 120 : slot.pick_no <= 5 ? 240 : slot.round === 1 ? 180 : 120;
  demo.room = { ...demo.room, pick_state: 'clock', clock_starts_at: iso(delay * 1000), clock_ends_at: iso((delay + secs) * 1000), bot_pick_at: human ? null : iso((delay + 9) * 1000) };
}

function announce(countdown) {
  const s = { ...demo.pending, status: 'approved', reveal_at: iso(countdown * 1000) };
  demo.picks = [...demo.picks, s]; demo.pending = null;
  if (demo.room.pick_no >= demo.slots.length) { demo.room = { ...demo.room, status: 'done' }; return; }
  demo.room = { ...demo.room, pick_no: demo.room.pick_no + 1 };
  setClock(countdown + (s.round === 1 ? 12 : 5));
}

// A pick comes in (accepted); first round waits for the announcement, later rounds go straight up.
function pickIn(player, how = 'bot', instant = false) {
  const taken = new Set([...demo.picks.map((p) => p.player.id), demo.pending?.player.id]);
  const who = player || demo.pool.find((p) => !taken.has(p.id));
  demo.pending = selection(slotNow(), who, how, 'ready');
  demo.room = { ...demo.room, pick_state: 'accepted', clock_ends_at: iso(0) };
  if (instant || slotNow().round > 1) announce(0);
}

export function runDemoRoom(season, setState) {
  push = setState;
  if (!demo) {
    demo = { season, slots: slotsFor(), pool: demoClass(season).sort((a, b) => b.stars - a.stars), picks: [], pending: null, room: null };
    const made = { live: 3, reveal: 3, mine: 11, pending: 11, accepted: 4, round2: 19, done: 48, timeup: 11 }[mode];
    if (made != null) {
      demo.room = { season, status: 'live', pick_no: 1, pick_state: 'clock' };
      for (let i = 0; i < made; i += 1) pickIn(null, 'bot', true);
      demo.picks = demo.picks.map((p) => ({ ...p, reveal_at: iso(-60000) }));
      if (mode !== 'done') setClock(0);
      if (mode === 'reveal') { pickIn(null, 'bot'); announce(0); }
      if (mode === 'accepted') pickIn(null, 'bot');
      if (mode === 'timeup') demo.room = { ...demo.room, clock_ends_at: iso(-1000) };
      if (mode === 'pending') { demo.pending = selection(slotNow(), demo.pool[14], 'coach', 'pending'); demo.room = { ...demo.room, pick_state: 'in', clock_ends_at: null }; }
    }
  }
  emit();
  const t = setInterval(() => {
    const r = demo.room;
    if (r?.status === 'live' && r.pick_state === 'clock' && r.bot_pick_at && Date.parse(r.bot_pick_at) <= Date.now()) { pickIn(null, 'bot'); emit(); }
  }, 500);
  return () => clearInterval(t);
}

export async function demoAction(fn, args = {}) {
  if (fn === 'toggle_draft_flag') return true;
  if (fn === 'draft_start') { demo.room = { season: demo.season, status: 'live', pick_no: 1 }; setClock(10); }
  if (fn === 'draft_make_pick') { demo.pending = selection(slotNow(), demo.pool.find((p) => p.id === args.p_player), 'coach', 'pending'); demo.room = { ...demo.room, pick_state: 'in', clock_ends_at: null }; }
  if (fn === 'draft_decide') { if (args.p_approve) pickIn(demo.pending.player, 'coach'); else { demo.pending = null; setClock(0); } }
  if (fn === 'draft_announce') announce(3);
  if (fn === 'draft_undo_pick') { if (demo.pending) demo.pending = null; else { const p = demo.picks.pop(); demo.room = { ...demo.room, pick_no: p.pick_no, status: 'live' }; } setClock(0); }
  if (fn === 'draft_skip') pickIn(null, 'auto');
  if (fn === 'draft_pick_for') pickIn(demo.pool.find((p) => p.id === args.p_player), 'commish');
  if (fn === 'draft_pause') demo.room = { ...demo.room, status: args.p_pause ? 'paused' : 'live', paused_left: 42 };
  if (fn === 'draft_sim_to_end') { if (demo.pending) announce(0); while (demo.room.status !== 'done') pickIn(null, 'auto', true); }
  emit();
  return {};
}
