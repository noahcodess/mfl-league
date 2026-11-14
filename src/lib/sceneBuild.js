// Turns one play report into a scene the broadcast can act out: where all 20 players line up, where each one runs and when,
// what the ball does, and who ends up on the ground. It only acts out what the report says happened; it never decides
// anything. Runs, passes, sacks and scrambles are here; kicking plays are in sceneKicks.js.
export const OFF = { OT1: [-1, -4], OG1: [-0.8, -2], C: [-0.6, 0], OG2: [-0.8, 2], OT2: [-1, 4], TE: [-1.2, 6.2], QB: [-4.5, 0], RB: [-4.5, 1.8], WR1: [-0.8, -14], WR2: [-0.8, 14] };
const DEF = { DE1: [1, -5], DT1: [1, -2.1], DL: [1, 0], DT2: [1, 2.1], DE2: [1, 5], LB1: [4.5, -3.2], LB2: [4.5, 3.2], CB1: [5.5, -14], CB2: [5.5, 14], SS: [11, 0.5] };
export const MATCH = { OT1: 'DE1', OG1: 'DT1', C: 'DL', OG2: 'DT2', OT2: 'DE2' }, COVER = { WR1: 'CB1', WR2: 'CB2', TE: 'SS', RB: 'LB1' };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ev = (play, type) => play.events.filter((e) => e.type === type);
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
  const stance = (k) => (/^(OT|OG|C)/.test(k) ? 'olset' : k === 'TE' ? 'olset' : k === 'QB' ? 'qbset' : k === 'RB' ? 'rbset' : k.startsWith('WR') ? 'wrset'
    : /^(D)/.test(k) ? 'dlset' : k.startsWith('LB') ? 'lbset' : 'cbset');
  Object.entries(OFF).forEach(([k, [a, l]]) => { S.A[k] = add(S, O[k], S.play.off, a, l, stance(k)); });
  Object.entries(DEF).forEach(([k, [a, l]]) => { S.D[k] = add(S, Dd[k], S.play.def, a, l, stance(k)); });
  if (S.A.QB) S.A.QB.qb = true;
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

const hash = (id) => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
// The line, one matchup at a time, each playing out the engine's result on its own rhythm. Pass (pass true): the blocker
// kick-steps; a rusher who wins (rush event sooner than the play ends) works his move and breaks free toward the QB while
// his blocker gets driven back; the rest hand-fight. Run: pancakes put the defender on the ground, drive blocks move him
// off the ball, sheds slip off toward the runner.
export function trenches(S, pass, tEnd, aim) {
  const rush = Object.fromEntries(ev(S.play, 'rush').map((e) => [e.def, e])), runB = Object.fromEntries(ev(S.play, 'block').map((e) => [e.def, e]));
  Object.entries(MATCH).forEach(([ok, dk]) => {
    const ol = S.A[ok], dl = S.D[dk]; if (!ol || !dl) return;
    const [a, l] = OFF[ok], h = hash(dl.id), per = 0.24 + (h % 6) * 0.045, sway = ((h >> 3) % 3 - 1) * 0.35, start = S.T0 + 0.35 + (h % 4) * 0.05;
    stay(ol, S.T0); stay(dl, S.T0);
    const r = rush[dl.id], b = runB[dl.id] || Object.values(runB).find((e) => e.off === ol.id);
    const base = pass ? -1.3 : 0.3, gap = 1.45; go(ol, start, a + base, l, S); go(dl, start, a + base + gap, l + sway * 0.4, S);
    const winAt = pass && r && S.T0 + r.t < tEnd + 0.2 ? S.T0 + r.t : null, shed = !pass && b?.move === 'shed', pancake = !pass && b?.move === 'pancake';
    const stop = winAt ? Math.max(start + 0.3, winAt - 0.55) : shed ? S.T0 + 0.9 : pancake ? S.T0 + 0.8 : tEnd;
    for (let t = start + per, n = 0; t < stop; t += per, n++) {          // his own shove-and-reset rhythm
      const give = pass ? (winAt ? n * 0.22 : n * 0.06) : (b?.win === 'def' ? n * 0.18 : -n * 0.2), wob = (n % 2 ? 0.28 : -0.2) + sway * (n % 3 === 1 ? 0.5 : 0);
      go(ol, t, a + base - give - wob * 0.5, l + sway * 0.2, S); go(dl, t, a + base - give + gap - wob * 0.5, l + sway * 0.4, S);
    }
    if (winAt) { // he beats his man: a swim or rip move, then free toward the quarterback
      const q = aim || [-7, 0], move = r.move === 'swim move' ? 'swim' : 'rush';
      go(dl, winAt - 0.25, q[0] + 1.6, q[1] + sway * 1.5 + (r.move === 'speed rush' ? (l >= 0 ? 1.8 : -1.8) : 0), S); go(dl, winAt, q[0] + 0.7, q[1] + 0.3, S);
      go(ol, winAt, a + base - 1.6, l + sway * 0.6, S);
      pose(dl, S.T0, winAt - 0.25, move); pose(ol, S.T0 + 0.1, start + 0.2, 'anchor'); pose(ol, start + 0.2, winAt + 0.6, 'driven');
    } else if (pancake) { go(ol, S.T0 + 1.1, a + 2, l, S); go(dl, S.T0 + 1.0, a + 2.4, l + sway, S); dl.down = S.T0 + 1.0; pose(ol, S.T0, tEnd, 'drive'); }
    else if (shed) { pose(dl, S.T0, S.T0 + 0.9, 'swim'); pose(ol, S.T0, tEnd, 'driven'); if (aim) go(dl, S.T0 + 1.5, aim[0], aim[1], S); }
    else { pose(ol, S.T0 + 0.05, tEnd, pass ? (h % 2 ? 'anchor' : 'block') : b?.win === 'def' ? 'driven' : 'drive'); pose(dl, S.T0, tEnd, pass ? (r?.move === 'swim move' ? 'swim' : 'rush') : b?.win === 'def' ? 'drive' : 'driven'); }
    stay(ol, tEnd); stay(dl, tEnd);
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
  if (play.scramble) { go(qb, S.T0 + 0.9, -7, 0, S); go(qb, S.T0 + 1.7, -5, gap * 3, S); t = S.T0 + 1.7; trenches(S, true, t + 1, [-6, 0]); return carryOut(S, qb, [-5, gap * 3], t, gain); }
  if (c !== qb) { stay(c, S.T0 + 0.05); go(c, t, -3.6, gap * 0.25, S); go(qb, t, -3.9, gap * 0.25 - sg * 0.8, S); hold(S, t, c); go(qb, t + 0.8, -5.5, -sg * 3, S); }
  trenches(S, false, t + 1.2, [1, gap]);
  [['WR1', 'CB1'], ['WR2', 'CB2']].forEach(([w, cb]) => { if (S.A[w] && S.D[cb]) { stay(S.A[w], S.T0); go(S.A[w], S.T0 + 1, 4.5, OFF[w][1], S); pose(S.A[w], S.T0 + 1, 9, 'block'); } });
  const hit = t + Math.hypot(3.9, gap) / yps(c.p);
  go(c, hit, Math.min(0.3, gain), gap, S);
  return carryOut(S, c, [Math.min(0.3, gain), gap], hit, gain);
}
