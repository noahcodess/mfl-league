// What the end-of-game show puts on after the highlights: one graphic, sometimes two, picked by how much each matters
// tonight. Candidates: the matchup of the game (a close game: each side's best player), the game flow (a comeback or a
// back-and-forth game, drawn as the margin over time), the top storyline (a receiver who owned his man, a QB who couldn't
// miss...), a drastic ranking jump (7th to 1st, never small moves) and the final numbers (always there as the fallback).
import { halfStory } from './halftimeStats.js';
import { playerOfGame } from './playerOfGame.js';

const SECOND_AT = 45;   // a second graphic only when it matters this much

// The margin (home minus away) after every play, with where each quarter starts, for the flow chart.
export function gameFlow(plays) {
  const pts = [{ k: 0, m: 0 }], qs = [];
  plays.forEach((p, k) => {
    if (k && p.before.quarter !== plays[k - 1].before.quarter) qs.push({ k, q: p.before.quarter });
    const s = p.after?.score || p.before.score; pts.push({ k: k + 1, m: s.home - s.away });
  });
  return { pts, qs, n: plays.length };
}

function flowFacts(flow, win) {
  let worst = 0, changes = 0, lead = 0;
  for (const { m } of flow.pts) {
    const mine = win === 'home' ? m : -m; worst = Math.min(worst, mine);
    const now = Math.sign(m); if (now && lead && now !== lead) changes += 1; if (now) lead = now;
  }
  return { deficit: -worst, changes };
}

// A ranking move worth a graphic: a big climb into the top 4, or a new #1 from 3rd or lower.
export const drastic = (m) => m.from && ((m.from - m.to >= 4 && m.to <= 4) || (m.to === 1 && m.from >= 3));

// plays: the whole game. sideOf: id -> side. score: final. ot: overtimes played. moves: from rankMoves.
// Returns { story: halfStory over the whole game, picks: [{ kind, score, ... }] } with 1 or 2 picks.
export function pickPostGame(plays, sideOf, score, ot, moves) {
  const s = halfStory(plays, sideOf, score), win = score.home > score.away ? 'home' : 'away', margin = Math.abs(score.home - score.away), out = [];
  out.push({ kind: 'numbers', score: 18 });
  const st = [...s.stories].sort((a, b) => b.score - a.score)[0];
  if (st) out.push({ kind: 'story', st, score: Math.min(55, 15 + st.score / 5) });
  if (ot || margin <= 8) {
    const rows = Object.entries(s.players).filter(([id]) => sideOf[id]).map(([id, x]) => ({ player_id: id, team_id: sideOf[id], stats: x }));
    const best = ['away', 'home'].map((side) => playerOfGame(rows.filter((r) => r.team_id === side), side));
    if (best.every(Boolean)) out.push({ kind: 'matchup', best, margin, ot, score: ot ? 60 : margin <= 3 ? 55 : 42 });
  }
  const flow = gameFlow(plays), f = flowFacts(flow, win);
  if (f.deficit >= 10) out.push({ kind: 'flow', flow, win, ...f, score: 48 + f.deficit });
  else if (f.changes >= 3) out.push({ kind: 'flow', flow, win, ...f, score: 38 + f.changes * 2 });
  const jump = (moves || []).filter(drastic).sort((a, b) => (b.from - b.to) - (a.from - a.to) || a.to - b.to)[0];
  if (jump) out.push({ kind: 'rank', m: jump, score: 35 + (jump.from - jump.to) * 3 + (jump.to === 1 ? 12 : 0) });
  const ranked = out.sort((a, b) => b.score - a.score), picks = [ranked[0]];
  const next = ranked.find((c) => c.kind !== ranked[0].kind && c.score >= SECOND_AT);
  if (next) picks.push(next);
  return { story: s, picks };
}
