// Shared pieces of every scrimmage play: lining up (with a huddle break when there's time), the line battle, pursuit, and
// the tackle. The tackle goes to the engine's tackler if he can actually get there at his own speed; if he can't, the
// closest defender who can makes it, so nobody ever has to warp across the field.
import { presses } from './sceneCover.js';
import { B, clamp, dist, stepTo, getGoing } from './sceneCore.js';
import { FORMATIONS } from './playbookFormations.js';   // a.pre: where a player jogs to before the snap (sceneCore runs it)

export const OFF = { OT1: [-1.6, -4], OG1: [-1.45, -2], C: [-1.3, 0], OG2: [-1.45, 2], OT2: [-1.6, 4], TE: [-1.7, 6.2], QB: [-4.5, 0], RB: [-4.5, 1.8], WR1: [-0.8, -14], WR2: [-0.8, 14] };
export const DEF = { DE1: [1.7, -5], DT1: [1.6, -2.1], DL: [1.6, 0], DT2: [1.6, 2.1], DE2: [1.7, 5], LB1: [4.5, -3.2], LB2: [4.5, 3.2], CB1: [5.5, -14], CB2: [5.5, 14], SS: [11, 0.5] };
export const MATCH = { OT1: 'DE1', OG1: 'DT1', C: 'DL', OG2: 'DT2', OT2: 'DE2' }, COVER = { WR1: 'CB1', WR2: 'CB2', TE: 'SS', RB: 'LB1' };
export const ev = (play, type) => play.events.filter((e) => e.type === type);
const STANCE = (k) => (/^(OT|OG|C)$/.test(k) || k === 'TE' ? 'olset' : k === 'QB' ? 'qbset' : k === 'RB' ? 'rbset' : k.startsWith('WR') ? 'wrset' : /^D/.test(k) ? 'dlset' : k.startsWith('LB') ? 'lbset' : 'cbset');

// Field helpers on the scene: S.dir (+1 away team going right), S.los (absolute yard line), S.at(along, lat) -> [x, y].
export function frame(S, play, losOverride) {
  S.dir = play.off === 'away' ? 1 : -1;
  S.los = losOverride ?? (play.off === 'away' ? play.before.ballOn : 100 - play.before.ballOn);
  S.at = (along, lat) => [S.los + S.dir * along, clamp(lat, -26.2, 26.2)];
  S.along = (a) => (a.x - S.los) * S.dir;
}

// Lines everyone up for a snap in the play's formation, with the defense matching it (corners over their receivers, a
// linebacker out over a back split wide). opts: { under (QB under center), huddle (break the huddle and jog in) }.
export function lineup(S, lineups, opts = {}) {
  const play = S.play, slot = (list) => Object.fromEntries(list.map((s) => [s.key, s.player]));
  const O = slot(lineups[play.off].offense), Dd = slot(lineups[play.def].defense), A = {}, D = {};
  const place = (p, side, [al, lat], key) => {
    const [x, y] = S.at(al, lat), a = S.add(p, side, x, y, side === play.off ? S.dir : -S.dir, STANCE(key));
    if (a) a.key = key;
    return a;
  };
  const spots = FORMATIONS[play.call?.form]?.spots || {};
  Object.entries(OFF).forEach(([k, spot]) => { A[k] = place(O[k], play.off, opts.under && k === 'QB' ? [-2.2, 0] : opts.under && k === 'RB' ? [-6.5, 0] : spots[k] || spot, k); });
  const lat = (k, fb) => (A[k] ? (A[k].y - (S.at(0, 0)[1])) : fb);
  const off = (k) => (presses(S, Dd[k]) ? 1.3 : 5.5);   // a corner in press walks up on his man
  const dspot = { ...DEF, CB1: [off('CB1'), lat('WR1', -14)], CB2: [off('CB2'), lat('WR2', 14)], SS: [11, clamp(lat('TE', 6) * 0.15, -3, 3)] };
  if (Math.abs(lat('RB', 0)) > 6) dspot.LB1 = [4, lat('RB', 0) * 0.85];   // a back split out wide gets a linebacker over him
  Object.entries(DEF).forEach(([k]) => { D[k] = place(Dd[k], play.def, dspot[k], k); });
  if (A.QB) { A.QB.qb = true; if (opts.under) A.QB.idle = 'rbset'; }
  S.ball.x = S.los; S.ball.y = 0; S.ball.h = 0.12;
  if (opts.huddle && S.T0 >= 3) S.huddle = true;   // they break the huddle (huddleUp, once the play is built from the real spots)
  S.lines = { los: S.los, first: play.before.ballOn + play.before.toGo < 100 ? S.los + S.dir * play.before.toGo : null };
  return { A, D };
}

// Break the huddle: everyone starts in the huddle and jogs to his spot, set and still well before the snap. Runs after the
// play is built, so routes, blocks and coverage are all worked out from where players really line up.
export function huddleUp(S) {
  const play = S.play, ready = S.T0 - 1.3, breakAt = Math.max(0.4, ready - 2.4);   // huddle up, then a brisk 2-3 second walk to the line
  S.breakAt = breakAt;   // the crowd sound keys off it (the whiteout song stops as they break)
  for (const a of S.actors) {
    const sx = a.x, sy = a.y, off = a.side === play.off, [hx, hy] = off ? S.at(-8 + S.rand() * 1.5, sy * 0.15) : S.huddleD ? S.at(8 + S.rand() * 1.5, sy * 0.13) : S.at(S.along(a) + 3.5, sy * 0.55);   // huddleD: the defense in a real huddle too (the whiteout cutscene)
    a.x = hx; a.y = hy; a.pre = { x: sx, y: sy, at: breakAt + S.rand() * 0.25, speed: Math.min(7.5, Math.max(3.2, dist(hx, hy, sx, sy) / Math.max(0.6, ready - breakAt))) };
  }
}

// The line. pass: true for pass protection. rush: { defId: seconds until he gets home } (only winners matter). aim: the QB actor.
// blocks: { defId: 'pancake' | 'drive' | 'shed' } for runs. Each pair keeps its own rhythm so nobody moves in sync.
// The trenches. Pass plays: at the snap the line kicks back about a yard into its pass set (tackles a bit deeper and
// wider) and holds a pocket that slowly gives ground, faster for a lineman who's losing. Rushers fight in front of their
// man; one who wins breaks free just in time to reach the QB at the moment the engine says (the sack, the hit as he
// throws, or right after the release), never early to stand in front of him. Run plays: the line fires out a yard and
// drives its man; a lineman whose man is out of the play (or who wins fast) climbs to block a linebacker or the safety
// in the runner's way. contact: { [rusher id]: time he reaches the QB }. throwAt: when the ball comes out.
export function lineFight(S, A, D, pass, { rush = {}, blocks = {}, qb = null, carrier = null, contact = {}, throwAt = null } = {}) {
  const dir = S.dir, taken = new Set();
  Object.entries(MATCH).forEach(([ok, dk]) => {
    const ol = A[ok], dl = D[dk]; if (!ol || !dl) return;
    const ph = S.rand() * 6.28, per = 2.6 + S.rand() * 2.2, win = rush[dl.id], move = blocks[dl.id], tackle = ok === 'OT1' || ok === 'OT2';
    const home = ol.y, setBack = tackle ? 1.6 : 1.1, wide = tackle ? Math.sign(home || 1) * 0.6 : 0;
    const giveRate = pass ? (win != null && win < 4 ? 0.34 : 0.1) : 0;   // yards per second the pocket gives on his side
    let shed = false, climb = null;
    ol.brain = (a, dt, s) => {
      if (s.t < s.T0 + getGoing(a.p) * 0.6) return;
      const el = s.t - s.T0;
      if (pass) {
        if (shed) { s.setPose(a, 'driven'); stepTo(a, a.x - dir * 0.5, a.y, 1.2, dt); return; }
        s.setPose(a, Math.sin(s.t * 1.3 + ph) > 0 ? 'anchor' : 'block');
        const back = Math.min(setBack + Math.max(0, el - 0.5) * giveRate, 4.6);   // the pass set, then the pocket slowly gives
        stepTo(a, s.los - dir * back, home + wide + (dl.y - home) * 0.25 + Math.sin(s.t * per + ph) * 0.1, el < 0.5 ? 4 : 2.2, dt);
        return;
      }
      if (climb) { // second level: get between the linebacker and the runner and stay on him
        const c = carrier || qb, tx = climb.x - dir * 0.9, ty = climb.y + (c ? Math.sign(c.y - climb.y) * 0.5 : 0);
        s.setPose(a, 'drive'); stepTo(a, tx, ty, a.max * 0.8, dt);
        if (dist(a.x, a.y, climb.x, climb.y) < 1.4 && climb !== s.tackler) climb.blockedUntil = s.t + 0.12;
        return;
      }
      if (shed) { if (carrier) stepTo(a, carrier.x, carrier.y, a.max * 0.55, dt); return; }
      s.setPose(a, move === 'shed' ? 'driven' : 'drive');
      const fire = el < 0.45 ? s.los + dir * 0.9 : dl.x - dir * 1.2;   // fire out off the ball, then stay on his man
      stepTo(a, fire, dl.y + Math.sin(s.t * per + ph) * 0.12, 4.5, dt);
      // his man is out of the play (or on the ground): go find someone in the runner's way
      if (el > 0.6 && carrier && (dl.down || Math.abs(dl.y - carrier.y) > 5)) {
        const lb = ['LB1', 'LB2', 'SS'].map((k) => D[k]).filter((d) => d && !d.down && !taken.has(d) && (d.x - carrier.x) * dir > -1)
          .sort((m, n) => dist(m.x, m.y, a.x, a.y) - dist(n.x, n.y, a.x, a.y))[0];
        if (lb) { climb = lb; taken.add(lb); }
      }
    };
    dl.brain = (a, dt, s) => {
      if (s.t < s.T0) return;
      if (shed) return;
      if (pass) { // fight in front of his man, a yard off him, hands on
        s.setPose(a, win != null && win < 4 ? (Math.sin(s.t * per + ph) > 0 ? 'swim' : 'rush') : 'rush');
        stepTo(a, ol.x + dir * 1.0, ol.y + Math.sin(s.t * per + ph) * 0.35, 4, dt);
        return;
      }
      s.setPose(a, move === 'shed' ? 'swim' : move ? 'driven' : 'block');
      const push = move === 'pancake' || move === 'drive' ? -1.1 : 0.15;   // yards per second he gains (negative: driven back)
      stepTo(a, a.x - dir * push * 3, a.y + Math.sin(s.t * per + ph) * 0.3, Math.abs(push), dt);
    };
    if (pass && win != null && qb) { // he beats his man: break free just in time to get there when the engine says
      const arrive = contact[dl.id] ?? Math.max(S.T0 + win, (throwAt ?? S.T0 + win) + 0.2);
      const leave = Math.max(S.T0 + 0.5, arrive - 1.3);
      S.when(leave, (s) => { shed = true; s.setPose(ol, 'driven', 0.9); dl.pose = null; dl.brain = timed(qb, arrive); });
    }
    if (!pass && move === 'pancake') S.when(S.T0 + 0.9, (s) => { s.knock(dl, 1.6); });
    if (!pass && move === 'shed' && carrier) S.when(S.T0 + 0.7, () => { shed = true; dl.pose = null; dl.brain = B.pursue(carrier, dl.max * 0.9, 1); });
  });
}
// Runs at whatever speed gets him to the QB exactly at tArrive (never faster than his legs), then keeps going after him.
const timed = (qb, tArrive) => (a, dt, s) => stepTo(a, qb.x, qb.y, Math.min(a.max, dist(a.x, a.y, qb.x, qb.y) / Math.max(0.05, tArrive - s.t)), dt);

// Everyone on the other side (but `except`) chases the carrier from time t.
export function pursueAll(S, carrier, t, except = []) {
  S.when(t, (s) => { for (const a of s.actors) if (a.side !== carrier.side && !except.includes(a) && !a.down) { a.pose = null; a.brain = B.pursue(carrier, a.max * (0.86 + s.rand() * 0.1), 1.2 + s.rand()); } });
}

// The end of a carry: the carrier reaches `end` at tEnd and is tackled (or scores, or steps out). tk: who the engine says made it.
export function finishCarry(S, carrier, end, tEnd, { tk = null, td = false, oob = false, forced = false, fumble = null, reach = null } = {}) {
  const runDir = Math.sign(end[0] - carrier.x) || S.dir;
  const hit = !td || !!reach;   // he gets tackled (a reach for the goal line is a touchdown made while going down)
  if (reach) S.when(tEnd - 0.32, (s) => s.setPose(carrier, 'stretch', 0.7));   // stretching the ball over the line as he goes down
  if (hit && (!oob || forced)) S.when(Math.max(S.T0, tEnd - 2.2), (s) => { // pick whoever can really get there (closing burst included)
    const can = (a) => a && !a.down && dist(a.x, a.y, end[0], end[1]) <= a.max * 1.2 * (tEnd - s.t) + 2.5;
    const best = can(tk) ? tk : s.actors.filter((a) => a.side !== carrier.side && !a.down && a !== carrier).sort((m, n) => dist(m.x, m.y, end[0], end[1]) - dist(n.x, n.y, end[0], end[1]))[0] || tk;
    if (!best) return;
    const inside = oob ? -Math.sign(end[1]) * 3.2 : 0.2;   // driving him out: he comes at him from the inside
    best.pose = null; best.blockedUntil = 0; best.brain = B.meet(end[0] + runDir * (oob ? 0.2 : 0.7), end[1] + inside, oob ? tEnd - 0.2 : tEnd, best.max * 1.25); s.tackler = best;
  });
  // the last moment: a tackler on top of him wraps him up, one a few yards off lays out in a dive, and if nobody is close
  // enough the runner stumbles (tripped up, losing his feet) until someone actually gets a hand on him
  if (hit && !oob) S.when(tEnd - 0.4, (s) => {
    const tk2 = s.tackler; if (!tk2) return;
    const px = carrier.x + (carrier.vx || 0) * 0.4, py = carrier.y + (carrier.vy || 0) * 0.4;   // where the runner will be, not just the spot
    const reach = tk2.max * 1.25 * 0.4, d = Math.min(dist(tk2.x, tk2.y, end[0] + runDir * 0.7, end[1] + 0.2), dist(tk2.x, tk2.y, px, py));
    if (d <= reach + 0.8) { tk2.brain = B.pursue(carrier, tk2.max * 1.2, 0.5); s.when(tEnd - 0.2, (ss) => ss.setPose(tk2, ss.rand() < 0.5 ? 'wrap' : 'tackle', 0.6)); }   // he homes in on the man
    else if (d <= reach + 3.2) { s.when(tEnd - 0.25, (ss) => { ss.setPose(tk2, 'layout', 0.7); const dd = dist(tk2.x, tk2.y, carrier.x, carrier.y); tk2.brain = (a, dt) => stepTo(a, carrier.x, carrier.y, Math.min(dd / 0.25 + 2, a.max * 1.9), dt); }); }   // flying at him
    else { s.setPose(carrier, 'stumble', 0.9); tk2.brain = B.pursue(carrier, tk2.max * 1.15, 0.3); }
  });
  S.when(tEnd, (s) => {
    if (td && reach) { s.knock(carrier, 1.1); if (s.tackler && dist(s.tackler.x, s.tackler.y, carrier.x, carrier.y) < 2.4) s.knock(s.tackler, 1.4); s.when(s.t + 1.15, (ss) => { carrier.celebrate = true; ss.setPose(carrier, 'cheer'); }); return; }   // in! he gets up celebrating
    if (td) { // he scores: celebrate, teammates come over, the defense jogs off
      carrier.brain = B.to(carrier.x + runDir * 1.5, carrier.y, 3); carrier.celebrate = true; s.setPose(carrier, 'cheer');
      for (const a of s.actors) if (a !== carrier && a.side === carrier.side && dist(a.x, a.y, carrier.x, carrier.y) < 22) { a.pose = null; a.brain = B.gather(s, carrier.x, carrier.y, 2); s.when(s.t + 1.2, () => s.setPose(a, 'cheer')); }
      return;
    }
    if (oob) {
      carrier.brain = B.to(carrier.x + runDir * 1.5, carrier.y > 0 ? 28.5 : -28.5, 4.5);
      const tk2 = s.tackler;   // driven out: the shove, and the defender's momentum carries him over the line too
      if (forced && tk2 && dist(tk2.x, tk2.y, carrier.x, carrier.y) < 3.5) { s.star = { a: tk2, at: s.t + 0.3 }; s.setPose(tk2, 'tackle', 0.5); s.setPose(carrier, 'stumble', 0.8); tk2.oobOK = true; tk2.brain = B.to(carrier.x + runDir * 0.8, carrier.y > 0 ? 27.6 : -27.6, 4); }
      return;
    }
    // contact only: if nobody has a hand on him yet, he keeps stumbling forward until someone does (or he loses his feet)
    const wrapUp = (ss) => {
      ss.knock(carrier, 1.7); if (ss.tackler && dist(ss.tackler.x, ss.tackler.y, carrier.x, carrier.y) < 2.4) ss.knock(ss.tackler, 1.5);
      const by = ss.tackler || ss.actors.filter((x) => x.side !== carrier.side && !x.down).sort((m, n) => dist(m.x, m.y, carrier.x, carrier.y) - dist(n.x, n.y, carrier.x, carrier.y))[0];
      if (by) ss.star = { a: by, at: ss.t + 0.25 };   // the ring goes to the man who made the tackle
      if (fumble) { ss.loose(runDir * 3, (ss.rand() - 0.5) * 4, 4); const rec = ss.by[fumble.recoveredBy]; if (rec) ss.when(ss.t + 0.5, () => { rec.down = false; rec.brain = B.meet(ss.ball.x, ss.ball.y, ss.t + 0.6, rec.max, (r, s3) => { ss.knock(r); s3.give(r); }); }); }
      for (const a of ss.actors) if (!a.down && a !== carrier && a !== ss.tackler) { a.pose = null; a.brain = dist(a.x, a.y, carrier.x, carrier.y) < 16 ? B.gather(ss, carrier.x, carrier.y, 2.2) : B.to(a.x + (carrier.x - a.x) * 0.25, a.y + (carrier.y - a.y) * 0.25, 2); }
    };
    const close = () => s.actors.some((a) => a.side !== carrier.side && !a.down && dist(a.x, a.y, carrier.x, carrier.y) < 1.6);
    if (close()) wrapUp(s);
    else {
      s.setPose(carrier, 'stumble', 1.2); carrier.brain = B.to(carrier.x + runDir * 0.8, carrier.y, 1.2);   // fighting for the last bit, no hand on him yet
      if (s.tackler) { s.setPose(s.tackler, 'layout', 0.7); s.tackler.brain = B.pursue(carrier, s.tackler.max * 1.25, 0.2); }
      for (let k = 1; k <= 10; k++) s.when(s.t + k * 0.1, (ss) => { if (carrier.down) return; if (close() || k === 10) wrapUp(ss); });
    }
  });
}
