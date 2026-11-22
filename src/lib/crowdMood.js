// Does the home crowd still believe? Stadium Pulse (stadiumPulse.js) multiplies by this, 0-1.3. It works out:
//  - whether the game is still alive: how many scores the home team needs against how many possessions it can still get
//    (about one every 150-190 seconds of game clock). Down 15 with 9 seconds left, or the visitors kneeling
//    it out: the house is dead, no pulse at all.
//  - blowouts: down 20 or more the meter pretty much never shows; down 14-19 it's muted.
//  - runs, like basketball: points the home team has scored since the visitors last did (a 14-0 run) and the scoring margin
//    over the last 9 minutes of game clock. A run brings a quiet crowd back to life, even while still down 14 or 17.
//  - a visiting run takes the air out of the building; a home team cruising with a big lead relaxes the crowd, and once the
//    win is wrapped up they're celebrating more than rattling anybody.
// Returns { b (belief), run (home's unanswered points), state }. Only ever reads the game; it never changes a result.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PER_POSS = 190;   // game seconds per possession (a drive and the other side's drive in between, the league average)
const HURRY = 150;      // ...and when the home team is behind and in a hurry

// Seconds of game clock gone. Overtime counts as the very end.
const gone = (q, clock, qlen) => (q >= 5 ? 4 * qlen : (q - 1) * qlen + (qlen - clock));

// Unanswered points and the last-9-minutes margin for the home side, from the scoring log (G.scoring).
export function homeRun(G) {
  const s = G.s, qlen = s.qlen || 360, now = gone(s.quarter, s.clock, qlen), log = G.scoring || [];
  let run = 0, away = 0;
  for (let i = log.length - 1; i >= 0; i--) { if (log[i].side === 'away') { away = 0; break; } run += log[i].pts; }
  for (let i = log.length - 1; i >= 0 && log[i].side === 'away'; i--) away += log[i].pts;
  const recent = log.filter((e) => now - gone(e.quarter, e.clock, qlen) <= 540).reduce((n, e) => n + (e.side === 'home' ? e.pts : -e.pts), 0);
  return { run, awayRun: away, recent };
}

export function crowdBelief(G, play = null) {
  const s = G.s, qlen = s.qlen || 360, left = s.ot ? qlen : Math.max(0, 4 * qlen - gone(s.quarter, s.clock, qlen));
  const lead = s.score.home - s.score.away, { run, awayRun, recent } = homeRun(G), surge = Math.max(run, recent);
  if (play?.kind === 'kneel' || play?.call?.type === 'kneel') return { b: 0, run, state: 'over' };   // victory formation
  if (s.ot) return { b: 1.1, run, state: 'clutch' };
  if (lead < 0) {
    const d = -lead, need = Math.ceil(d / 8), have = left / HURRY;
    if (have < need - 0.25) return { b: 0, run, state: 'dead' };                                    // out of time: they're heading for the exits
    let b = clamp(0.8 + 0.08 * (have - need), 0.55, 1);                                              // still alive: they want the ball back
    const lift = clamp(surge / 14, 0, 1.3);                                                          // a run puts them back on their feet
    const muted = d >= 20 ? 0.12 : d >= 14 ? 0.6 : 1;
    b *= Math.min(1, muted + 0.45 * lift * (d >= 20 ? 0.8 : 1));
    if (run >= 7 && d <= 17) b += 0.1 * Math.min(3, Math.floor(run / 7));                            // 7-0, 14-0, 21-0: louder every score
    if (awayRun >= 14) b *= 0.8;                                                                     // the visitors just ripped off two scores
    return { b: clamp(b, 0, 1.3), run, state: run >= 10 || recent >= 10 ? 'comeback' : d >= 20 ? 'blowout' : 'trailing' };
  }
  const theirs = Math.ceil((lead + 1) / 8), chances = left / PER_POSS + 1;   // can the visitors still catch up?
  if (lead > 0 && chances < theirs - 0.25) return { b: 0.3, run, state: 'won' };                     // wrapped up: celebrating, not rattling anyone
  if (lead >= 21) return { b: 0.7, run, state: 'cruising' };
  return { b: clamp(1 + (run >= 14 ? 0.08 : 0) - (awayRun >= 14 ? 0.12 : 0), 0, 1.15), run, state: 'normal' };
}
