// How a receiver goes and gets the ball, from where it's thrown. In stride he never breaks stride: full speed, hands out in
// front. A ball up high: he gathers, slows a step and physically jumps for it. Low or a little behind: he slows and sinks
// to scoop it. Out ahead of him: he lays out and dives for it (only when there's no run after the catch to show).
// The ball always ends up in his hands (sceneBall), and a contested ball has the defender going up with him.

import { stepTo } from './sceneCore.js';

// cat: the catch event. d: air yards. Returns { place, how, h, slow, hop, dive }.
export function catchPlan(S, play, cat, d) {
  const res = cat?.result, yac = (play.result.gain || 0) - d, roll = S.rand();
  let place = 'stride';
  if (res === 'catch' && (cat.catchType === 'contested' || cat.catchType === 'one-handed')) place = 'high';
  else if (res === 'catch' && cat.catchType === 'over the shoulder') place = 'stride';
  else if (res === 'catch' || res === 'drop') place = roll < 0.6 ? 'stride' : roll < 0.75 ? 'high' : roll < 0.89 || res === 'drop' || yac > 1.5 || play.result.td ? 'low' : 'ahead';
  else if (cat?.contested || res === 'breakup') place = 'high';
  const deep = d > 20 || cat?.catchType === 'over the shoulder';
  const how = place === 'high' ? (cat?.catchType === 'one-handed' ? 'onehand' : 'highpoint') : place === 'low' ? 'scoop' : place === 'ahead' ? 'layout' : deep ? 'shoulder' : 'hands';
  return { place, how, h: place === 'high' ? 1.4 : place === 'low' ? 0.22 : 0.62, slow: place === 'high' ? 0.72 : place === 'low' ? 0.55 : 1, hop: place === 'high' ? 0.42 : 0, dive: place === 'ahead' };
}

// Puts the plan on the field: the slow-down on his way in, the jump, the dive (and the landing). at: where the ball goes.
export function playCatch(S, tgt, df, plan, tCatch, res, at) {
  if (plan.slow < 1) tgt.catchSlow = { from: tCatch - 0.38, k: plan.slow };
  if (plan.hop) { tgt.hop = { t0: tCatch - 0.26, dur: 0.52, h: plan.hop }; if (df && res !== 'catch') df.hop = { t0: tCatch - 0.24, dur: 0.5, h: plan.hop * 0.85 }; else if (df && plan.how !== 'onehand') df.hop = { t0: tCatch - 0.22, dur: 0.48, h: plan.hop * 0.7 }; }
  if (plan.dive) {
    S.when(tCatch - 0.2, (s) => { s.setPose(tgt, 'layout', 0.5); tgt.brain = (a, dt) => stepTo(a, at[0] + s.dir * 1.6, at[1], a.max, dt); });   // flying out for it
    S.when(tCatch + 0.28, (s) => s.knock(tgt, 1.1));                                                           // and hitting the turf with it
  } else S.when(tCatch - 0.3, (s) => s.setPose(tgt, plan.how, res === 'catch' ? 0.62 : 0.42));               // he holds it a beat before tucking it
}

// How high a hopping player is off the ground right now (yards).
export const hopAt = (a, t) => { const h = a.hop; if (!h || t < h.t0 || t > h.t0 + h.dur) return 0; const u = (t - h.t0) / h.dur; return 4 * h.h * u * (1 - u); };
