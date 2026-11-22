// Sacks, acted out a dozen ways (the engine already decided it's a sack, by whom, when and for how many yards; this only
// decides how it looks, and the quarterback always goes down on the engine's spot): wrapped up from his blind side, wrapped
// up head-on and driven onto his back, ROCKED by a rusher with a free run (he flies a couple of yards), tripped up at the
// ankles, spun down, caught from behind after stepping up, run down trying to scramble, sandwiched by two, the bull rush
// that drives the blocker into his lap, dragged down in a bear hug, a near escape (he spins out of one, the next one gets
// him) and, when the engine says the ball came out, the strip sack.
import { B, clamp, dist, stepTo } from './sceneCore.js';
import { ev } from './sceneLineup.js';

const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return [x / m, y / m]; };

// The rusher gets to the spot `to()` returns right at time t, coming in from direction `from` for the last few yards
// (lead: how far out he lines up the angle; stop: how far short of the target he ends).
function arrive(S, by, to, t, from, lead = 2.4, stop = 0) {
  by.fallFace = Math.abs(from[0]) > 0.15 ? -Math.sign(from[0]) : null;   // he goes down the way he was running at him
  S.when(Math.max(S.T0 + 0.4, t - 1.6), (s) => {
    by.pose = null;
    by.brain = (a, dt, ss) => {
      const [cx, cy] = to(), late = ss.t > t - 0.45, tx = cx + from[0] * (late ? stop : lead), ty = cy + from[1] * (late ? stop : lead);
      stepTo(a, tx, ty, Math.min(a.max * 1.3, dist(a.x, a.y, tx, ty) / Math.max(0.04, (late ? t : t - 0.45) - ss.t)), dt);
    };
  });
}
// Everyone near the quarterback drifts over to the pile.
const pile = (s, qb, skip) => { for (const a of s.actors) if (!a.down && !skip.includes(a) && a !== qb && dist(a.x, a.y, qb.x, qb.y) < 12) { a.pose = null; a.brain = B.gather(s, qb.x, qb.y, 2); } };
const KINDS = ['blind', 'headon', 'rocked', 'ankles', 'spin', 'stepup', 'scramble', 'sandwich', 'bull', 'drag', 'escape'];

function choose(r, mobile, move, room) {   // room: seconds from the snap to the sack (the longer ones need time to play out)
  const w = { blind: 2, headon: 2, rocked: 1.6, ankles: 1.2, spin: 1, stepup: 1.1, scramble: mobile ? 1.6 : 0.6, sandwich: 1, bull: move === 'bull rush' ? 2.2 : 0.3, drag: 1, escape: mobile ? 1.4 : 0.35 };
  const need = { escape: 2.7, scramble: 2.5, stepup: 2.3, drag: 2, rocked: 1.6, bull: 1.8 };
  for (const k in need) if (room < need[k]) w[k] = 0;
  let x = r * KINDS.reduce((n, k) => n + w[k], 0);
  return KINDS.find((k) => (x -= w[k]) < 0) || 'blind';
}

export function stageSack(S, play, qb, e) {
  const tS = S.T0 + clamp(e.t, 1.2, 6.2), by = S.by[e.by], d = S.dir, side = S.rand() < 0.5 ? 1 : -1;
  const F = S.at((play.result.played ?? play.result.gain) - 0.5, (S.rand() - 0.5) * 3), fum = ev(play, 'fumble')[0];
  const mates = S.actors.filter((a) => a.side !== qb.side && a !== by && Math.abs(S.along(a)) < 7).sort((m, n) => Math.abs(m.y - qb.y) - Math.abs(n.y - qb.y));
  let kind = fum ? 'strip' : choose(S.rand(), (qb.p?.r?.speed ?? 60) >= 74, e.move, tS - S.T0);
  if (!by || ((kind === 'sandwich' || kind === 'escape') && !mates[0])) kind = 'headon';
  S.sackKind = kind; S.tSack = tS; S.tEnd = tS + 0.25;
  const qbAt = (x, y, t, speed = 3, by2 = tS) => S.when(Math.max(S.T0 + 1, t), () => {   // he drifts there, quicker if that's what it takes to get there in time
    qb.brain = (a, dt, s) => stepTo(a, x, y, Math.min(a.max, Math.max(speed, dist(a.x, a.y, x, y) / Math.max(0.1, by2 - 0.1 - s.t))), dt);
  });
  const at = () => [qb.x, qb.y];
  const up = (s, a, t, o = {}) => {   // a rusher lands on top of him (drawn in front, a little behind where the quarterback goes down)
    if (a === qb) return s.knock(a, t, o);
    const f = a.fallFace ?? qb.vis?.face ?? 1; if (dist(a.x, a.y, qb.x, qb.y) < 1.6) { a.x = qb.x - f * 0.7; a.y = qb.y + 0.35; }
    s.knock(a, t, { face: f, ...o });
  };
  const cheer = (s) => s.when(s.t + 2, () => s.setPose(by, 'cheer', 1.1));   // the sack dance
  const hit = (s, back = false, dur = 0.36) => { s.star = { a: by, at: s.t + 0.2 }; up(s, qb, 1.9, { back, dur }); pile(s, qb, [by]); cheer(s); };
  qbAt(F[0], F[1], tS - 1);
  if (kind === 'blind' || kind === 'headon') {   // wrapped up from behind (pitches forward) or head-on (driven onto his back)
    arrive(S, by, at, tS, kind === 'blind' ? norm(-d * 0.7, side * 0.7) : norm(d, side * 0.4));
    S.when(tS - 0.18, (s) => s.setPose(by, 'wrap', 0.4));
    S.when(tS, (s) => { hit(s, kind === 'headon'); up(s, by, 1.6, { dur: 0.4 }); });
  } else if (kind === 'rocked') {   // a free run at him: he's blown up and flies a couple of yards before he lands
    const C = [F[0] + d * 2.2, F[1]]; qbAt(C[0], C[1], tS - 1.2);
    arrive(S, by, at, tS, norm(d, side * 0.25), 3.6);
    S.when(tS - 0.15, (s) => s.setPose(by, 'tackle', 0.6));
    S.when(tS, (s) => {
      s.hit = { t: s.t, amp: 2.4 }; s.star = { a: by, at: s.t + 0.25 }; s.setPose(qb, 'rocked', 0.5); qb.hop = { t0: s.t, dur: 0.48, h: 0.5 };
      qb.brain = (a, dt) => stepTo(a, F[0], F[1], 4.8, dt); by.brain = (a, dt) => stepTo(a, qb.x + d * 0.9, qb.y, 4.8, dt);
    });
    S.when(tS + 0.48, (s) => { up(s, qb, 1.9, { back: true, dur: 0.14 }); up(s, by, 1.6, { dur: 0.16 }); pile(s, qb, [by]); cheer(s); });
    S.tEnd = tS + 0.65;
  } else if (kind === 'ankles') {   // he dives at his feet; the quarterback stumbles forward and goes down
    qbAt(F[0] - d * 1.1, F[1], tS - 1, 3, tS - 0.3);
    arrive(S, by, at, tS - 0.3, norm(side, -d * 0.2), 2.4, 2.2);
    S.when(tS - 0.3, (s) => { s.setPose(by, 'layout', 0.5); const dd = dist(by.x, by.y, qb.x, qb.y); by.brain = (a, dt) => stepTo(a, qb.x, qb.y, dd / 0.3 + 1, dt); });
    S.when(tS, (s) => { up(s, by, 1.6, { dur: 0.12 }); s.setPose(qb, 'stumble', 0.5); qb.brain = B.to(F[0], F[1], 2.6); });
    S.when(tS + 0.45, (s) => hit(s, false, 0.3));
    S.tEnd = tS + 0.6;
  } else if (kind === 'spin' || kind === 'drag') {   // grabbed, then spun around and slung down, or dragged a yard in a bear hug
    const tC = tS - (kind === 'spin' ? 0.45 : 0.75);
    if (kind === 'drag') qbAt(F[0] - d * 1.1, F[1], tS - 1.4, 3, tC);
    arrive(S, by, at, tC, norm(side, d * 0.3), 2.4, 0.6);
    S.when(tC, (s) => { s.setPose(by, 'wrap', tS - tC + 0.1); by.brain = B.pursue(qb, 3, 0.5); s.setPose(qb, kind === 'spin' ? 'spin' : 'stumble', tS - tC); if (kind === 'drag') qb.brain = B.to(F[0], F[1], 1.5); });
    S.when(tS, (s) => { hit(s, false, 0.34); up(s, by, 1.6, { dur: 0.38 }); });
  } else if (kind === 'stepup') {   // he climbs the pocket away from the edge... and gets caught from behind
    qbAt(F[0] - d * 1.7, F[1], tS - 1.8, 3, tS - 0.85); qbAt(F[0], F[1], tS - 0.85, 4.2);
    arrive(S, by, at, tS, norm(-d, side * 0.5));
    S.when(tS - 0.2, (s) => s.setPose(by, 'wrap', 0.4));
    S.when(tS, (s) => { hit(s); up(s, by, 1.6, { dur: 0.4 }); });
  } else if (kind === 'scramble') {   // he breaks for the sideline and gets run down from behind
    qbAt(F[0], clamp(F[1] - side * 3.6, -20, 20), tS - 1.9, 4, tS - 1.05); qbAt(F[0], clamp(F[1] + side * 1.2, -22, 22), tS - 1.05, 4.6, tS + 0.3);
    arrive(S, by, at, tS - 0.28, norm(-d * 0.3, -side), 2.6, 2.1);
    S.when(tS - 0.28, (s) => { s.setPose(by, 'layout', 0.5); const dd = dist(by.x, by.y, qb.x, qb.y); by.brain = (a, dt) => stepTo(a, qb.x, qb.y, dd / 0.28 + 1, dt); });
    S.when(tS, (s) => { hit(s, false, 0.3); up(s, by, 1.6, { dur: 0.12 }); });
  } else if (kind === 'sandwich') {   // two of them get there at once, high and low
    const m = mates[0]; arrive(S, by, at, tS, norm(d, side)); arrive(S, m, at, tS, norm(d * 0.4, -side));
    S.when(tS - 0.18, (s) => { s.setPose(by, 'wrap', 0.4); s.setPose(m, 'tackle', 0.4); });
    S.when(tS, (s) => { s.hit = { t: s.t, amp: 1.4 }; hit(s, true, 0.3); up(s, by, 1.6, { dur: 0.36 }); up(s, m, 1.5, { dur: 0.3 }); });
  } else if (kind === 'bull') {   // he drives his blocker straight back into the quarterback's lap, sheds him and takes him down
    S.when(Math.max(S.T0 + 0.5, tS - 1.3), (s) => {
      const ol = s.actors.filter((a) => a.side === qb.side && a !== qb && !a.down).sort((m, n) => dist(m.x, m.y, by.x, by.y) - dist(n.x, n.y, by.x, by.y))[0];
      if (!ol || dist(ol.x, ol.y, by.x, by.y) > 3.5) return;
      ol.blockedUntil = 0; by.blockedUntil = 0; s.setPose(ol, 'driven', 1); s.setPose(by, 'drive', 0.95);
      const tq = tS - 0.35; ol.brain = (a, dt, ss) => { const tx = qb.x + d * 1.3, ty = qb.y; stepTo(a, tx, ty, dist(a.x, a.y, tx, ty) / Math.max(0.05, tq - ss.t), dt); };
      by.brain = (a, dt) => stepTo(a, ol.x + d * 0.9, ol.y, 9, dt);
      s.when(tq, (ss) => { up(ss, ol, 1.6, { back: true, dur: 0.3 }); ss.setPose(by, 'wrap', 0.45); by.brain = (a, dt) => stepTo(a, qb.x + d * 0.4, qb.y, 6, dt); });
    });
    S.when(tS, (s) => { hit(s, true, 0.34); up(s, by, 1.6, { dur: 0.38 }); });
  } else if (kind === 'escape') {   // he spins out of the first one... the next one cleans it up
    const m = mates[0], tE = tS - 1;
    qbAt(F[0] - d * 1.8, F[1], tS - 2, 3, tS - 1);
    arrive(S, by, at, tE, norm(d, side * 0.3), 2.4, 0.8);
    S.when(tE - 0.15, (s) => { s.setPose(by, 'tackle', 0.4); s.setPose(qb, 'spin', 0.4); });
    S.when(tE + 0.05, (s) => { by.brain = (a, dt) => stepTo(a, a.x - d * 2, a.y + side * 0.6, 6, dt); s.when(s.t + 0.2, (ss) => up(ss, by, 1.4, { dur: 0.25 })); qb.brain = B.to(F[0], F[1], 3.4); });
    arrive(S, m, at, tS, norm(-side * 0.6, d * 0.8));
    S.when(tS - 0.18, (s) => s.setPose(m, 'wrap', 0.4));
    S.when(tS, (s) => { s.star = { a: m, at: s.t + 0.2 }; up(s, qb, 1.9, { dur: 0.34 }); up(s, m, 1.6, { dur: 0.38 }); pile(s, qb, [m, by]); });
  } else {   // the strip sack: he chops at the ball as he gets there and it squirts loose
    arrive(S, by, at, tS, norm(-d * 0.5, side));
    S.when(tS - 0.16, (s) => s.setPose(by, 'swat', 0.4));
    S.when(tS, (s) => {
      hit(s); up(s, by, 1.5, { dur: 0.35 }); s.loose(d * 2.2, side * 2.4, 4);
      const rec = s.by[fum.recoveredBy];
      if (rec) s.when(s.t + 0.35, (ss) => { rec.down = false; rec.pose = null; rec.brain = B.meet(ss.ball.x, ss.ball.y, ss.t + 0.7, rec.max, (r, s3) => { s3.knock(r); s3.give(r); }); });
    });
    S.tEnd = tS + 1.2;
  }
}
