// Things people do during a live game, fed back into the engine so the rest of the game plays out from them:
// a timeout (a coach's, or the commissioner calling one for a team), and in test mode only, the commissioner's test tools
// (force overtime, force a win, set the score, set timeouts, run an onside kick, injure a player). Each input says before which play it happens (n).
// The engine is still the same seeded game: every play before n is identical, so nothing already shown ever changes.
const TEST = new Set(['ot', 'win', 'score', 'timeouts', 'onside', 'injury']);
export const isTestInput = (x) => TEST.has(x.kind);

// Runs before the engine creates play n. Returns true if something changed.
export function applyInputs(G) {
  const list = G.opts.inputs; if (!list?.length) return false;
  const s = G.s, n = G.plays.length + 1; let changed = false;
  G.applied ||= new Set();
  list.forEach((x, k) => {
    if (x.n !== n || G.applied.has(k)) return;
    G.applied.add(k); changed = true;
    const side = x.side, otherSide = side === 'home' ? 'away' : 'home';
    if (x.kind === 'timeout') {
      if (!(s.to[side] > 0)) return;   // none left: the call doesn't count
      s.to[side] -= 1; s.running = false;
      G.timeouts.push({ n, side, quarter: s.quarter, clock: s.clock, called: x.by || 'coach' });
    } else if (x.kind === 'ot') {   // the closest tie, fourth quarter, no time left: overtime starts from here
      const top = Math.max(s.score.home, s.score.away); s.score = { home: top, away: top };
      s.quarter = 4; s.clock = 0; s.phase = 'play'; s.running = false;
    } else if (x.kind === 'win') {   // this side ahead by 3 with no time left
      if (s.score[side] <= s.score[otherSide]) s.score[side] = s.score[otherSide] + 3;
      s.quarter = Math.max(4, s.quarter); s.clock = 0; s.phase = 'play'; s.running = false; s.ot = s.ot || 0;
    } else if (x.kind === 'score') {
      s.score = { home: Math.max(0, x.home | 0), away: Math.max(0, x.away | 0) };
    } else if (x.kind === 'onside') {   // whoever has the ball kicks an onside kick next (same odds as any other)
      s.phase = 'kickoff'; s.kicker = s.poss; s.freeKick = false; G.forceOnside = true;
    } else if (x.kind === 'injury') {   // someone on the next play with contact gets hurt (the usual kinds and lengths)
      G.forceInjury = true;
    } else if (x.kind === 'timeouts') {
      s.to[side] = Math.max(0, Math.min(3, x.count | 0));
    }
  });
  return changed;
}
