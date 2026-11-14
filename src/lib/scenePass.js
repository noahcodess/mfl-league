// Pass plays on the field: the QB takes the snap, drops with the ball by his ear and climbs or slides if the pocket
// moves; receivers run real routes (flat, slant, out, curl, dig, post, go) with a hard plant at the break while their
// man backpedals and turns to run with them; the line plays out each matchup; then the ball is caught, dropped, broken
// up, picked off or thrown away exactly as the report says.
import { go, stay, pose, hold, fly, carryOut, yps, getGoing, OFF, COVER, ev, clamp, trenches } from './sceneBuild.js';

const DEPTH = { quick: { WR1: 5, WR2: 4, TE: 4, RB: 1 }, short: { WR1: 8, WR2: 7, TE: 6, RB: 2 }, medium: { WR1: 15, WR2: 12, TE: 9, RB: 3 }, deep: { WR1: 30, WR2: 24, TE: 14, RB: 3 } };

// The route: where he breaks and where he ends up. [stem along, stem lat, end along, end lat, name]. out = 1 toward his sideline.
function route(slot, l0, d, n) {
  const out = l0 >= 0 ? 1 : -1, alt = (n + slot.length) % 2 === 0;
  if (d <= 2) return [1.2, l0, Math.max(d, 1), l0 + out * 6, 'flat'];
  if (d <= 6) return slot === 'TE' ? [d, l0, d, l0 + out * 1.5, 'stick'] : [Math.max(1.5, d - 2.5), l0, d, l0 - out * 3.2, 'slant'];
  if (d <= 11) return alt ? [d, l0, d, l0 + out * 4.5, 'out'] : [d + 1.6, l0, d, l0 - out * 0.8, 'curl'];
  if (d <= 18) return [d, l0, d, l0 - out * (slot === 'TE' ? 3 : 6), 'dig'];
  return alt || slot === 'TE' ? [d, l0 + out * 1.2, d, l0 + out * 1.5, 'go'] : [d - 8, l0, d, l0 - out * 5, 'post'];
}

export function buildPass(S, gain) {
  const play = S.play, qb = S.A.QB, thr = ev(play, 'throw')[0], cat = ev(play, 'catch')[0], sackEv = ev(play, 'pressure').find((e) => e.kind === 'sack');
  hold(S, S.T0 + 0.12, qb); go(qb, S.T0 + 0.85, -7, 0, S); qb.back = [[S.T0, S.T0 + 0.85]];
  const tThrow = S.T0 + clamp(thr?.t ?? 2.4, 1.0, 6.2), tgt = thr && !thr.away && S.who(thr.target, play.off), d = thr?.air ?? 5, tCatch = tThrow + 0.35 + d / 24;
  const depths = DEPTH[play.call?.sub] || DEPTH.short; let spot = null;
  Object.entries(COVER).forEach(([rk, ck], i) => { // the routes, each covered
    const r = S.A[rk], cv = S.D[ck]; if (!r) return;
    const [a0, l0] = OFF[rk], mine = r === tgt, [ba, bl, ea, el, kind] = route(rk, l0, mine ? d : depths[rk] * (0.85 + ((play.n * 7 + i) % 5) * 0.08), play.n + i);
    const go0 = S.T0 + getGoing(r.p), v = yps(r.p), legA = Math.hypot(ba - a0, bl - l0) / v, legB = Math.hypot(ea - ba, el - bl) / (v * 0.92);
    let tB = go0 + legA, tE = tB + 0.12 + legB;
    if (mine) { const k = clamp((tCatch - go0) / (tE - go0), 0.75, 2.2); tB = go0 + legA * k; tE = tCatch; }   // he gets there as the ball does
    stay(r, go0); go(r, tB, ba, bl, S); if (kind !== 'go' && kind !== 'flat') { stay(r, tB + 0.1); pose(r, tB - 0.06, tB + 0.12, 'cut'); }
    go(r, tE, ea, el, S); if (mine) spot = S.at(ea, el);
    if (!mine) go(r, tE + 1.2, ea + (kind === 'curl' || kind === 'stick' ? 0 : 3), el + (kind === 'out' || kind === 'flat' ? (l0 >= 0 ? 1.5 : -1.5) : 0), S);
    if (cv) { // his man: backpedal, open up, then run with him
      const sep = mine && cat ? clamp(cat.sep ?? 1.5, 0.3, 4) : 1.4, deep = ea >= 15, tr = (deep ? 0.6 : -0.6) * sep;
      stay(cv, S.T0 + 0.08 + getGoing(cv.p)); if (rk !== 'RB') { cv.back = [[S.T0, S.T0 + 0.75]]; go(cv, S.T0 + 0.75, OFF[rk][0] + 6.5, bl * 0.95, S); }
      go(cv, tB + 0.25, ba + 1 + tr, bl + (l0 >= 0 ? 0.6 : -0.6), S); go(cv, tE + 0.1, ea + tr, el + (mine ? sep * 0.5 : 0.8), S);
    }
  });
  const q = [-7, 0], end = sackEv ? tThrow : tCatch;
  trenches(S, true, end + 0.4, q);
  if (sackEv) { // the rusher gets home and drags him down
    const by = S.who(sackEv.by, play.def); by.poses = []; stay(by, tThrow - 0.5); go(by, tThrow, -6.4, 0.3, S); pose(by, tThrow - 0.25, tThrow + 0.05, 'tackle');
    stay(qb, tThrow - 0.1); go(qb, tThrow + 0.15, gain, 0, S); qb.down = tThrow + 0.15; by.down = tThrow + 0.2; return tThrow + 0.3;
  }
  const pk = ev(play, 'pocket')[0], hurry = ev(play, 'pressure').find((e) => e.kind === 'hurry');
  if (pk?.move === 'step up') { stay(qb, Math.max(S.T0 + 0.9, tThrow - 0.8)); go(qb, tThrow - 0.35, -5.3, 0.4, S); }
  else if (pk?.move === 'slide' || tThrow - S.T0 > 3.6) { const sd = (play.n % 2 ? 1 : -1) * 3; stay(qb, Math.max(S.T0 + 0.9, tThrow - 1.1)); go(qb, tThrow - 0.3, -7.6, sd, S); }   // rolls out when it takes too long
  if (hurry && thr?.pressured) {
    const by = S.who(hurry.by, play.def), k = qb.keys[qb.keys.length - 1];
    if (by && by !== qb) { by.poses = []; stay(by, tThrow - 0.5); go(by, tThrow + 0.1, (k.x - S.los) * S.dir + 0.6, k.y + 0.3, S); pose(by, tThrow - 0.2, tThrow + 0.1, 'tackle'); by.down = tThrow + 0.12; by.upAt = tThrow + 1.7; qb.down = tThrow + 0.2; qb.upAt = tThrow + 1.9; }
  }
  if (!thr) return tThrow;
  pose(qb, tThrow - 0.3, tThrow + 0.3, 'throw');
  const from = qb.keys[qb.keys.length - 1], hand = [from.x - S.dir * 0.2, from.y];
  if (thr.away) { const sd = from.y >= 0 ? 1 : -1; fly(S, tThrow, tThrow + 1.1, hand, [from.x + S.dir * 9, sd * 28.5], 3.2); S.ball.push({ t: tThrow + 1.1, kind: 'ground', x: from.x + S.dir * 9.5, y: sd * 28.8 }); return tThrow + 1.3; }
  if (!tgt || !spot) return tThrow;
  const res = cat?.result, [sx, sy] = spot, df = cat && S.who(cat.def, play.def);
  if (res === 'miss') { // off target: sails past his reach
    fly(S, tThrow, tCatch + 0.15, hand, [sx + S.dir * 2.2, sy + 1.1], 2 + d * 0.16); pose(tgt, tCatch - 0.3, tCatch + 0.2, 'reach');
    S.ball.push({ t: tCatch + 0.15, kind: 'ground', x: sx + S.dir * 2.6, y: sy + 1.3 }); pose(tgt, tCatch + 0.4, tCatch + 1.8, 'drop'); return tCatch + 0.6;
  }
  fly(S, tThrow, tCatch, hand, spot, 2 + d * 0.16);
  const high = d > 15 || cat?.contested; pose(tgt, tCatch - 0.32, tCatch + 0.12, high ? 'catch' : 'reach');
  if (res === 'catch') { hold(S, tCatch, tgt); return carryOut(S, tgt, [(sx - S.los) * S.dir, sy], tCatch, gain); }
  if (res === 'int') { go(df, tCatch, (sx - S.los) * S.dir + 0.2, sy, S); pose(df, tCatch - 0.3, tCatch + 0.1, 'catch'); hold(S, tCatch, df); go(df, tCatch + 1.3, (sx - S.los) * S.dir - 6, sy * 0.8, S); df.down = tCatch + 1.35; return tCatch + 1.4; }
  // drop or breakup: the ball pops loose and dies on the turf
  const px = sx + S.dir * (res === 'breakup' ? -0.8 : 1.2), py = sy + (res === 'breakup' ? 1.5 : 0.8);
  if (res === 'breakup' && df) { go(df, tCatch, (sx - S.los) * S.dir + 0.3, sy + 0.2, S); pose(df, tCatch - 0.25, tCatch + 0.15, 'catch'); }
  fly(S, tCatch, tCatch + 0.5, spot, [px, py], 1.1); S.ball.push({ t: tCatch + 0.5, kind: 'ground', x: px, y: py });
  stay(tgt, tCatch + 0.1); pose(tgt, tCatch + 0.12, tCatch + 1.9, 'drop');
  return tCatch + 0.6;
}
