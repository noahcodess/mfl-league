// The play report: the full record the game engine writes for every snap. Everything else reads it and never changes it:
// stats add it up, animations and replays act it out, Next Gen numbers come from its speeds, the play-by-play reads its text.
// A play is { the situation before, the calls, a list of timed events, the result, the clock }.

// What can happen inside a play, in the order it happened. Every event has t (seconds after the snap) and the ids involved.
export const EVENTS = {
  block: 'A blocker against a rusher or defender: who won, the move that won it, by how much',     // { off, def, win: 'off' | 'def', move, margin, double }
  rush: 'One pass-rush matchup on the line: how many seconds the rusher needs to get home, and his move',  // { off, def, t, move }
  pressure: 'A rusher gets to the quarterback: a hurry, a hit or a sack',                           // { by, kind: 'hurry' | 'hit' | 'sack' }
  pocket: 'What the quarterback did back there: stepped up, slid, escaped, threw it away',          // { qb, move }
  pump: 'A pump fake before the throw (the defender may bite)',                                         // { qb }
  reach: 'Going down just short, the carrier stretches the ball over the line to gain or the goal line',  // { by, for: 'first' | 'goal' }
  read: 'The quarterback picks his target, and how open every receiver was',                        // { qb, target, open: [{ id, sep }] }
  throw: 'The ball leaves his hand',                                                                 // { qb, target, air, accuracy, pressured, onRun }
  catch: 'The ball arrives',                                                                         // { target, def, result: 'catch' | 'drop' | 'breakup' | 'int', type, sep, contested }
  handoff: 'The back takes it',                                                                      // { qb, to, gap }
  tackle: 'One tackle attempt',                                                                      // { def, carrier, result: 'made' | 'broken' | 'missed', move, at }
  speed: 'The fastest a player ran on this play',                                                    // { id, mph, yards }
  fumble: 'The ball comes out, and who got it',                                                      // { by, forcedBy, recoveredBy, lost }
  kick: 'A kickoff, punt, field goal or extra point',                                                // { kind, by, dist, hang, good, landOn }
  ret: 'A kick or punt return',                                                                      // { by, from, yards, fair, touchback }
  onside: 'An onside kick: how it was kicked, how far it went, who came up with it',                  // { kind, d, got, illegal, by, kicker, tackled, tackler, adv, lat }
  flag: 'A penalty',                                                                                 // { name, on, team, yards, accepted, auto1st }
  injury: 'A player is hurt',                                                                        // { id, weeks }
  celebrate: 'After a big play',                                                                     // { id, kind }
};

// A fresh report for the next snap. sit: the game state right before it.
export function newPlay(sit, n) {
  return {
    n, kind: null, call: null, defCall: null, off: sit.poss, def: sit.poss === 'home' ? 'away' : 'home',
    before: { quarter: sit.quarter, clock: sit.clock, down: sit.down, toGo: sit.toGo, ballOn: sit.ballOn, hash: sit.hash, score: { ...sit.score }, to: sit.to ? { ...sit.to } : null },   // to: timeouts left (scorebugs)
    events: [],
    result: { gain: 0, endOn: sit.ballOn, firstDown: false, td: false, safety: false, turnover: null, oob: false, points: null },
    clock: { playClockAtSnap: null, seconds: 0, stopped: false },
    text: '', headline: null, big: false, keyPlay: false,
  };
}

export function addEvent(play, type, t, data) {
  if (!EVENTS[type]) throw new Error(`Unknown play event: ${type}`);
  play.events.push({ type, t: Math.round(t * 100) / 100, ...data });
  return play;
}
export const eventsOf = (play, type) => play.events.filter((e) => e.type === type);

// Real-world speed for a Speed rating (99 is about 22.5 mph, 50 about 17), minus what he's lost running far on this play.
export const mph = (speedRating, tired = 0) => Math.round((12 + speedRating * 0.106) * (1 - tired) * 10) / 10;
