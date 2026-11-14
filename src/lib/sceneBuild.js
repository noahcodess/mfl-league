// Turns one play report into a scene the broadcast can act out: where all 20 players line up, where each one runs and when,
// what the ball does, and who ends up on the ground. It only acts out what the report says happened; it never decides
// anything. Runs, passes, sacks and scrambles are here; kicking plays are in sceneKicks.js.
const OFF = { OT1: [-1, -4], OG1: [-0.8, -2], C: [-0.6, 0], OG2: [-0.8, 2], OT2: [-1, 4], TE: [-1.2, 6.2], QB: [-4.5, 0], RB: [-4.5, 1.8], WR1: [-0.8, -14], WR2: [-0.8, 14] };
const DEF = { DE1: [1, -5], DT1: [1, -2.1], DL: [1, 0], DT2: [1, 2.1], DE2: [1, 5], LB1: [4.5, -3.2], LB2: [4.5, 3.2], CB1: [5.5, -14], CB2: [5.5, 14], SS: [11, 0.5] };
const MATCH = { OT1: 'DE1', OG1: 'DT1', C: 'DL', OG2: 'DT2', OT2: 'DE2' }, COVER = { WR1: 'CB1', WR2: 'CB2', TE: 'SS', RB: 'LB1' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ev = (play, type) => play.events.filter((e) => e.type === type);
const rating = (p, k) => p?.r?.[k] ?? 60;
// Top speed in yards per second from his Speed rating (a 99 runs about 10.5, a 50 lineman about 7). get: seconds to get going.
export const yps = (p) => 3.4 + 0.072 * clamp(rating(p, 'speed'), 30, 99);
export const getGoing = (p) => 0.34 - 0.003 * clamp(rating(p, 'acceleration'), 30, 99);

// Scene helpers. Positions are [yards from the offense's goal line going its way (along), yards from the middle of the field (lat)].
export function newScene(play, lineups) {
  const dir = play.off === 'away' ? 1 : -1, los = play.off === 'away' ? play.before.ballOn : 100 - play.before.ballOn;
  const S = { play, dir, los, T0: 2.6, dur: 4, actors: [], A: {}, D: {}, by: {}, ball: [], first: play.before.toGo < 100 - play.before.ballOn ? los + dir * play.before.toGo : null, lineups };
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
  S.actors.forEach((a) => { // break the huddle and jog to the line
    const k = a.keys[0], [al, lat] = [(k.x - S.los) * S.dir, k.y], off = a.side === S.play.off;
    const from = off ? S.at(-7 - Math.abs(lat) * 0.05, lat * 0.25) : S.at(al + 4, lat * 0.6), arrive = S.T0 - 0.9 + Math.abs(lat) * 0.02;
    a.keys = [{ t: 0, x: from[0], y: from[1] }, { t: 0.5, x: from[0], y: from[1] }, { t: Math.min(S.T0 - 0.35, arrive), x: k.x, y: k.y }];
  });
  if (S.A.C) S.ball.push({ t: 0, kind: 'ground', x: S.at(0, 0)[0], y: 0 });
  if (S.A.C && S.A.QB) { const q = S.A.QB.keys[S.A.QB.keys.length - 1]; fly(S, S.T0, S.T0 + 0.12, S.at(0, 0), [q.x, q.y], 0.1); }   // the snap
}

// The line: blockers and rushers lock up. back: how far the pocket gives ground (pass) or pushes ahead (run, negative).
function trenches(S, back, tEnd) {
  Object.entries(MATCH).forEach(([ok, dk]) => {
    const ol = S.A[ok], dl = S.D[dk]; if (!ol || !dl) return;
    const [a, l] = OFF[ok]; stay(ol, S.T0); stay(dl, S.T0);
    go(ol, S.T0 + 0.55, a - back, l, S); go(dl, S.T0 + 0.55, a - back + 0.9, l, S);
    for (let t = S.T0 + 0.85, n = 0; t < tEnd; t += 0.3, n++) {   // hand fighting: they shove back and forth, locked together
      const push = (n % 2 ? 0.3 : -0.25) + (back < 0 ? -n * 0.12 : n * 0.05), side = (n % 3 - 1) * 0.25;
      go(ol, t, a - back - push, l + side, S); go(dl, t, a - back + 0.9 - push, l + side, S);
    }
    stay(ol, tEnd); stay(dl, tEnd);
    pose(ol, S.T0 + 0.1, tEnd, 'block'); pose(dl, S.T0, tEnd, 'block');
  });
}

// A ball carrier from `from` to the end of the play, meeting each tackler the report lists. Returns when it ends.
export function carryOut(S, c, from, t0, gain, opts = {}) {
  const tackles = ev(S.play, 'tackle').filter((e) => e.carrier === c.id);
  let [along, lat] = from, t = t0; const drift = lat >= 0 ? 1 : -1, td = S.play.result.td && !opts.noTd;
  const v = yps(c.p) * (opts.slow || 1), run = (to, bend) => { const d = Math.hypot(to - along, bend); t += Math.max(0.12, d / v); along = to; lat = clamp(lat + bend, -24, 24); go(c, t, along, lat, S); };
  tackles.forEach((e, i) => {
    const made = e.result === 'made', meet = made ? gain : clamp(e.at ?? gain, Math.min(along, gain), Math.max(along, gain)), tk = S.who(e.def, S.play.def);
    run(meet, (i % 2 ? -1 : 1) * drift * (Math.abs(meet - along) > 4 ? 1.6 : 0.5));
    if (tk && tk !== c) {
      stay(tk, Math.max(S.T0, t - 0.8)); go(tk, t, along + 0.4, lat + 0.3, S); tk.down = t + 0.05;
      if (!made) { // he whiffs and hits the turf while the carrier makes his move
        tk.upAt = t + 1.6; go(tk, t + 0.2, along + 1.2, lat + (e.move === 'juke' ? -0.9 : 0.6), S);
        const mv = { juke: 'juke', shake: 'juke', spin: 'spin', 'stiff arm': 'stiff', truck: 'block' }[e.move] || 'juke';
        pose(c, t - 0.28, t + 0.12, mv); if (mv === 'juke') { t += 0.1; go(c, t, along + 0.3, lat - drift * 1.4, S); lat -= drift * 1.4; }
      }
    }
    if (made) c.down = t + 0.05;
  });
  if (td) { run(Math.max(gain, 100 - S.play.before.ballOn) + 3.5, drift * 0.5); pose(c, t, t + 9, 'cheer'); }
  else if (!c.down) { run(gain, drift * 0.8); if (!S.play.result.oob) c.down = t + 0.05; else go(c, t + 0.4, gain + 0.5, lat + drift * 30, S); }
  S.actors.filter((a) => a.side !== c.side && !a.down && a.keys[a.keys.length - 1].t < t - 0.3).forEach((a) => { // everyone else chases
    const [x, y] = spotOf(a, S), far = Math.hypot(along - x, lat - y), k = Math.min(1, ((t - S.T0 - 0.4) * yps(a.p) * 0.8) / Math.max(1, far)) * 0.92;
    stay(a, S.T0 + 0.25 + getGoing(a.p)); go(a, t, x + (along - x) * k, y + (lat - y) * k, S);
  });
  return t;
}

export function buildRun(S, gain) {
  const play = S.play, hand = ev(play, 'handoff')[0], qb = S.A.QB, c = play.scramble ? qb : S.who(hand?.to, play.off) || S.A.RB;
  const [type, sideName] = (hand?.gap || 'inside right').split(' '), sg = sideName === 'left' ? -1 : 1, gap = sg * (type === 'outside' ? 7.5 : 1.3);
  hold(S, S.T0 + 0.12, qb); let t = S.T0 + 0.5;
  if (play.scramble) { go(qb, S.T0 + 0.9, -7, 0, S); go(qb, S.T0 + 1.7, -5, gap * 3, S); t = S.T0 + 1.7; trenches(S, 1.2, t + 1); return carryOut(S, qb, [-5, gap * 3], t, gain); }
  if (c !== qb) { stay(c, S.T0 + 0.05); go(c, t, -3.6, gap * 0.25, S); go(qb, t, -3.9, gap * 0.25 - sg * 0.8, S); hold(S, t, c); go(qb, t + 0.8, -5.5, -sg * 3, S); }
  trenches(S, -0.7, t + 1.2);
  [['WR1', 'CB1'], ['WR2', 'CB2']].forEach(([w, cb]) => { if (S.A[w] && S.D[cb]) { stay(S.A[w], S.T0); go(S.A[w], S.T0 + 1, 4.5, OFF[w][1], S); pose(S.A[w], S.T0 + 1, 9, 'block'); } });
  const hit = t + Math.hypot(3.9, gap) / yps(c.p);
  go(c, hit, Math.min(0.3, gain), gap, S);
  return carryOut(S, c, [Math.min(0.3, gain), gap], hit, gain);
}

export function buildPass(S, gain) {
  const play = S.play, qb = S.A.QB, thr = ev(play, 'throw')[0], cat = ev(play, 'catch')[0], sackEv = ev(play, 'pressure').find((e) => e.kind === 'sack');
  hold(S, S.T0 + 0.12, qb); go(qb, S.T0 + 0.8, -7, 0, S); qb.back = [[S.T0, S.T0 + 0.8]];
  const tThrow = S.T0 + clamp(thr?.t ?? 2.4, 1.1, 3.4), tgt = thr && S.who(thr.target, play.off), d = thr?.air ?? 5, tCatch = tThrow + 0.35 + d / 24;
  Object.entries(COVER).forEach(([rk, ck]) => { // routes, with the coverage running along
    const r = S.A[rk], cv = S.D[ck]; if (!r) return;
    const [a0, l0] = OFF[rk], mine = r === tgt, depth = mine ? d : rk === 'RB' ? 2 : 13, lat = mine ? l0 * 0.62 : l0 * 0.9 + (rk === 'RB' ? 5 : 0);
    const go0 = S.T0 + getGoing(r.p), fast = go0 + Math.hypot(depth - a0, lat - l0) / yps(r.p), tArr = mine ? Math.max(tCatch, fast) : fast;
    stay(r, go0); go(r, Math.min(fast, tArr) - (fast - go0) * 0.35, a0 + (depth - a0) * 0.65, l0, S); go(r, tArr, depth, lat, S);
    if (cv) { stay(cv, S.T0 + 0.1 + getGoing(cv.p)); if (rk !== 'RB') cv.back = [[S.T0, S.T0 + 0.7]]; go(cv, tArr, depth + (mine && cat ? clamp(cat.sep ?? 1.5, 0.4, 4) : 1.6), lat + 0.7, S); }
  });
  const end = sackEv ? tThrow : tCatch;
  trenches(S, 1.4, end + 0.4);
  if (sackEv) { // the rusher gets home
    const by = S.who(sackEv.by, play.def); stay(by, tThrow - 0.9); go(by, tThrow, -7 + 0.5, 0.3, S); by.poses = []; go(qb, tThrow, gain, 0, S); qb.down = tThrow; by.down = tThrow + 0.05; return tThrow + 0.2;
  }
  if (thr?.away) { // throws it out of bounds: over everyone's head, lands past the sideline
    pose(qb, tThrow - 0.32, tThrow + 0.25, 'throw'); const q = qb.keys[qb.keys.length - 1], sd = q.y >= 0 ? 1 : -1;
    fly(S, tThrow, tThrow + 1.1, [q.x, q.y], [q.x + S.dir * 9, sd * 28.5], 3.2); S.ball.push({ t: tThrow + 1.1, kind: 'ground', x: q.x + S.dir * 9.5, y: sd * 28.8 });
    return tThrow + 1.2;
  }
  if (!thr || !tgt) return tThrow;
  const pk = ev(play, 'pocket')[0], hurry = ev(play, 'pressure').find((e) => e.kind === 'hurry');
  if (pk?.move === 'step up') { stay(qb, Math.max(S.T0 + 0.85, tThrow - 0.75)); go(qb, tThrow - 0.3, -5.3, 0.4, S); }        // climbs the pocket
  else if (pk?.move === 'slide') { const sd = (play.n % 2 ? 1 : -1) * 2.6; stay(qb, Math.max(S.T0 + 0.85, tThrow - 0.8)); go(qb, tThrow - 0.25, -7.4, sd, S); }
  if (hurry && thr.pressured) { // the rusher gets there as he lets it go and puts him on the ground
    const by = S.who(hurry.by, play.def), q = qb.keys[qb.keys.length - 1];
    if (by && by !== qb) { by.poses = []; stay(by, tThrow - 0.6); go(by, tThrow + 0.1, (q.x - S.los) * S.dir + 0.6, q.y + 0.3, S); by.down = tThrow + 0.12; by.upAt = tThrow + 1.7; qb.down = tThrow + 0.18; qb.upAt = tThrow + 1.9; }
  }
  pose(qb, tThrow - 0.32, tThrow + 0.25, 'throw');
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
