import React from 'react';
import { FieldGoalBar, BallOnTag, DriveSummary, yardLineText } from './BroadcastGraphics.jsx';

// The one graphic slot over the scorebug before a snap: whatever broadcastGfx planned for this play (the drive summary, the
// field goal bar, a player's stat card or the "ball on" tag), up for its window and gone (sunk back in) before the snap.
// Only one is ever up, so they can't stack.

// When this play's graphic is up, in seconds of the play's own clock: [from, to]. The field goal bar stays until the kick.
export function slotWindow(pre, pace) {
  if (!pre || !pace) return null;
  if (pre.type === 'fg') return [0.5, pace.T0 + 0.6];
  if (pre.type === 'ballOn') return [0.6, Math.min(4, pace.T0 - 0.2)];
  return [0.4, pace.T0 - 0.25];
}
const showing = (w, bt) => w && bt > w[0] && bt < w[1];
const leaving = (w, bt) => bt > w[1] - 0.45;

// The stat card for the scorebug (it lives inside the bug, in the player's team box), or null.
export function slotCard(pre, pace, bt, live, teams, playerOf) {
  const w = slotWindow(pre, pace), p = pre?.type === 'card' && playerOf(pre.id);
  if (!live || !p || !showing(w, bt)) return null;
  return { side: pre.side, player: p, team: teams[pre.side], lines: pre.lines, out: leaving(w, bt) };
}

// The graphics that rise out of the top of the bug. live: before the snap, with the play on screen.
export default function BroadcastSlot({ pre, pace, bt, live, play, teams, bug, playerOf, n }) {
  const w = slotWindow(pre, pace);
  if (!live || !showing(w, bt)) return null;
  const out = leaving(w, bt);
  if (pre.type === 'fg') return <FieldGoalBar key={`fg${n}`} out={out} bug={bug} dist={pre.dist} kicker={playerOf(pre.by)?.name} />;
  if (pre.type === 'drive') return <DriveSummary key={`dr${n}`} out={out} bug={bug} team={teams[pre.side]} plays={pre.plays} yards={pre.yards} time={pre.time} />;
  if (pre.type === 'ballOn') return <BallOnTag key={`bo${n}`} out={out} bug={bug} team={teams[play.off]} dir={play.off === 'away' ? 1 : -1} text={yardLineText(play.before.ballOn, teams[play.off], teams[play.def])} />;
  return null;
}

// Is anything in the slot up right now (so nothing else, like the KEY PLAY tag, goes up with it)?
export const slotBusy = (pre, pace, bt, live) => !!live && showing(slotWindow(pre, pace), bt);
