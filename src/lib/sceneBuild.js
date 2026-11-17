// Picks the right scene for a play report and builds it: runs, scrambles, sneaks and kneels (sceneRun), passes and sacks
// (scenePass), kicks (sceneKicks), flags before the snap and two-point tries. Returns a live Scene (sceneCore) that the
// broadcast steps forward frame by frame, plus rebuild() so a replay or the Back button can rewind it.
import { Scene, B } from './sceneCore.js';
import { frame, lineup, ev, huddleUp } from './sceneLineup.js';
import { buildRun, buildScramble, buildKneel, buildSpike } from './sceneRun.js';
import { buildPass } from './scenePass.js';
import { buildKickoff, buildPunt, buildKick } from './sceneKicks.js';

// A flag before the snap: the offender jumps early, the flag flies, everyone stands up.
function buildPenalty(S, lineups) {
  lineup(S, lineups, { huddle: true });
  const f = ev(S.play, 'flag')[0], who = f && S.by[f.on], t = S.T0 - 0.4;
  if (who) S.when(t, (s) => { const fwd = who.side === s.play.off ? s.dir : -s.dir; who.brain = B.to(who.x + fwd * 0.9, who.y, 4); s.setPose(who, 'stand'); });
  S.when(t + 0.3, (s) => { for (const a of s.actors) a.pose = a.pose || 'stand'; });
  S.flag = { t: t + 0.2, x: who ? who.x : S.los, y: who ? who.y : 0 };
  S.tEnd = t + 0.8;
}

// play: one play report. lineups: { home, away }. pace: { T0 } from the pacing director. seed: so a rewind plays the same.
export function buildScene(play, lineups, pace = {}, seed = 1) {
  const S = new Scene(play, (seed * 7919 + play.n * 104729) >>> 0);
  S.T0 = pace.T0 || 2.8; frame(S, play);
  const thr = ev(play, 'throw')[0];
  if (play.kind === 'kickoff') buildKickoff(S, lineups);
  else if (play.kind === 'punt') buildPunt(S, lineups);
  else if (play.kind === 'fg' || play.kind === 'xp') buildKick(S, lineups);
  else if (play.kind === 'penalty') buildPenalty(S, lineups);
  else if (play.kind === 'kneel') buildKneel(S, lineups);
  else if (play.kind === 'spike') buildSpike(S, lineups);
  else if (play.scramble) buildScramble(S, lineups);
  else if (play.kind === 'two') { frame(S, play, play.off === 'away' ? 98 : 2); if (thr) buildPass(S, lineups); else buildRun(S, lineups, play.headline === '2-PT GOOD' ? 3.5 : 1); }
  else if (play.kind === 'pass' || play.kind === 'sack' || thr) buildPass(S, lineups);
  else buildRun(S, lineups);
  if (S.huddle) huddleUp(S);   // now that everything is set from the real spots, start them in the huddle
  if (play.flagged && !S.flag) S.flag = { t: S.tEnd - 0.4, x: S.los, y: 2 };
  S.dur = S.tEnd + 2.4;
  S.rebuild = () => buildScene(play, lineups, pace, seed);
  return S;
}

// Steps a scene to time t (rebuilding it first if t is earlier than where it is). Returns the scene at t.
export function seek(S, t) {
  let cur = S.t > t + 1e-6 ? S.rebuild() : S;
  while (cur.t + 1 / 60 <= t) cur.update(1 / 60);
  return cur;
}
