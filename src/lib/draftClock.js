// Reads the draft room at a moment in time: phase, who's on the clock, time left, and where the latest reveal is.
import { useEffect, useState } from 'react';

// A clock that ticks 4 times a second, lined up with the league server's time.
export function useNow(offset = 0) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(t);
  }, [offset]);
  return now;
}

export const clockText = (secs) => `${Math.floor(secs / 60)}:${String(Math.max(0, Math.floor(secs % 60))).padStart(2, '0')}`;
export const ANNOUNCE_ROUNDS = 1; // first-round picks get announced by the commissioner and the slow reveal
// Picks 1-10 get the full show with the grade breakdown; the rest of round 1 a shorter reveal; rounds 2-3 a quick banner.
export const revealSeconds = (pick) => (pick.pick_no <= 10 ? 14 : pick.round <= ANNOUNCE_ROUNDS ? 9 : 5);
export const revealStyle = (pick) => (pick.pick_no <= 10 ? 'full' : pick.round <= ANNOUNCE_ROUNDS ? 'big' : 'quick');

// phase: 'pre', 'live', 'paused' or 'done'. pickState: 'clock' (thinking), 'in' (waiting on the commissioner), 'accepted' (waiting to be announced).
// countdown: seconds until the latest pick is revealed. revealing: that pick is on screen right now.
export function readDraft({ room, slots = [], picks = [], pending }, now) {
  const last = picks[picks.length - 1] || null;
  const revealAt = last?.reveal_at ? Date.parse(last.reveal_at) : null;
  const countdown = revealAt && now < revealAt ? Math.ceil((revealAt - now) / 1000) : 0;
  const revealing = revealAt && now >= revealAt && now < revealAt + revealSeconds(last) * 1000 ? last : null;
  const base = { total: slots.length, made: picks.length, last, countdown, revealing, pending: pending || null };
  if (!room) return { ...base, phase: 'pre', current: slots[0] || null, upNext: slots.slice(1, 7) };
  if (room.status === 'done') return { ...base, phase: 'done', current: null, upNext: [] };
  const current = slots.find((s) => s.pick_no === room.pick_no) || null;
  const upNext = slots.filter((s) => s.pick_no > room.pick_no).slice(0, 6);
  const starts = room.clock_starts_at ? Date.parse(room.clock_starts_at) : now;
  const ends = room.clock_ends_at ? Date.parse(room.clock_ends_at) : null;
  const pickState = room.pick_state || 'clock';
  const full = ends && pickState === 'clock' ? Math.max(1, Math.round((ends - starts) / 1000)) : 120;
  let left = 0;
  if (room.status === 'paused') left = room.paused_left ?? 0;
  else if (pickState === 'clock' && ends) left = Math.max(0, Math.ceil((ends - Math.max(now, starts)) / 1000));
  const timeUp = room.status === 'live' && pickState === 'clock' && ends != null && now >= ends;
  return { ...base, phase: room.status, current, upNext, pickState, timeUp, reveal: pickState === 'clock' && now < starts, left, full: Math.max(full, left, 1) };
}

export const roundOf = (slot) => (slot ? `Round ${slot.round} · Pick ${slot.slot}` : '');
