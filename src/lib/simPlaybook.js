// Picks the exact play from the 400-play book once the coach knows what he wants (run, or a pass of some depth). It weighs:
// the moment (short yardage, red zone, goal line, two-minute, killing clock, 3rd and long), his scheme's favorite plays and
// formations (never more than about half his calls), what has worked today, what the other defense keeps doing (blitzing,
// sitting in zone, playing man), which receiver has the best matchup, and not running the same thing over and over.
import { mix, val } from './simCore.js';
import { RUNS } from './playbookRuns.js';
import { PASSES } from './playbookPasses.js';
import { FORMATIONS, SCHEME_FORMATIONS } from './playbookFormations.js';
import { working, family, myTendency } from './coachPlan.js';

// How much better this receiver should beat his man today, roughly (positive = good matchup).
function edge(G, slot) {
  const p = G.O[slot], c = { WR1: G.D.CB1, WR2: G.D.CB2, TE: G.D.SS, RB: G.D.LB1 }[slot];
  return mix(G, p, { route_running: 0.4, speed: 0.3, release: 0.15, catching: 0.15 }, 50) - mix(G, c, { man_cover: 0.35, zone_cover: 0.35, speed: 0.3 }, 45);
}
const CTX_TAGS = ['short', 'red', 'goal', 'clock', 'hurry', 'long'];
const DEFAULT_PLAN = { off: 'balanced', sharp: 1, report: { fam: {}, oppDef: { plays: 0, blitz: 0, zone: 0, deepHelp: 0 }, sig: { off: 0, n: 0 } } };

// type: 'run' | 'pass'. sub: pass depth ('quick' | 'short' | 'medium' | 'deep'), or for runs 'sneak' to force a sneak.
// ctx: { short, red, goal, clock, hurry, long, hail }.
export function pickPlay(G, type, sub, ctx) {
  const { R } = G, side = G.s.poss, plan = G.teams[side].plan || DEFAULT_PLAN, rep = plan.report, od = rep.oppDef;
  const mem = (G.calls ||= { home: [], away: [] })[side], tg = (G.targets ||= { home: {}, away: {} })[side];
  const total = Object.values(tg).reduce((a, b) => a + b, 0) || 1, ranOk = (G.runGain?.[side] || 0) / Math.max(1, G.runs?.[side] || 1);
  const seen = Math.max(4, od.plays), blitzRate = od.blitz / seen, zoneRate = od.zone / seen, sigShare = rep.sig.n ? rep.sig.off / rep.sig.n : 0;
  const forms = SCHEME_FORMATIONS[plan.off] || SCHEME_FORMATIONS.balanced, qbFast = val(G, G.O.QB, 'speed', 50) >= 74;
  const list = type === 'run' ? (sub === 'sneak' ? RUNS.filter((p) => p.sub === 'sneak') : RUNS) : PASSES.filter((p) => p.sub === sub);
  const scored = list.map((pl) => {
    let w = forms[pl.form] ?? 0.5;
    const fit = pl.fit[plan.off] || 1;
    w *= sigShare > 0.5 && fit >= 1.4 ? 1 : fit;                                   // his scheme's plays, up to about half the calls
    CTX_TAGS.forEach((t) => { if (ctx[t] && pl.tags.includes(t)) w *= 2.4; });
    if (pl.tags.includes('goal') && !ctx.goal && !ctx.short) w *= 0.3;
    if (pl.form === 'jumbo') w *= ctx.goal || (ctx.short && ctx.red) ? 3 : ctx.short ? 0.6 : 0.03;
    if (pl.concept === 'Fade' && !ctx.red) w *= 0.15;
    if (pl.tags.includes('hail')) w = ctx.hail ? 50 : 0;
    else if (ctx.hail) w *= 0.02;
    if (pl.tags.includes('screen')) w *= (ctx.goal ? 0.2 : 1) * (1 + blitzRate * 3 * plan.sharp);
    if (ctx.hurry && type === 'run') w *= 0.4;
    if (ctx.clock && pl.tags.includes('hurry')) w *= 0.5;                          // killing clock: stay in bounds
    const m = pl.mods || {};
    if (type === 'run') {
      w *= working(plan, pl.sub === 'outside' ? 'outside' : 'inside');
      if (pl.sub === 'sneak') w = ctx.short ? (ctx.goal ? 3 : 2) * (val(G, G.O.QB, 'strength', 55) >= 60 ? 1.3 : 1) : 0;
      if (m.option) w *= qbFast ? 1.8 : 0.3;                                       // option runs need a quarterback who can run
      if (m.vsRush) w *= ctx.long ? 1 + blitzRate * 2 : 0.5;
    } else {
      w *= working(plan, pl.mods.screen ? 'screen' : pl.mods.pa ? 'pa' : pl.sub);
      if (m.pa) w *= (ranOk > 4.4 ? 1.8 : ranOk < 3.2 ? 0.6 : 1) * 1.4;              // play action works once the run is working
      if (m.rpo) w *= working(plan, 'inside') > 1.05 ? 1.5 : 1;
      w *= 1 + ((m.beatsZone || 0) * (zoneRate - 0.4) + (m.beatsMan || 0) * (0.6 - zoneRate) + (m.beatsBlitz || 0) * blitzRate) * 2 * plan.sharp;
      const first = pl.read[0];
      w *= Math.exp(edge(G, first) / 14) * Math.max(0.5, 1.2 - ((tg[first] || 0) / total) * 0.8) * (first === G.O.star ? 1.4 : 1);   // feed the matchup, spread it around
    }
    if (mem.slice(-3).includes(pl.concept)) w *= 0.3;                             // don't keep running the same thing
    const tend = myTendency(plan, pl.form);                                         // break your own tendencies: the defense is watching
    if (tend != null) { const same = type === 'pass' ? tend : 1 - tend; if (same > 0.7) w *= 1 - 0.5 * plan.sharp * (same - 0.7) / 0.3; }
    return { pl, w: Math.max(0, w) };
  });
  const sum = scored.reduce((a, o) => a + o.w, 0); let roll = R.r() * sum, pick = scored[0]?.pl;
  for (const o of scored) { roll -= o.w; if (roll <= 0) { pick = o.pl; break; } }
  mem.push(pick.concept || pick.name); if (mem.length > 8) mem.shift();
  rep.sig.n += 1; if ((pick.fit[plan.off] || 1) >= 1.4) rep.sig.off += 1;
  return toCall(type, pick);
}

// The call the engine runs: the play plus its formation's small effects folded in.
function toCall(type, pl) {
  const f = FORMATIONS[pl.form] || FORMATIONS.singleback, m = pl.mods || {};
  const call = { type, sub: pl.sub, name: pl.name, concept: pl.concept || pl.name, formation: f.name, form: pl.form, look: f.look };
  if (type === 'run') {
    call.mods = { yds: (m.yds || 0) + f.run, short: f.short || 0, var: m.var || 1, fool: m.fool || 0, vsRush: m.vsRush || 0, option: !!m.option };
    call.draw = pl.concept === 'Draw' || pl.concept === 'Delay';
  } else {
    call.read = pl.read; call.depths = pl.depths; call.pa = !!m.pa; call.screen = !!m.screen;
    call.mods = { sep: f.sep, rub: (f.rub || 0) + (m.rub || 0), pa: f.pa, protect: f.protect + (m.protect || 0) + (m.rollout ? 0.2 : 0), rollout: !!m.rollout,
      beatsZone: m.beatsZone || 0, beatsMan: m.beatsMan || 0, beatsBlitz: m.beatsBlitz || 0, maxProtect: (m.protect || 0) >= 0.3 };
  }
  call.family = family(call);
  return call;
}

// After every snap: what the offense did and how it went, so both coaches can adjust (run game working? QB hot?).
export function remember(G, side, call, play, res) {
  const add = (k, n = 1) => { G[k] ||= { home: 0, away: 0 }; G[k][side] += n; };
  if (call.type === 'run') { add('runs'); add('runGain', res.gain || 0); return; }
  if (call.type !== 'pass') return;
  add('passes');
  G.hot ||= { home: 0, away: 0 }; G.hot[side] = G.hot[side] * 0.85 + (res.turnover ? -2 : res.incomplete ? -0.7 : 1);
  if (play.targetSlot) { const tg = (G.targets ||= { home: {}, away: {} })[side]; tg[play.targetSlot] = (tg[play.targetSlot] || 0) + 1; }
}
