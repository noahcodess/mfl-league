// Each coach's game plan, built at kickoff, plus the scouting report he keeps during the game. The plan: his offensive and
// defensive scheme (Auto reads his roster), his personality (from his archetype), how sharp he is (Game Planning and Clutch),
// and whether his team is the favorite or the underdog today. The report: what's working for his offense, what the other
// defense keeps calling, and what the other offense likes on each down. Bot and human coaches use the same brain.
import { autoScheme } from './schemes.js';

// aggression: going for it on 4th, deep shots, two-point tries. run: leans run (+) or pass (-). risk: shot plays.
const STYLE = {
  gunslinger: { aggression: 0.22, run: -0.04, risk: 0.25 }, old_school: { aggression: -0.12, run: 0.06, risk: -0.15 },
  caretaker: { aggression: -0.05, run: 0.01, risk: -0.05 }, steady: { aggression: -0.08, run: 0.02, risk: -0.1 },
  former_player: { aggression: 0.08, run: 0.02, risk: 0.05 }, moneyball: { aggression: 0.28, run: -0.03, risk: 0 },
  architect: { aggression: 0.05, run: 0, risk: 0 }, dealmaker: { aggression: 0.05, run: -0.01, risk: 0.08 }, talent_scout: { aggression: 0, run: 0, risk: 0.05 },
};

const asRoster = (lineup) => (lineup.all || []).map((p) => ({ position: p.pos, stars: p.stars || 2 }));

// coach: { scheme: { offense, defense, auto }, ratings: { game_planning, clutch }, archetype } (any part may be missing).
export function makePlan(lineup, opp, coach = {}) {
  const auto = autoScheme(asRoster(lineup)), sc = coach.scheme || {}, useAuto = sc.auto !== false;
  const style = STYLE[coach.archetype] || STYLE.caretaker, r = coach.ratings || {};
  const mine = (lineup.strength?.off || 70) + (lineup.strength?.def || 70), theirs = (opp?.strength?.off || 70) + (opp?.strength?.def || 70);
  const edge = Math.max(-1, Math.min(1, (mine - theirs) / 40));   // +1: much better team today, -1: much worse
  return {
    off: useAuto ? auto.offense : sc.offense || 'balanced', def: useAuto ? auto.defense : sc.defense || 'balanced',
    // underdogs need more variance to win (go for it, take shots); favorites lean on being better and keep it simple
    aggression: style.aggression - edge * 0.12, risk: style.risk - edge * 0.1, run: style.run + edge * 0.02,
    sharp: 0.5 + (r.game_planning ?? 60) / 100, clutch: (r.clutch ?? 60) / 100, edge,
    report: { fam: {}, oppDef: { plays: 0, blitz: 0, zone: 0, deepHelp: 0 }, oppOff: {}, oppForm: {}, myForm: {}, sig: { off: 0, def: 0, n: 0, dn: 0 } },
  };
}

// The family a play belongs to, for the scouting report: inside/outside runs, quick/short/medium/deep passes, screens, play action.
export const family = (call) => (call.type === 'run' ? (call.sub === 'outside' ? 'outside' : 'inside') : call.screen ? 'screen' : call.pa ? 'pa' : call.sub);

// How well a family has worked for this offense today: yards per play shrunk toward a normal day (so 1 big play doesn't
// fool him). A sharper coach trusts what he sees sooner. Returns a multiplier around 1.
export function working(plan, fam) {
  const f = plan.report.fam[fam]; if (!f) return 1;
  const prior = fam === 'inside' || fam === 'outside' ? 4.2 : fam === 'deep' ? 8.5 : 6, w = 3 / plan.sharp;
  const avg = (f.yds + prior * w) / (f.n + w);
  return Math.max(0.6, Math.min(1.6, 1 + ((avg - prior) / prior) * 0.9 * plan.sharp));
}

// What each side remembers after a snap: the offense logs its own result, the defense logs what the offense called.
export function scout(G, side, call, def, res) {
  const off = G.teams[side].plan, defn = G.teams[side === 'home' ? 'away' : 'home'].plan;
  if (!off || !defn || !call?.type || (call.type !== 'run' && call.type !== 'pass')) return;
  const fam = family(call), f = (off.report.fam[fam] ||= { yds: 0, n: 0 });
  f.yds += Math.max(-8, Math.min(30, res?.turnover ? -8 : res?.gain || 0)); f.n += 1;
  const od = off.report.oppDef; od.plays += 1; if (def?.blitz) od.blitz += 1; if (def?.cov === 'zone') od.zone += 1; if ((def?.deep || 0) < -0.3) od.deepHelp += 1;
  const s = G.s, dd = s.down === 1 ? '1st' : s.toGo <= 3 ? 'short' : s.toGo >= 8 ? 'long' : 'mid', k = (defn.report.oppOff[dd] ||= { pass: 0, n: 0 });
  k.n += 1; if (call.type === 'pass') k.pass += 1;
  if (call.form) {   // both sides remember what this offense runs out of each formation
    for (const book of [defn.report.oppForm, off.report.myForm]) { const fk = (book[call.form] ||= { pass: 0, n: 0 }); fk.n += 1; if (call.type === 'pass') fk.pass += 1; }
  }
}

// How likely the other offense is to throw right now, from what the defense can see and remember: the down and distance,
// the formation it just lined up in (heavy sets usually run, spread sets usually throw), and what it has actually done in
// each today. Everything starts from a normal team and moves as the defense sees more (faster for a sharper coach).
const FORM_PRIOR = { jumbo: 0.25, hback: 0.4, tight: 0.42, singleback: 0.5, twins: 0.55, pistol: 0.5, gun_wing: 0.58, shotgun: 0.68, gun_trips: 0.75, gun_bunch: 0.75, empty: 0.92 };
export function readOffense(plan, s, form) {
  const dd = s.down === 1 ? '1st' : s.toGo <= 3 ? 'short' : s.toGo >= 8 ? 'long' : 'mid', base = { '1st': 0.5, short: 0.4, mid: 0.6, long: 0.8 }[dd];
  const w = 4 / plan.sharp, blend = (k, b) => (k ? (k.pass + b * w) / (k.n + w) : b);
  const byDown = blend(plan.report.oppOff[dd], base);
  if (!form) return byDown;
  const byForm = blend(plan.report.oppForm?.[form], FORM_PRIOR[form] ?? 0.55);
  return byDown * 0.5 + byForm * 0.5;
}

// The offense's own tendency out of a formation (how often it has thrown from it today), so a smart coach can break it.
export function myTendency(plan, form) {
  const k = plan.report.myForm?.[form]; return k && k.n >= 4 ? k.pass / k.n : null;
}
