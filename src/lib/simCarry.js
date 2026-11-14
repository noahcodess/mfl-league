// A ball carrier against the defenders in his way, one tackle attempt at a time. Used by runs, catches, scrambles and
// returns. Broken tackles chain into big plays; the farther he runs on the snap the more speed he loses, so a fresh
// defender can run him down. Ball security against hit power decides fumbles.
import { addEvent, mph } from './simReport.js';
import { clamp, odds, val, top, stat, swing, tired } from './simCore.js';

const MOVES = [['elusiveness', 'juke'], ['break_tackle', 'truck'], ['run_after_catch', 'stiff arm'], ['agility', 'spin'], ['break_sack', 'shake']];
const moveOf = (G, c) => MOVES.map(([k, m]) => [c.r[k] ?? 0, m]).sort((a, b) => b[0] - a[0])[G.R.chance(0.7) ? 0 : 1][1];

// c: the carrier. start: yards past the line where he has the ball. tacklers: [{ p, at }] nearest first (at = yards past the
// line where that man meets him). toGoal: yards from the line to the end zone. chasers: defenders who can run him down.
// Returns { end, td, tackler, fumble: null | { lost, forcedBy, recoveredBy }, ran, time }.
export function carry(G, play, c, start, tacklers, toGoal, chasers = [], t0 = 0) {
  const { R } = G, elude = top(G, c, ['elusiveness', 'break_tackle', 'run_after_catch', 'break_sack'], 40) * 0.65 + val(G, c, 'speed', 50) * 0.35;
  let y = start, ran = 0, t = t0, tackler = null, fumble = null, td = false;
  const move = (to) => { const d = Math.max(0, to - y); ran += d; t += d / 8.5; y = to; };
  for (const tk of tacklers) {
    if (!tk.p) continue;
    move(Math.max(y, tk.at));
    if (y >= toGoal) { td = true; break; }
    const skill = val(G, tk.p, 'tackling', 45) * 0.6 + val(G, tk.p, 'pursuit', 50) * 0.2 + val(G, tk.p, 'speed', 50) * 0.2;
    if (R.chance(clamp(odds(skill - elude * (1 - tired(G, c, ran)) + 36, 16), 0.68, 0.975))) {
      tackler = tk.p;
      move(Math.min(toGoal - 0.5, y + (R.chance(0.35) ? 1 : 0)));
      addEvent(play, 'tackle', t, { def: tk.p.id, carrier: c.id, result: 'made', at: Math.round(y) });
      stat(play, tk.p, 'tkl');
      const pFum = 0.011 * (1 + (val(G, tk.p, 'hit_power', 55) - 60) / 70) * (1 - (val(G, c, 'carrying', 62) - 60) / 80);
      if (R.chance(clamp(pFum, 0.002, 0.04))) {
        const lost = R.chance(0.48), rec = lost ? R.pick(tacklers.filter((x) => x.p).map((x) => x.p)) : c;
        fumble = { lost, forcedBy: tk.p, recoveredBy: rec };
        addEvent(play, 'fumble', t, { by: c.id, forcedBy: tk.p.id, recoveredBy: rec.id, lost });
        stat(play, c, 'fum'); stat(play, tk.p, 'ff'); if (lost) { stat(play, c, 'fuml'); stat(play, rec, 'fr'); }
      }
      break;
    }
    addEvent(play, 'tackle', t, { def: tk.p.id, carrier: c.id, result: 'broken', move: moveOf(G, c), at: Math.round(y) });
    stat(play, c, 'brk'); stat(play, tk.p, 'miss');
    move(y + 1 + R.int(1, 4));
  }
  if (!tackler && !td) { // nobody left in front of him: a foot race
    const left = toGoal - y, legs = val(G, c, 'speed', 50) * (1 - tired(G, c, ran + left / 2));
    const chaser = chasers.filter(Boolean).sort((a, b) => val(G, b, 'speed', 50) - val(G, a, 'speed', 50))[0];
    if (chaser && left > 12 && val(G, chaser, 'speed', 50) + 3 > legs && R.chance(0.6)) {
      move(y + Math.min(left - 1, 8 + R.int(0, Math.round(left * 0.6))));
      tackler = chaser; stat(play, chaser, 'tkl');
      addEvent(play, 'tackle', t, { def: chaser.id, carrier: c.id, result: 'made', move: 'run down', at: Math.round(y) });
    } else { move(toGoal); td = true; }
  }
  if (y >= toGoal) td = !fumble?.lost;
  if (ran >= 8) addEvent(play, 'speed', t, { id: c.id, mph: mph(val(G, c, 'speed', 50), tired(G, c, ran)), yards: Math.round(ran) });
  if (ran - (start < 0 ? 0 : 0) >= 20) swing(G, c.side, 0.08);
  return { end: Math.min(y, toGoal), td, tackler, fumble, ran, time: t };
}
