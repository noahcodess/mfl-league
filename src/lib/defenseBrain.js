// The defensive coordinator: picks a front and coverage for every snap AFTER seeing the offense line up. It starts from
// his scheme (its favorite calls, never more than about half the snaps), then reads what's in front of him:
//  - the formation: heavy sets (Jumbo, H-Back, Tight) get a loaded box, spread sets (Empty, Trips, Bunch) get the Spread
//    front, stacked receivers (Bunch, Trips, Twins) get zone instead of man so they can't rub his corners off,
//    a running quarterback in the Pistol or Shotgun gets a robber spying him;
//  - his scouting report: what this offense has run out of this formation, and on this kind of down, today;
//  - the moment: down and distance, field zone, two-minute drill, a lead to protect.
// He also keeps the offense guessing: the same coverage three times in a row gets rare.
import { DEF_CALLS } from './playbookDefense.js';
import { readOffense } from './coachPlan.js';
import { val } from './simCore.js';

const secondsLeft = (s) => (s.ot ? 0 : (4 - s.quarter) * s.qlen + s.clock);
const STACKED = ['gun_bunch', 'gun_trips', 'twins'];

// call: the offense's play (only its formation is visible to the defense).
export function defenseCall(G, call = {}) {
  const { R, s } = G, side = G.defSide, plan = G.teams[side].plan || { def: 'balanced', sharp: 1, report: { sig: { def: 0, dn: 0 }, oppOff: {}, oppForm: {} } };
  const offLead = s.score[s.poss] - s.score[side], t = secondsLeft(s), toGoal = 100 - s.ballOn, late = s.quarter === 4 && !s.ot;
  const mem = (G.defMem ||= { home: [], away: [] })[side], look = call.look || 'base', form = call.form;
  // protecting a late lead against a long field: prevent
  if (late && offLead < 0 && offLead >= -16 && (t < 100 || (offLead >= -8 && t < 140)) && toGoal > 30) return pack(DEF_CALLS.find((c) => c.prevent));   // a one-score lead goes soft a little sooner (the prevent that lets teams tie it)
  const passLean = readOffense(plan, s, form), longDown = s.toGo >= 8 && s.down >= 2, shortDown = s.toGo <= 2, goal = toGoal <= 4;
  const hurry = (s.quarter === 2 && s.clock < 90) || (late && offLead < 0 && t < 180);
  const qbRuns = (form === 'pistol' || form === 'shotgun' || form === 'gun_wing') && val(G, G.O.QB, 'speed', 50) >= 74;
  const sig = plan.report.sig, sigShare = sig.dn ? sig.def / sig.dn : 0;
  let total = 0;
  const scored = DEF_CALLS.filter((c) => !c.prevent).map((c) => {
    let w = 1;
    const fit = c.fit[plan.def] || 1;
    w *= sigShare > 0.5 && fit >= 1.4 ? 1 : fit;                                 // his scheme's calls, up to about half the snaps
    w *= (c.vs?.[look] ?? 1) ** plan.sharp;                                       // line up to what the offense shows
    if (form === 'empty' && c.front === 'Spread') w *= 1.6;
    if (STACKED.includes(form)) w *= c.cov === 'zone' ? 1 + 0.5 * plan.sharp : 1 - 0.3 * plan.sharp;   // don't get picked off in man
    if (c.robber) w *= qbRuns ? 2.2 : 0.7;
    if (goal) w *= c.front === 'Goal Line' || c.front === 'Bear' ? 6 : c.box >= 0.15 ? 1.4 : 0.25;
    else if (c.front === 'Goal Line') w *= 0.02;
    if (shortDown && !goal) w *= c.box >= 0.15 ? 2 : c.box < -0.1 ? 0.4 : 1;
    if (longDown) w *= c.tags.includes('long') ? 2 : c.box > 0.1 ? 0.5 : 1;
    if (c.front === 'Bear') w *= shortDown ? 1.5 : 0.4;
    // read the offense: run-heavy out of this look and down gets more men in the box, pass-heavy gets more coverage
    const lean = (passLean - 0.55) * plan.sharp;
    w *= Math.exp((c.box >= 0.1 ? -lean : c.box <= -0.1 ? lean : 0) * 2.2);
    if (c.blitz) w *= (s.down === 3 && s.toGo >= 4 ? 1.6 : 1) * (hurry ? 0.6 : 1) * (toGoal <= 20 ? 1.3 : 1) * (look === 'heavy' ? 1.2 : 1);
    if (hurry && (c.coverage === 'Cover 2 Roll' || c.coverage === 'Cover 3 Deep')) w *= 1.8;   // keep it in front late
    if (mem.slice(-2).filter((n) => n === c.coverage).length === 2) w *= 0.25;
    w = Math.max(0, w); total += w;
    return { c, w };
  });
  let roll = R.r() * total, pick = scored[0].c;
  for (const o of scored) { roll -= o.w; if (roll <= 0) { pick = o.c; break; } }
  mem.push(pick.coverage); if (mem.length > 5) mem.shift();
  sig.dn += 1; if ((pick.fit[plan.def] || 1) >= 1.4) sig.def += 1;
  return pack(pick);
}

const pack = (c) => ({ name: c.name, cov: c.cov, blitz: c.blitz, prevent: !!c.prevent, deep: c.deep, under: c.under, box: c.box, rush: c.rush,
  coverage: c.coverage, front: c.front, robber: !!c.robber });
