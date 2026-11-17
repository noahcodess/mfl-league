// A ball carrier's run once he has it (a handoff, a catch, a return): through each broken tackle, with his move (a juke,
// a spin, a stiff arm, running a man over) while the defender whiffs or gets flattened, to the spot the engine says. If
// the play goes out of bounds he runs upfield first, then angles to the sideline. Then the tackle (finishCarry).
// Unless the play really goes out, he never drifts toward the sideline: with pursuit behind or beside him he turns upfield
// and takes the hit in bounds, fighting for the yards, instead of a wide angle that walks him out.
import { B, clamp, dist } from './sceneCore.js';
import { finishCarry, ev } from './sceneLineup.js';
import { stageJuke, moveCost } from './sceneJuke.js';


// Where an in-bounds run ends across the field: no more sideways than the yards he gains allow, and near a sideline never
// farther out than where he started (he cuts up and a little inside instead).
function inBoundsLat(fromLat, endLat, run) {
  const room = 1.5 + Math.max(0, run) * 0.55;
  let lat = clamp(endLat, fromLat - room, fromLat + room);
  if (Math.abs(fromLat) > 15 && Math.abs(lat) > Math.abs(fromLat) - 0.5) lat = fromLat - Math.sign(fromLat) * Math.min(2.5, 0.8 + Math.max(0, run) * 0.15);
  return clamp(lat, -23.5, 23.5);
}

// The carrier's run after he has the ball: through each broken tackle to the end spot. Returns tEnd.
export function carryPath(S, c, from, t0, endAlong, endLat, play) {
  const broken = ev(play, 'tackle').filter((e) => e.result === 'broken'), made = ev(play, 'tackle').find((e) => e.result === 'made');
  const al0 = S.along({ x: from[0] });
  if (!play.result.oob) endLat = inBoundsLat(from[1], endLat, endAlong - al0);
  const end = S.at(play.result.td ? endAlong + 2 : endAlong, play.result.oob ? (endLat >= 0 ? 26.9 : -26.9) : endLat);
  const pts = [from], marks = [];
  broken.forEach((e, i) => { const al = clamp(e.at, S.along({ x: from[0] }) + 1, endAlong - 0.5), k = (al - S.along({ x: from[0] })) / Math.max(1, endAlong - S.along({ x: from[0] })); const p = S.at(al, clamp(from[1] + (end[1] - from[1]) * k + (i % 2 ? 1.6 : -1.6), -24, 24)); pts.push(p); marks.push({ e, p }); });
  if (play.result.oob) {   // he angles for the sideline as he goes upfield (never more than about a yard over per yard up), then steps out at the end
    const last = pts[pts.length - 1], sg = Math.sign(end[1]), up = Math.max(0, endAlong - S.along({ x: last[0] }) - 0.6), lat = Math.min(Math.max(0, 24.4 - sg * last[1]), up * 1.1);
    if (up > 0.5) pts.push(S.at(S.along({ x: last[0] }) + up, last[1] + sg * lat));
  }
  pts.push(end);
  let L = 0; const at = [0]; for (let i = 1; i < pts.length; i++) { L += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); at.push(L); }
  const v = c.max * (L > 20 ? 0.97 : 0.9), tEnd = t0 + 0.1 + L / v + broken.reduce((sum, e) => sum + moveCost(e), 0);   // a stutter costs him a beat
  S.when(t0, () => { c.brain = B.carry(pts.slice(1), t0, tEnd, c.max); });
  const run = Math.sign(end[0] - from[0]) || S.dir;
  marks.forEach(({ e, p }, i) => {   // each broken tackle: his move, the defender's bite (sceneJuke)
    const t = t0 + 0.1 + at[i + 1] / v, prev = pts[pts.indexOf(p) - 1] || from, cut = Math.sign(p[1] - prev[1]) || (i % 2 ? 1 : -1);
    stageJuke(S, c, S.by[e.def], p, t, e, cut, run);
  });
  finishCarry(S, c, end, tEnd, { tk: made && S.by[made.def], td: play.result.td, oob: play.result.oob, forced: play.result.forced, fumble: ev(play, 'fumble')[0], reach: ev(play, 'reach').find((e) => e.by === c.id) });
  return tEnd;
}
