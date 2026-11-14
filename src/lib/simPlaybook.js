// The playbook every AI coach calls from: named runs and pass concepts, each with the order the quarterback reads it
// (first look, second, third, then the checkdown) and any special depth per route. pickPlay chooses one for the moment:
// down and distance, field spot, clock, score, how the quarterback is throwing today, momentum, and which receiver has
// the best matchup, while never leaning on the same play or the same receiver too much.
import { mix } from './simCore.js';

// run: [name, sub, tags]. pass: [name, sub, read order, tags, depths]. Tags: short (short yardage), red (red zone), clock
// (milking it), hurry (two-minute), pa (play action), screen, long (third and long), shot (deep shot).
const RUNS = [['Inside Zone', 'inside', ''], ['Duo', 'inside', 'clock'], ['Power', 'inside', 'short red clock'], ['Counter', 'inside', 'red'],
  ['Trap', 'inside', ''], ['Draw', 'inside', 'long'], ['QB Sneak', 'sneak', 'short'], ['Outside Zone', 'outside', ''], ['Toss Sweep', 'outside', 'red'],
  ['Stretch', 'outside', 'clock'], ['Pitch', 'outside', '']];
const PASSES = [
  ['Slant-Flat', 'quick', ['WR1', 'RB', 'TE'], 'short red hurry'], ['Stick', 'quick', ['TE', 'WR2', 'RB'], 'short'], ['Hitch', 'quick', ['WR2', 'WR1', 'RB'], 'hurry'],
  ['Quick Out', 'quick', ['WR1', 'WR2', 'TE'], 'hurry'], ['Bubble Screen', 'quick', ['WR2', 'WR1'], 'screen', { WR2: 0 }], ['Fade', 'quick', ['WR1', 'WR2'], 'red', { WR1: 9, WR2: 9 }],
  ['Mesh', 'short', ['TE', 'WR2', 'WR1', 'RB'], ''], ['Spacing', 'short', ['WR2', 'TE', 'WR1', 'RB'], ''], ['Curl-Flat', 'short', ['WR1', 'RB', 'TE'], ''],
  ['Drive', 'short', ['TE', 'WR1', 'RB'], 'red'], ['RB Screen', 'short', ['RB', 'TE'], 'screen long', { RB: 0 }], ['Snag', 'short', ['WR2', 'TE', 'RB'], 'red'],
  ['Dagger', 'medium', ['WR2', 'WR1', 'TE'], 'long'], ['Levels', 'medium', ['WR1', 'TE', 'WR2'], ''], ['Flood', 'medium', ['TE', 'WR1', 'RB'], ''],
  ['Smash', 'medium', ['WR2', 'WR1', 'TE'], 'red'], ['Y-Cross', 'medium', ['TE', 'WR1', 'WR2'], 'long'], ['PA Boot', 'medium', ['TE', 'WR2', 'RB'], 'pa'],
  ['Dig', 'medium', ['WR1', 'WR2', 'TE'], 'hurry'], ['Sail', 'medium', ['WR2', 'TE', 'RB'], 'hurry'],
  ['Four Verticals', 'deep', ['WR2', 'WR1', 'TE'], 'hurry long shot'], ['PA Shot', 'deep', ['WR1', 'WR2', 'TE'], 'pa shot'], ['Post-Wheel', 'deep', ['WR2', 'RB', 'WR1'], 'shot', { RB: 18 }],
  ['Go Route', 'deep', ['WR1', 'TE'], 'shot'], ['Double Move', 'deep', ['WR2', 'WR1'], 'shot'], ['Seam', 'deep', ['TE', 'WR2', 'WR1'], '', { TE: 19 }],
];
const has = (tags, t) => tags.split(' ').includes(t);

// How much better this receiver should beat his man today, roughly (positive = good matchup).
function edge(G, slot) {
  const p = G.O[slot], c = { WR1: G.D.CB1, WR2: G.D.CB2, TE: G.D.SS, RB: G.D.LB1 }[slot];
  return mix(G, p, { route_running: 0.4, speed: 0.3, release: 0.15, catching: 0.15 }, 50) - mix(G, c, { man_cover: 0.35, zone_cover: 0.35, speed: 0.3 }, 45);
}

// type: 'run' | 'pass'. sub: the depth or run type the coach wants. ctx: { short, red, clock, hurry, long }.
// Returns { type, sub, name, read, depths, pa, screen }.
export function pickPlay(G, type, sub, ctx) {
  const { R } = G, side = G.s.poss, mem = (G.calls ||= { home: [], away: [] })[side], tg = (G.targets ||= { home: {}, away: {} })[side];
  const total = Object.values(tg).reduce((a, b) => a + b, 0) || 1, ranOk = (G.runGain?.[side] || 0) / Math.max(1, G.runs?.[side] || 1);
  const list = type === 'run' ? RUNS.filter(([, s]) => s === sub || (sub === 'inside' && s === 'sneak' && ctx.short)) : PASSES.filter(([, s]) => s === sub);
  const scored = list.map((pl) => {
    const [name, , a, b] = pl, tags = type === 'run' ? a : b;
    let w = 1;
    ['short', 'red', 'clock', 'hurry', 'long'].forEach((t) => { if (ctx[t] && has(tags, t)) w *= 2.4; });
    if (has(tags, 'red') && !ctx.red && name === 'Fade') w *= 0.15;
    if (has(tags, 'pa')) w *= ranOk > 4.2 ? 2 : ranOk < 3 ? 0.5 : 1;                    // play action works once the run is working
    if (has(tags, 'screen') && ctx.blitzy) w *= 1.8;
    if (name === 'QB Sneak' && !ctx.short) w = 0;
    if (type === 'pass') { const first = a[0]; w *= Math.exp(edge(G, first) / 14); w *= Math.max(0.5, 1.2 - ((tg[first] || 0) / total) * 0.8) * (first === G.O.star ? 1.5 : 1); }   // feed the matchup, spread it around
    if (mem.slice(-2).includes(name)) w *= 0.25;                                          // don't run the same thing three times
    return { pl, w: Math.max(0, w) };
  });
  const sum = scored.reduce((a, o) => a + o.w, 0); let roll = R.r() * sum, pick = scored[0]?.pl;
  for (const o of scored) { roll -= o.w; if (roll <= 0) { pick = o.pl; break; } }
  if (!pick) return { type, sub, name: type === 'run' ? 'Inside Zone' : 'Curl-Flat' };
  mem.push(pick[0]); if (mem.length > 6) mem.shift();
  if (type === 'run') return { type, sub: pick[1], name: pick[0], draw: pick[0] === 'Draw' };
  return { type, sub: pick[1], name: pick[0], read: pick[2], depths: pick[4] || null, pa: has(pick[3], 'pa'), screen: has(pick[3], 'screen') };
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
