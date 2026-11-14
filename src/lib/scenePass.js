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
  const depths = DEPTH[play.call?.sub] || DEPTH.short, read = Object.fromEntries((ev(play, 'read')[0]?.open || []).map((o) => [o.id, o])); let spot = null, path = [1, 0];
  Object.entries(COVER).forEach(([rk, ck], i) => { // the routes, each covered
    const r = S.A[rk], cv = S.D[ck]; if (!r) return;
    const info = read[r.id], [a0, l0] = OFF[rk], mine = r === tgt, [ba, bl, ea, el, kind] = route(rk, l0, mine ? d : info?.depth ?? depths[rk] * (0.85 + ((play.n * 7 + i) % 5) * 0.08), play.n + i);
    const go0 = S.T0 + getGoing(r.p), v = yps(r.p), legA = Math.hypot(ba - a0, bl - l0) / v, legB = Math.hypot(ea - ba, el - bl) / (v * 0.92);
    let tB = go0 + legA, tE = tB + 0.12 + legB;
    if (mine) { const k = clamp((tCatch - go0) / (tE - go0), 0.75, 2.2); tB = go0 + legA * k; tE = tCatch; }   // he gets there as the ball does
    stay(r, go0); go(r, tB, ba, bl, S); if (kind !== 'go' && kind !== 'flat') { stay(r, tB + 0.14); pose(r, tB - 0.1, tB + 0.16, 'cut'); }   // a hard plant at the break
    go(r, tE, ea, el, S); if (mine) { spot = S.at(ea, el); const dx = ea - ba, dy = el - bl, m = Math.hypot(dx, dy) || 1; path = [dx / m, dy / m]; }
    if (!mine) { // he keeps working to get open instead of stopping at the end of his route
      const settle = kind === 'curl' || kind === 'stick', dx = settle ? 0 : (ea - ba), dy = settle ? 0 : (el - bl), m = Math.hypot(dx, dy) || 1, run = v * 0.8;
      if (settle) { go(r, tE + 0.9, ea - 0.4, el + (l0 >= 0 ? -1.2 : 1.2), S); go(r, tE + 1.8, ea - 0.2, el + (l0 >= 0 ? 0.4 : -0.4), S); }
      else go(r, tE + 3, ea + (dx / m) * run * 3 * (kind === 'go' || kind === 'post' ? 1 : 0.7) + (kind === 'dig' || kind === 'out' ? 1 : 0), clamp(el + (dy / m) * run * 3 * 0.8, -24, 24), S);
    }
    if (cv) { // his man: backpedal, open up, then run with him
      const sep = clamp(mine && cat?.sep != null ? cat.sep : info?.sep ?? 1.4, 0.2, 6), deep = ea >= 15, tr = (deep ? 0.6 : -0.6) * sep;   // exactly as open as the engine said
      stay(cv, S.T0 + 0.08 + getGoing(cv.p)); if (rk !== 'RB') { cv.back = [[S.T0, S.T0 + 0.75]]; go(cv, S.T0 + 0.75, OFF[rk][0] + 6.5, bl * 0.95, S); }
      go(cv, tB + 0.25, ba + 1 + tr, bl + (l0 >= 0 ? 0.6 : -0.6) * sep * 0.5, S); go(cv, tE + 0.1, ea + tr, el + (l0 >= 0 ? 1 : -1) * sep * 0.75, S);
      if (!mine) { const rk2 = r.keys[r.keys.length - 1]; go(cv, rk2.t + 0.15, (rk2.x - S.los) * S.dir + tr, rk2.y + (l0 >= 0 ? 1 : -1) * sep * 0.75, S); }
    }
  });
  const q = [-7, 0], tSack = sackEv ? S.T0 + sackEv.t : null, end = sackEv ? tSack : tCatch;
  trenches(S, true, end + 0.4, q);
  if (sackEv) { // the rusher who actually beat his man (or the blitzer, from his spot) gets home and drags him down
    const by = S.who(sackEv.by, play.def), last = by.keys[by.keys.length - 1];
    if (last.t < tSack - 0.3) { stay(by, S.T0 + 0.15); go(by, tSack - 0.1, -6.2, 0.5, S); }
    pose(by, tSack - 0.25, tSack + 0.05, 'tackle'); go(by, tSack + 0.05, -6.7, 0.3, S);
    stay(qb, tSack - 0.05); go(qb, tSack + 0.2, gain, 0, S); qb.down = tSack + 0.2; by.down = tSack + 0.22; return tSack + 0.35;
  }
  const pk = ev(play, 'pocket')[0], hurry = ev(play, 'pressure').find((e) => e.kind === 'hurry');
  if (pk?.move === 'step up') { stay(qb, Math.max(S.T0 + 0.9, tThrow - 0.8)); go(qb, tThrow - 0.35, -5.3, 0.4, S); }
  else if (pk?.move === 'slide' || tThrow - S.T0 > 3.6) { const sd = (play.n % 2 ? 1 : -1) * 3; stay(qb, Math.max(S.T0 + 0.9, tThrow - 1.1)); go(qb, tThrow - 0.3, -7.6, sd, S); }   // rolls out when it takes too long
  if (hurry && thr?.pressured) {
    const by = S.who(hurry.by, play.def), k = qb.keys[qb.keys.length - 1];
    if (by && by !== qb) { const bl = by.keys[by.keys.length - 1]; if (bl.t < tThrow - 0.4) stay(by, S.T0 + 0.2); go(by, tThrow + 0.1, (k.x - S.los) * S.dir + 0.6, k.y + 0.3, S); pose(by, tThrow - 0.2, tThrow + 0.1, 'tackle'); by.down = tThrow + 0.12; by.upAt = tThrow + 1.7; qb.down = tThrow + 0.2; qb.upAt = tThrow + 1.9; }
  }
  if (!thr) return tThrow;
  pose(qb, tThrow - 0.3, tThrow + 0.3, 'throw');
  const from = qb.keys[qb.keys.length - 1], hand = [from.x - S.dir * 0.2, from.y], duck = thr.pressured && hurry ? { wobble: true } : {};
  const arc = d <= 12 ? 0.9 + d * 0.07 : d <= 22 ? 1.4 + d * 0.1 : 2.4 + d * 0.15;   // a bullet on short throws, touch in the middle, a lob deep
  if (thr.away) { const sd = from.y >= 0 ? 1 : -1; fly(S, tThrow, tThrow + 1.1, hand, [from.x + S.dir * 9, sd * 28.5], 3.2, duck); S.ball.push({ t: tThrow + 1.1, kind: 'ground', x: from.x + S.dir * 9.5, y: sd * 28.8 }); return tThrow + 1.3; }
  if (!tgt || !spot) return tThrow;
  const res = cat?.result, [sx, sy] = spot, df = cat && S.who(cat.def, play.def), al = (sx - S.los) * S.dir;
  if (res === 'miss') { // off target, and it looks like what the call says
    const why = cat.why || 'overthrown', off = { overthrown: [S.dir * 5, 0, 1.3], 'too high': [S.dir * 3, 0, 1.6], 'behind him': [-path[0] * S.dir * 3, -path[1] * 3, 1], 'out of reach': [S.dir * 0.8, (sy >= 0 ? 1 : -1) * 3.2, 1] }[why] || [S.dir * 4, 0, 1.2];
    const land = [sx + off[0], clamp(sy + off[1], -28, 28)];
    fly(S, tThrow, tCatch + 0.2, hand, land, arc * off[2] + (why === 'too high' ? 2.5 : 0), duck); S.ball.push({ t: tCatch + 0.2, kind: 'ground', x: land[0], y: land[1] });
    pose(tgt, tCatch - 0.3, tCatch + 0.15, why === 'too high' || why === 'overthrown' ? 'catch' : 'reach');
    if (why === 'out of reach') { go(tgt, tCatch + 0.1, al + 0.5, sy + (sy >= 0 ? 1.4 : -1.4), S); tgt.down = tCatch + 0.12; tgt.upAt = tCatch + 1.3; }   // lays out for it
    else pose(tgt, tCatch + 0.5, tCatch + 1.9, 'drop');
    return tCatch + 0.7;
  }
  if (res === 'int') { // the defender jumps in front of him and takes it
    go(df, tCatch - 0.05, al - 0.7, sy - 0.2, S); fly(S, tThrow, tCatch, hand, S.at(al - 0.7, sy - 0.2), arc, duck); pose(df, tCatch - 0.3, tCatch + 0.1, 'catch'); hold(S, tCatch, df);
    pose(tgt, tCatch - 0.3, tCatch + 0.1, 'reach'); go(df, tCatch + 1.4, al - 7, sy * 0.8, S); df.down = tCatch + 1.45; return tCatch + 1.5;
  }
  fly(S, tThrow, tCatch, hand, spot, arc, duck);
  const high = d > 15 || cat?.contested; pose(tgt, tCatch - 0.32, tCatch + 0.12, high ? 'catch' : 'reach');
  if (res === 'catch') { hold(S, tCatch, tgt); return carryOut(S, tgt, [al, sy], tCatch, gain); }
  // drop or breakup: it pops loose, wobbling, and dies on the turf
  const brk = res === 'breakup', px = sx + S.dir * (brk ? -1.2 : 1.4), py = sy + (brk ? (sy >= 0 ? 2 : -2) : 1);
  if (brk && df) { go(df, tCatch, al + 0.3, sy + (sy >= 0 ? 0.7 : -0.7), S); pose(df, tCatch - 0.25, tCatch + 0.15, 'catch'); }
  fly(S, tCatch, tCatch + 0.55, spot, [px, py], brk ? 1.6 : 1.1, { wobble: true }); S.ball.push({ t: tCatch + 0.55, kind: 'ground', x: px, y: py });
  stay(tgt, tCatch + 0.1); pose(tgt, tCatch + 0.12, tCatch + 1.9, 'drop');
  return tCatch + 0.7;
}
