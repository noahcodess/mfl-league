// Sunday Night Football's starting lineups: early in the game the scorebug grows into a showcase of each team's offense
// (when it has the ball) and each team's defense (when it's on the field), the way NBC introduces them. Four showcases a
// game, all in the 1st quarter (the first few minutes when it fits), never on the first play, never on back-to-back plays,
// a team's offense before its defense with a few plays between, and never on a play that already has a cutscene. Planned
// from the plays alone, so it's known ahead of time (the commissioner sees a countdown to each one).
export const INTRO_AT = 0.5, INTRO_LEN = 8.2;   // seconds into the play's lead-up, and how long it stays up
export const INTRO_T0 = INTRO_AT + INTRO_LEN + 0.7;   // the lead-up a showcase play needs before the snap
const SNAP = new Set(['run', 'pass', 'sack', 'penalty']);

// { playIndex: { side, unit: 'O' | 'D' } }. cuts: playIndex -> cutscene (cutPlan), skipped.
export function introPlan(plays, cuts = {}) {
  const out = {}, used = [], oAt = {}, pend = { home: ['O', 'D'], away: ['O', 'D'] };
  const free = (i) => !out[i] && !cuts[i] && used.every((u) => Math.abs(u - i) >= 2);
  const put = (i, side, unit) => { out[i] = { side, unit }; used.push(i); pend[side] = pend[side].filter((u) => u !== unit); if (unit === 'O') oAt[side] = i; };
  const pass = (maxQ, strict) => plays.forEach((p, i) => {
    if (i < 1 || !SNAP.has(p.kind) || p.before.quarter > maxQ || !free(i)) return;
    if (pend[p.off].includes('O')) return put(i, p.off, 'O');
    const d = p.def;
    if (pend[d].includes('D') && (!strict || (!pend[d].includes('O') && i - oAt[d] >= 3))) put(i, d, 'D');
  });
  pass(1, true); pass(1, false); pass(2, false);   // in order if it fits, then whatever fits in the 1st quarter, then the 2nd as a last resort
  return out;
}

// For the commissioner: what's coming and when. i: the play on now. c: the broadcast clock. S: this play's scene.
// Returns { label, when } or null ('Dragons offense', 'in 3 plays' / 'in 5' / 'now').
export function introCountdown(plan, i, c, S, teams, done) {
  const next = Object.keys(plan).map(Number).filter((k) => k > i || (k === i && (c?.t ?? 0) < INTRO_AT + INTRO_LEN)).sort((a, b) => a - b)[0];
  if (next == null || done) return null;
  const x = plan[next], label = `${teams[x.side].nickname || teams[x.side].name} ${x.unit === 'O' ? 'offense' : 'defense'}`;
  if (next === i) return { label, when: (c?.t ?? 0) >= INTRO_AT ? 'now' : 'in 1' };
  if (next > i + 1) return { label, when: `in ${next - i} plays` };
  const left = Math.max(0, (S?.tEnd ?? 0) + 3.5 - (c?.t ?? 0)) + INTRO_AT;   // the rest of this play (plus the dead time), then its lead-up
  return { label, when: left > 15 ? 'next play' : `in ${Math.ceil(left)}` };
}

// The two slides for a unit: lineups[side].offense / .defense ([{ key, player }]).
export function introSlides(lineup, unit) {
  const list = unit === 'O' ? lineup.offense : lineup.defense, pick = (keys) => keys.map((k) => list.find((s) => s.key === k)).filter((s) => s?.player);
  return unit === 'O' ? [pick(['QB', 'RB', 'WR1', 'WR2', 'TE']), pick(['OT1', 'OG1', 'C', 'OG2', 'OT2'])] : [pick(['DE1', 'DT1', 'DL', 'DT2', 'DE2']), pick(['LB1', 'LB2', 'CB1', 'CB2', 'SS'])];
}
