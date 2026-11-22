// Pass plays, battle by battle: each blocker against his rusher sets how long the quarterback has; each receiver against
// his coverage sets how open he is; the quarterback reads it, throws with his accuracy for that depth (worse under
// pressure or on the run), the catch is settled by hands against ball skills, and then it's a carry (simCarry).
import { addEvent } from './simReport.js';
import { clamp, odds, mix, val, top, stat, swing } from './simCore.js';
import { carry } from './simCarry.js';
import { outOfBounds } from './simClock.js';

const PROTECT = { pass_block: 0.45, footwork: 0.2, anchor: 0.2, strength: 0.15 };
const LINE = [['OT1', 'DE1'], ['OG1', 'DT1'], ['C', 'DL'], ['OG2', 'DT2'], ['OT2', 'DE2']];
const DEPTH = { quick: { WR1: 5, WR2: 4, TE: 4, RB: 1 }, short: { WR1: 8, WR2: 7, TE: 6, RB: 2 }, medium: { WR1: 15, WR2: 12, TE: 9, RB: 3 }, deep: { WR1: 32, WR2: 24, TE: 14, RB: 3 } };
const rushOf = (G, p) => top(G, p, ['speed_rush', 'power_moves', 'finesse_moves'], 45) * 0.6 + val(G, p, 'block_shed', 50) * 0.2 + val(G, p, 'strength', 50) * 0.2;
const rushMove = (p) => [['speed_rush', 'speed rush'], ['power_moves', 'bull rush'], ['finesse_moves', 'swim move']].sort((a, b) => (p.r[b[0]] ?? 0) - (p.r[a[0]] ?? 0))[0][1];

// How long until each rusher gets home. Returns { t, by, blocker }: the first one there.
function rush(G, play, def) {
  const { R, O, D } = G; let first = { t: 9, by: null };
  const cap = 4.3 + R.r() * 1.7;                    // even a great line only holds about 4 to 6 seconds before the pocket collapses
  LINE.forEach(([o, d]) => {
    const t = Math.min(cap + R.r() * 0.4, Math.max(0.9, 4.3 + (mix(G, O[o], PROTECT) - rushOf(G, D[d])) / 17 + R.gauss(0, 0.9)));
    addEvent(play, 'rush', 0, { off: O[o].id, def: D[d].id, t: Math.round(t * 100) / 100, move: rushMove(D[d]) });   // every matchup on the line, for the broadcast
    if (t < first.t) first = { t, by: D[d], blocker: O[o] };
  });
  if (def.blitz) { // the extra man: the back picks him up or he comes free
    const t = Math.max(1.4, 3.3 + (val(G, O.RB, 'pass_block', 40) - val(G, D.LB2, 'blitzing', 50)) / 14 + R.gauss(0, 0.7));
    if (t < first.t) first = { t, by: D.LB2, blocker: O.RB };
  }
  return first;
}

// How open each receiver gets: separation in yards at the top of his route.
function routes(G, call, def, plan) {
  const { R, O, D } = G, cover = { WR1: D.CB1, WR2: D.CB2, TE: D.SS, RB: D.LB1 }, zone = def.cov === 'zone', md = plan.mods || {};
  return Object.entries(DEPTH[call]).filter(([slot]) => !(md.maxProtect && slot === 'RB')).map(([slot, base]) => {   // max protect keeps the back in to block
    const fixed = plan.depths?.[slot], p = O[slot], c = cover[slot], depth = fixed === 0 ? 0 : Math.max(1, Math.round((fixed ?? base) * (0.8 + R.r() * 0.4))), deep = depth >= 18;
    const get = mix(G, p, deep ? { route_running: 0.3, speed: 0.45, release: 0.25 } : { route_running: 0.45, speed: 0.2, release: 0.2, agility: 0.15 }, 50);
    const stick = zone ? mix(G, c, { zone_cover: 0.5, play_rec: 0.3, speed: 0.2 }, 45) : mix(G, c, deep ? { man_cover: 0.4, speed: 0.45, press: 0.15 } : { man_cover: 0.5, speed: 0.2, press: 0.15, agility: 0.15 }, 45);
    let sep = 1.45 + (get - stick) / 10 + R.gauss(0, 1.35) + (zone ? (deep ? -0.5 : 0.5) : 0);
    if (depth === 0) sep += 1.6;                                                  // screens: blockers out in front
    if (plan.pa && depth >= 9) sep += 0.6 + (md.pa || 0);                         // the linebackers bit on the fake
    // the formation and concept against this coverage: rubs and man-beaters vs man, zone-beaters vs zone, screens vs blitz,
    // and the coverage's own shape (safeties deep take away the deep ball and leave room underneath)
    sep += (md.sep || 0) + (zone ? md.beatsZone || 0 : (md.rub || 0) + (md.beatsMan || 0)) + (def.blitz ? md.beatsBlitz || 0 : 0)
      + (depth >= 15 ? def.deep || 0 : depth > 0 && depth < 10 ? def.under || 0 : 0);
    if (def.prevent) sep += depth >= 15 ? -1.3 : 0.9;
    if (def.blitz) sep += 0.6; else if (slot === G.O.star) sep -= 0.7;          // the free linebacker shades the best receiver
    return { slot, p, c, depth, sep, at: (depth === 0 ? 0.9 : 1.25 + depth / 13) + (plan.pa ? 0.35 : 0) };
  });
}

function sack(G, play, qb, by, t) {
  const loss = G.R.int(4, 9);
  addEvent(play, 'pressure', t, { by: by.id, kind: 'sack', move: rushMove(by) });
  stat(play, by, 'sacks'); stat(play, by, 'tkl'); stat(play, qb, 'sk'); stat(play, qb, 'skyds', loss); swing(G, by.side, 0.1);
  play.kind = 'sack'; play.text = `${qb.last} is SACKED by ${by.last} for a loss of ${loss}.`; play.headline = 'SACK';
  const strip = G.R.chance(0.07), lost = strip && G.R.chance(0.5);
  if (strip) { stat(play, qb, 'fum'); stat(play, by, 'ff'); addEvent(play, 'fumble', t, { by: qb.id, forcedBy: by.id, recoveredBy: lost ? by.id : qb.id, lost }); if (lost) { stat(play, qb, 'fuml'); stat(play, by, 'fr'); } }
  return { gain: -loss, time: t + 2, fumble: strip ? { lost, forcedBy: by, recoveredBy: lost ? by : qb } : null };
}

// call: 'quick' | 'short' | 'medium' | 'deep'. def: { cov: 'man' | 'zone', blitz }. Fills the report, returns the result.
// Drop chance on a catchable ball by Catching rating: about 1% at 80+, 2-3% in the 70s, uncommon in the 60s, common below.
const dropOdds = (h) => (h >= 80 ? 0.01 : h >= 70 ? 0.01 + (80 - h) * 0.0018 : h >= 60 ? 0.028 + (70 - h) * 0.0035 : Math.min(0.2, 0.063 + (60 - h) * 0.005));

function throwAway(G, play, qb, t, hit) {
  play.kind = 'pass'; stat(play, qb, 'att');
  addEvent(play, 'throw', t, { qb: qb.id, target: null, air: 12, accuracy: 0, pressured: hit, away: true });
  addEvent(play, 'catch', t + 0.9, { target: null, result: 'away' });
  play.text = `${qb.last} ${hit ? 'gets rid of it as he\'s hit' : 'can\'t find anybody and throws it away'}. Incomplete.`;
  return { gain: 0, incomplete: true, time: t + 2 };
}

// plan: the playbook call ({ name, read: the order he reads it, depths, pa, screen }).
export function passPlay(G, play, call, def, plan = {}) {
  const { R, O, D } = G, qb = O.QB, toGoal = 100 - G.s.ballOn, heat = rush(G, play, def), open = routes(G, call, def, plan);
  heat.t = Math.max(0.9, heat.t + (plan.mods?.protect || 0) - (def.rush || 0));   // extra blockers buy time, a pressure call takes it away
  const see = (1 - val(G, qb, 'vision', 55) / 100) * 2.2, bold = qb.style === 'gunslinger' ? 1.6 : 1;
  // the read: first look, then the next, then the next; he takes the first one open enough (that bar drops as time runs out)
  const order = [...(plan.read || ['WR1', 'WR2', 'TE']), 'WR1', 'WR2', 'TE', 'RB'].filter((v, k, a) => a.indexOf(v) === k);
  const ranked = order.map((sl) => open.find((o) => o.slot === sl)).filter(Boolean).map((o, k) => ({ ...o, seen: o.sep + R.gauss(0, see), at: o.at + k * 0.38 }));
  let tgt = ranked.find((o, k) => o.seen >= 1.35 - k * 0.3 + (bold > 1 ? -0.4 : 0) && o.at < heat.t + 0.35) || null;
  if (!tgt) { // nobody's open: the smart ones throw it away, the rest force it to whoever looks best
    const best = ranked.slice().sort((a, b) => b.seen - a.seen)[0], inFace = heat.by && heat.t < best.at + 0.3;
    if (inFace && R.chance(0.22 + val(G, qb, 'awareness', 55) / 250 - (bold > 1 ? 0.15 : 0))) { // only with a rusher in his face
      stat(play, heat.by, 'pres'); addEvent(play, 'pressure', heat.t, { by: heat.by.id, kind: 'hurry' });
      return throwAway(G, play, qb, heat.t + 0.15, true);
    }
    tgt = best;
  }
  play.targetSlot = tgt.slot;
  addEvent(play, 'read', tgt.at, { qb: qb.id, target: tgt.p.id, open: open.map((o) => ({ id: o.p.id, sep: Math.round(o.sep * 10) / 10, depth: o.depth })) });
  let tThrow = tgt.at + (1 - val(G, qb, 'vision', 55) / 100) * 0.25, pressured = false, onRun = false;   // a quick decision once he sees it
  if (heat.by) addEvent(play, 'block', Math.min(heat.t, tThrow), { off: heat.blocker.id, def: heat.by.id, win: heat.t < tThrow ? 'def' : 'off', move: heat.t < tThrow ? rushMove(heat.by) : 'anchor', margin: Math.round((heat.t - tThrow) * 10) });
  const hot = heat.t < tThrow && ranked.find((o) => o.at + 0.25 <= heat.t && o.seen > 0.6);
  if (hot && R.chance(0.35 + val(G, qb, 'vision', 55) / 200)) { tgt = hot; tThrow = hot.at + 0.2; addEvent(play, 'pocket', tThrow, { qb: qb.id, move: 'quick release' }); } // he feels it and gets the ball out
  if (heat.t < tThrow) { // the rush got there first
    stat(play, heat.by, 'pres');
    const slip = odds(val(G, qb, 'break_sack', 45) * 0.6 + val(G, qb, 'speed', 50) * 0.4 - val(G, heat.by, 'tackling', 55) * 0.5 - val(G, heat.by, 'speed', 55) * 0.5 - 4, 12);
    if (!R.chance(slip)) { if (R.chance(clamp((tThrow - heat.t) / 1.35, 0.16, 0.7))) return sack(G, play, qb, heat.by, heat.t); pressured = true; }
    else if (R.chance(qb.style === 'scrambler' ? 0.6 : val(G, qb, 'speed', 50) > 76 ? 0.4 : 0.15)) { // he takes off
      addEvent(play, 'pocket', heat.t, { qb: qb.id, move: 'escape' }); stat(play, qb, 'car');
      const out = carry(G, play, qb, -3, [{ p: D.LB1, at: 2 + R.int(0, 4) }, { p: D.SS, at: 8 }, { p: D.CB1, at: 13 }], toGoal, [D.CB1, D.CB2], heat.t, G.s.toGo), gain = Math.round(out.end);
      stat(play, qb, 'ryds', gain); stat(play, qb, 'rlong', gain); if (out.td) stat(play, qb, 'rtd');
      play.kind = 'run'; play.scramble = true; play.carrier = qb.id; play.text = out.td ? `${qb.last} escapes and runs it in... TOUCHDOWN!` : `${qb.last} scrambles for ${gain}.`;
      const ob = out.td || out.reach ? { oob: false, gain } : outOfBounds(G, qb, 0.12, gain);
      return { gain: ob.gain, td: out.td, fumble: out.fumble, time: out.time + 1.5, oob: ob.oob, forced: ob.oob && !!ob.forced };
    } else { addEvent(play, 'pocket', heat.t, { qb: qb.id, move: 'slide' }); pressured = true; onRun = true; tThrow = heat.t + 0.4; }
    addEvent(play, 'pressure', heat.t, { by: heat.by.id, kind: 'hurry' });
  } else if (heat.by && heat.t - tThrow < 0.35) { // the rusher arrives as he lets it go: a hurried throw and a hit
    stat(play, heat.by, 'pres'); pressured = true; addEvent(play, 'pressure', tThrow, { by: heat.by.id, kind: 'hurry' });
  } else if (heat.t - tThrow < 0.6) addEvent(play, 'pocket', tThrow - 0.3, { qb: qb.id, move: 'step up' });
  if (plan.mods?.rollout && !pressured) { onRun = true; addEvent(play, 'pocket', Math.max(0.6, tThrow - 1.2), { qb: qb.id, move: 'rollout' }); }   // a boot: he throws on the move
  // a pump fake on a longer look: it can freeze his man for a step
  const pump = tgt.depth >= 14 && tThrow > 2 && !pressured && R.chance(0.3 + (val(G, qb, 'vision', 55) - 60) / 200);
  if (pump) addEvent(play, 'pump', tThrow - 0.6, { qb: qb.id });
  // the throw
  const d = tgt.depth, base = d < 10 ? val(G, qb, 'short_acc', 55) : d > 20 ? val(G, qb, 'deep_acc', 50) : (val(G, qb, 'short_acc', 55) + val(G, qb, 'deep_acc', 50)) / 2;
  let acc = pressured ? base * 0.5 + val(G, qb, 'throw_pressure', 50) * 0.5 - 5 : base; if (onRun) acc = acc * 0.5 + val(G, qb, 'throw_on_run', 50) * 0.5;
  if (d > 14 + (val(G, qb, 'throw_power', 55) - 50) * 0.5) acc -= 8;             // past what his arm can do
  const q = (acc - 62) / 26 + R.gauss(0, 0.75) + (pump ? 0.12 : 0), need = -0.78 + d * 0.036, air = 0.35 + d / 22;   // pros hit most throws; misses climb with depth and pressure
  play.kind = 'pass'; play.target = tgt.p.id; stat(play, qb, 'att'); stat(play, tgt.p, 'tgt'); stat(play, tgt.c, 'tgtd');
  addEvent(play, 'throw', tThrow, { qb: qb.id, target: tgt.p.id, air: d, accuracy: Math.round(acc), pressured, onRun });
  const close = air * clamp(0.75 + (val(G, tgt.c, 'speed', 55) - val(G, tgt.p, 'speed', 60)) / 40 + (val(G, tgt.c, 'play_rec', 50) - 60) / 80, 0.25, 1.3);   // he closes while it's in the air
  tgt = { ...tgt, sep: Math.max(0.1, tgt.sep - close) };
  const tight = tgt.sep < 1.4, tCatch = tThrow + air, miss = (why) => { play.text = `${qb.last} ${why}`; return { gain: 0, incomplete: true, time: tCatch + 1 }; };
  const picked = () => {
    addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'int', sep: Math.round(tgt.sep * 10) / 10, contested: tight });
    stat(play, qb, 'int'); stat(play, tgt.c, 'dint'); swing(G, tgt.c.side, 0.22); play.headline = 'INTERCEPTION';
    play.text = `${qb.last} throws for ${tgt.p.last}... INTERCEPTED by ${tgt.c.last}!`;
    return { gain: d, time: tCatch + 3, turnover: 'int', by: tgt.c };
  };
  const pc = G.pul?.p || 0;
  if (pc >= 0.3 && R.chance(0.09 * pc * pc)) { // too loud to hear the call: he ran the wrong route (Stadium Pulse)
    addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'miss', why: 'wrong route', sep: Math.round(tgt.sep * 10) / 10 }); play.crowdHit = true;
    play.text = `${qb.last} throws for ${tgt.p.last}... nobody there! Miscommunication in the noise.`; return { gain: 0, incomplete: true, time: tCatch + 1 };
  }
  if (q < need) { // off target
    if (q < need - 0.45 && tgt.sep < 2.8 && R.chance(clamp(0.1 + (val(G, tgt.c, 'ball_skills', 50) - 65) * 0.005, 0.08, 0.4))) return picked();
    const why = R.pick(['overthrown', 'behind him', 'too high', 'out of reach']);
    addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'miss', why, sep: Math.round(tgt.sep * 10) / 10 });
    return miss(`${d > 20 ? 'goes deep' : 'throws'} for ${tgt.p.last}... ${why}.`);
  }
  const hands = val(G, tgt.p, 'catching', 55);
  if (tight) { // a fight for the ball
    const rec = mix(G, tgt.p, { catch_traffic: 0.5, catching: 0.25 }, 50) + top(G, tgt.p, ['jumping', 'spectacular_catch', 'strength'], 50) * 0.25;
    const dfn = mix(G, tgt.c, { ball_skills: 0.5 }, 45) + top(G, tgt.c, ['man_cover', 'zone_cover'], 50) * 0.3 + val(G, tgt.c, 'jumping', 55) * 0.2;
    if (!R.chance(clamp(odds(rec - dfn + 2, 13) * 0.95, 0.15, 0.88))) {
      if (R.chance(clamp(0.07 + (val(G, tgt.c, 'ball_skills', 50) - 65) * 0.003, 0.02, 0.18))) return picked();
      addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'breakup', contested: true }); stat(play, tgt.c, 'pd');
      return miss(`throws for ${tgt.p.last}... broken up by ${tgt.c.last}.`);
    }
  } else if (R.chance(dropOdds(hands))) {
    addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'drop' }); stat(play, tgt.p, 'drops');
    return miss(`finds ${tgt.p.last}... DROPPED.`);
  }
  const type = tight ? (val(G, tgt.p, 'spectacular_catch', 0) > 82 && R.chance(0.4) ? 'one-handed' : 'contested') : d > 20 ? 'over the shoulder' : 'in stride';
  addEvent(play, 'catch', tCatch, { target: tgt.p.id, def: tgt.c.id, result: 'catch', catchType: type, sep: Math.round(tgt.sep * 10) / 10, contested: tight });
  const help = [D.SS, D.LB1, D.LB2, D.CB1, D.CB2].filter((p) => p !== tgt.c).sort(() => R.r() - 0.5);
  const out = carry(G, play, tgt.p, d, [{ p: tgt.c, at: d + Math.max(0, tgt.sep - 0.6) * 1.3 }, { p: help[0], at: d + 4 + R.int(0, 3) }, { p: help[1], at: d + 9 + R.int(0, 4) }, { p: help[2], at: d + 17 }], toGoal, [D.CB1, D.CB2, D.SS], tCatch, G.s.toGo);
  const gain = Math.round(out.end);
  stat(play, qb, 'cmp'); stat(play, qb, 'pyds', gain); stat(play, qb, 'plong', gain); stat(play, tgt.p, 'rec'); stat(play, tgt.p, 'recyds', gain); stat(play, tgt.p, 'reclong', gain); stat(play, tgt.p, 'yac', gain - d); stat(play, tgt.c, 'cmpd');
  if (out.td) { stat(play, qb, 'ptd'); stat(play, tgt.p, 'rectd'); }
  play.carrier = tgt.p.id; play.catchType = type;
  play.text = out.td ? `${qb.last} ${d > 20 ? 'deep ' : ''}to ${tgt.p.last}... TOUCHDOWN!` : `${qb.last} ${d > 20 ? 'deep to' : 'to'} ${tgt.p.last}${type === 'one-handed' ? ' with one hand' : ''} for ${gain}${out.tackler ? `. Tackle by ${out.tackler.last}` : ''}.`;
  const ob = out.td || out.reach ? { oob: false, gain } : outOfBounds(G, tgt.p, d >= 10 && (call === 'medium' || call === 'deep') ? 0.07 : 0.035, gain);   // sideline routes get out more
  return { gain: ob.gain, td: out.td, fumble: out.fumble, time: out.time + 1.5, oob: ob.oob, forced: ob.oob && !!ob.forced };
}
