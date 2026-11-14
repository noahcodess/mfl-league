// Turns one play report into a scene the broadcast can act out: where all 20 players line up, where each one runs and when,
// what the ball does, and who ends up on the ground. It only acts out what the report says happened; it never decides
// anything. Runs, passes, sacks and scrambles are here; kicking plays are in sceneKicks.js.
const OFF = { OT1: [-1, -3.2], OG1: [-0.8, -1.6], C: [-0.6, 0], OG2: [-0.8, 1.6], OT2: [-1, 3.2], TE: [-1, 4.9], QB: [-4.5, 0], RB: [-4.5, 1.8], WR1: [-0.8, -14], WR2: [-0.8, 14] };
const DEF = { DE1: [1, -4.2], DT1: [1, -1.7], DL: [1, 0], DT2: [1, 1.7], DE2: [1, 4.2], LB1: [4.5, -2.6], LB2: [4.5, 2.6], CB1: [5.5, -14], CB2: [5.5, 14], SS: [11, 0.5] };
const MATCH = { OT1: 'DE1', OG1: 'DT1', C: 'DL', OG2: 'DT2', OT2: 'DE2' }, COVER = { WR1: 'CB1', WR2: 'CB2', TE: 'SS', RB: 'LB1' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ev = (play, type) => play.events.filter((e) => e.type === type);

// Scene helpers. Positions are [yards from the offense's goal line going its way (along), yards from the middle of the field (lat)].
export function newScene(play, lineups) {
  const dir = play.off === 'away' ? 1 : -1, los = play.off === 'away' ? play.before.ballOn : 100 - play.before.ballOn;
  const S = { play, dir, los, T0: 1.2, dur: 4, actors: [], A: {}, D: {}, by: {}, ball: [], first: play.before.toGo < 100 - play.before.ballOn ? los + dir * play.before.toGo : null, lineups };
  S.at = (along, lat) => [S.los + S.dir * along, clamp(lat, -25.5, 25.5)];
  return S;
}
export function add(S, p, side, along, lat, idle = 'stand') {
  if (!p) return null;
  const [x, y] = S.at(along, lat), a = { id: p.id, p, side, keys: [{ t: 0, x, y }], poses: [], down: null, idle, face: side === S.play.off ? S.dir : -S.dir };
  S.actors.push(a); S.by[p.id] = a; return a;
}
export function go(a, t, along, lat, S) { // be at this spot at time t
  const [x, y] = S.at(along, lat), last = a.keys[a.keys.length - 1];
  if (t <= last.t + 0.01) { last.x = x; last.y = y; } else a.keys.push({ t, x, y });
}
export const stay = (a, t) => { const k = a.keys[a.keys.length - 1]; if (t > k.t) a.keys.push({ t, x: k.x, y: k.y }); };
export const spotOf = (a, S) => { const k = a.keys[a.keys.length - 1]; return [(k.x - S.los) * S.dir, k.y]; };
export const pose = (a, t0, t1, name) => a.poses.push({ t0, t1, pose: name });
export const hold = (S, t, a) => S.ball.push({ t, kind: 'held', id: a.id });
export function fly(S, t, t1, from, to, h) { S.ball.push({ t, kind: 'fly', t1, x0: from[0], y0: from[1], x1: to[0], y1: to[1], h }); }

export function lineUp(S) {
  const o = S.lineups[S.play.off], d = S.lineups[S.play.def], slot = (list) => Object.fromEntries(list.map((s) => [s.key, s.player]));
  const O = slot(o.offense), Dd = slot(d.defense);
  Object.entries(OFF).forEach(([k, [a, l]]) => { S.A[k] = add(S, O[k], S.play.off, a, l, k.startsWith('O') || k === 'C' || k === 'TE' ? 'set' : 'stand'); });
  Object.entries(DEF).forEach(([k, [a, l]]) => { S.D[k] = add(S, Dd[k], S.play.def, a, l, k.startsWith('D') ? 'set' : 'stand'); });
  const any = (id, side) => S.by[id] || S.actors.find((a) => a.side === side);   // a sub who isn't drawn borrows a teammate
  S.who = (id, side) => any(id, side);
  if (S.A.C) S.ball.push({ t: 0, kind: 'ground', x: S.at(0, 0)[0], y: 0 });
}

// The line: blockers and rushers lock up. back: how far the pocket gives ground (pass) or pushes ahead (run, negative).
function trenches(S, back, tEnd) {
  Object.entries(MATCH).forEach(([ok, dk]) => {
    const ol = S.A[ok], dl = S.D[dk]; if (!ol || !dl) return;
    const [a, l] = OFF[ok]; stay(ol, S.T0); stay(dl, S.T0);
    go(ol, S.T0 + 0.7, a - back, l, S); go(dl, S.T0 + 0.7, a - back + 0.9, l, S); stay(ol, tEnd); stay(dl, tEnd);
    pose(ol, S.T0, tEnd, 'block'); pose(dl, S.T0, tEnd, 'block');
  });
}

// A ball carrier from `from` to the end of the play, meeting each tackler the report lists. Returns when it ends.
export function carryOut(S, c, from, t0, gain, opts = {}) {
  const tackles = ev(S.play, 'tackle').filter((e) => e.carrier === c.id);
  let [along, lat] = from, t = t0; const drift = lat >= 0 ? 1 : -1, td = S.play.result.td && !opts.noTd;
  const run = (to, bend) => { const d = Math.hypot(to - along, bend); t += Math.max(0.15, d / 7.6); along = to; lat = clamp(lat + bend, -24, 24); go(c, t, along, lat, S); };
  tackles.forEach((e, i) => {
    const made = e.result === 'made', meet = made ? gain : clamp(e.at ?? gain, Math.min(along, gain), Math.max(along, gain)), tk = S.who(e.def, S.play.def);
    run(meet, (i % 2 ? -1 : 1) * drift * (Math.abs(meet - along) > 4 ? 1.6 : 0.5));
    if (tk && tk !== c) { stay(tk, Math.max(S.T0, t - 1.1)); go(tk, t, along + 0.5, lat + 0.4, S); tk.down = t + 0.05; if (!made) tk.upAt = t + 1.4; }
    if (made) c.down = t + 0.05;
  });
  if (td) { run(Math.max(gain, 100 - S.play.before.ballOn) + 3.5, drift * 0.5); pose(c, t, t + 9, 'cheer'); }
  else if (!c.down) { run(gain, drift * 0.8); if (!S.play.result.oob) c.down = t + 0.05; else go(c, t + 0.4, gain + 0.5, lat + drift * 30, S); }
  S.actors.filter((a) => a.side !== c.side && !a.down && a.keys[a.keys.length - 1].t < t - 0.3).forEach((a) => { // everyone else chases
    const [x, y] = spotOf(a, S), far = Math.hypot(along - x, lat - y), k = Math.min(1, ((t - S.T0 - 0.6) * 5.5) / Math.max(1, far)) * 0.9;
    stay(a, S.T0 + 0.6); go(a, t, x + (along - x) * k, y + (lat - y) * k, S);
  });
  return t;
}

export function buildRun(S, gain) {
  const play = S.play, hand = ev(play, 'handoff')[0], qb = S.A.QB, c = play.scramble ? qb : S.who(hand?.to, play.off) || S.A.RB;
  const [type, sideName] = (hand?.gap || 'inside right').split(' '), sg = sideName === 'left' ? -1 : 1, gap = sg * (type === 'outside' ? 7.5 : 1.3);
  hold(S, S.T0, qb); let t = S.T0 + 0.55;
  if (play.scramble) { go(qb, S.T0 + 0.9, -7, 0, S); go(qb, S.T0 + 1.7, -5, gap * 3, S); t = S.T0 + 1.7; trenches(S, 1.2, t + 1); return carryOut(S, qb, [-5, gap * 3], t, gain); }
  if (c !== qb) { stay(c, S.T0 + 0.05); go(c, t, -3.6, gap * 0.25, S); go(qb, t, -3.9, gap * 0.25 - sg * 0.8, S); hold(S, t, c); go(qb, t + 0.8, -5.5, -sg * 3, S); }
  trenches(S, -0.7, t + 1.2);
  [['WR1', 'CB1'], ['WR2', 'CB2']].forEach(([w, cb]) => { if (S.A[w] && S.D[cb]) { stay(S.A[w], S.T0); go(S.A[w], S.T0 + 1, 4.5, OFF[w][1], S); pose(S.A[w], S.T0 + 1, 9, 'block'); } });
  go(c, t + 0.45, Math.min(0.3, gain), gap, S);
  return carryOut(S, c, [Math.min(0.3, gain), gap], t + 0.45, gain);
}

export function buildPass(S, gain) {
  const play = S.play, qb = S.A.QB, thr = ev(play, 'throw')[0], cat = ev(play, 'catch')[0], sackEv = ev(play, 'pressure').find((e) => e.kind === 'sack');
  hold(S, S.T0, qb); go(qb, S.T0 + 0.8, -7, 0, S);
  const tThrow = S.T0 + clamp(thr?.t ?? 2.4, 1.1, 3.4), tgt = thr && S.who(thr.target, play.off), d = thr?.air ?? 5, tCatch = tThrow + 0.35 + d / 24;
  Object.entries(COVER).forEach(([rk, ck]) => { // routes, with the coverage running along
    const r = S.A[rk], cv = S.D[ck]; if (!r) return;
    const [a0, l0] = OFF[rk], mine = r === tgt, depth = mine ? d : rk === 'RB' ? 2 : 11, lat = mine ? l0 * 0.62 : l0 * 0.9 + (rk === 'RB' ? 5 : 0), tArr = mine ? tCatch : S.T0 + 0.4 + depth / 7;
    stay(r, S.T0 + 0.1); go(r, S.T0 + (tArr - S.T0) * 0.55, a0 + (depth - a0) * 0.6, l0, S); go(r, tArr, depth, lat, S);
    if (cv) { stay(cv, S.T0 + 0.2); go(cv, tArr, depth + (mine && cat ? clamp(cat.sep ?? 1.5, 0.4, 4) : 1.6), lat + 0.7, S); }
  });
  const end = sackEv ? tThrow : tCatch;
  trenches(S, 1.4, end + 0.4);
  if (sackEv) { // the rusher gets home
    const by = S.who(sackEv.by, play.def); stay(by, tThrow - 0.9); go(by, tThrow, -7 + 0.5, 0.3, S); by.poses = []; go(qb, tThrow, gain, 0, S); qb.down = tThrow; by.down = tThrow + 0.05; return tThrow + 0.2;
  }
  if (!thr || !tgt) return tThrow;
  pose(qb, tThrow - 0.25, tThrow, 'throw'); qb.poseFrame = 1; pose(qb, tThrow, tThrow + 0.3, 'throw');
  const from = qb.keys[qb.keys.length - 1], spot = S.at(d, OFF[Object.keys(S.A).find((k) => S.A[k] === tgt)]?.[1] * 0.62 || 0);
  const res = cat?.result;
  fly(S, tThrow, tCatch, [from.x, from.y], res === 'miss' ? [spot[0] + S.dir * 3, spot[1] + 2] : spot, 2 + d * 0.16);
  pose(tgt, tCatch - 0.3, tCatch + 0.1, 'catch');
  if (res === 'catch') { hold(S, tCatch, tgt); return carryOut(S, tgt, [d, spot[1]], tCatch, gain); }
  if (res === 'int') { const df = S.who(cat.def, play.def); go(df, tCatch, d, spot[1], S); hold(S, tCatch, df); go(df, tCatch + 1.2, d - 6, spot[1] * 0.8, S); df.down = tCatch + 1.25; return tCatch + 1.3; }
  S.ball.push({ t: tCatch, kind: 'ground', x: spot[0] + S.dir * (res === 'miss' ? 3 : 1.2), y: spot[1] + (res === 'miss' ? 2 : 0.6) });
  if (res === 'breakup') { const df = S.who(cat.def, play.def); go(df, tCatch, d + 0.3, spot[1], S); pose(df, tCatch - 0.2, tCatch + 0.3, 'catch'); }
  return tCatch + 0.4;
}
