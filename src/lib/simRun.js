// Run plays: the blockers at the point of attack against the defenders in those gaps decide the hole, the back's vision and
// burst decide what he does with it, then he takes on tacklers one at a time (simCarry).
import { addEvent } from './simReport.js';
import { mix, val, stat } from './simCore.js';
import { carry } from './simCarry.js';

const R0 = (G) => G.R.r();

const BLOCK = { run_block: 0.5, strength: 0.25, footwork: 0.15, agility: 0.1 }, STOP = { run_stop: 0.4, block_shed: 0.3, strength: 0.3 };
// Who blocks who at each point of attack: [blocker slot, defender slot].
const GAPS = {
  inside: { left: [['OG1', 'DT1'], ['C', 'DL']], right: [['OG2', 'DT2'], ['C', 'DL']] },
  outside: { left: [['OT1', 'DE1'], ['OG1', 'DT1']], right: [['OT2', 'DE2'], ['TE', 'LB2']] },
};

// call: 'inside' | 'outside' | 'sneak'. plan: the playbook call (its mods: yds head start, var boom-or-bust, fool freezes the
// linebackers, vsRush beats a blitz, option lets a fast QB keep it, short helps in short yardage). def: the defensive call
// (box: men in the box take yards away). Fills the play report and returns { gain, td, fumble, time }.
export function runPlay(G, play, call, plan = {}, def = {}) {
  const m = plan.mods || {}, keep = m.option && R0(G) < 0.3 + (val(G, G.O.QB, 'speed', 50) - 70) / 60;
  const { R, O, D } = G, sneak = call === 'sneak', rb = sneak || keep ? O.QB : O.RB, side = R.chance(0.5) ? 'left' : 'right';
  const pairs = GAPS[sneak ? 'inside' : call][side], toGoal = 100 - G.s.ballOn;
  let hole = 0, winner = null, best = 10;
  pairs.forEach(([o, d]) => {
    const m = mix(G, O[o], BLOCK) - mix(G, D[d], d.startsWith('LB') ? { block_shed: 0.5, tackling: 0.3, play_rec: 0.2 } : STOP) + R.gauss(0, 7);
    hole += m / pairs.length;
    addEvent(play, 'block', 0.6, { off: O[o].id, def: D[d].id, win: m >= 0 ? 'off' : 'def', move: m >= 8 ? 'pancake' : m >= 0 ? 'drive' : 'shed', margin: Math.round(m) });
    if (-m > best) { best = -m; winner = D[d]; }
  });
  addEvent(play, 'handoff', 0.5, { qb: O.QB.id, to: rb.id, gap: `${call} ${side}` });
  stat(play, rb, 'car');
  const burst = (val(G, rb, 'vision', 55) - 65) / 30 + (val(G, rb, 'acceleration', val(G, rb, 'speed', 55)) - 65) / 40;
  const lean = (m.yds || 0) + (G.s.toGo <= 2 ? m.short || 0 : 0) - (def.box || 0) + (def.blitz ? m.vsRush || 0 : 0) - (def.blitz && !m.vsRush ? 0.15 : 0)
    - (keep && def.robber ? 0.8 : 0);   // a robber spying the QB takes away his keeper
  const pre = sneak ? 0.8 + hole / 10 + lean * 0.5 + R.gauss(0, 0.6) : (call === 'outside' ? 3.7 : 3.4) + hole / 8 + burst + lean + R.gauss(0, (call === 'outside' ? 1.9 : 1.2) * (m.var || 1));
  const near = side === 'left' ? D.LB1 : D.LB2, far = side === 'left' ? D.LB2 : D.LB1, read = (lb) => (val(G, lb, 'play_rec', 55) - 65) / 22;
  const line = [];
  if (winner) line.push({ p: winner, at: Math.min(pre - 2, R.int(-2, 1)) });   // a lineman who whipped his blocker meets him in the backfield
  if (R.chance(0.4)) line.push({ p: D[R.pick(pairs)[1]], at: pre - 0.3 });           // sometimes the man being blocked still gets a hand on him
  if (R.chance(0.25)) line.push({ p: D.SS, at: pre + 0.5 });                         // the safety came down into the box
  line.push({ p: near, at: pre - read(near) + (m.fool || 0) }, { p: far, at: pre + 3 - read(far) + (m.fool || 0) }, { p: D.SS, at: pre + 6 }, { p: side === 'left' ? D.CB1 : D.CB2, at: pre + 11 });
  const out = carry(G, play, rb, -0.5, sneak ? line.slice(0, 2) : line, toGoal, [D.CB1, D.CB2, D.SS], 0.9);
  const gain = Math.round(out.end);
  stat(play, rb, 'ryds', gain); stat(play, rb, 'rlong', gain); if (out.td) stat(play, rb, 'rtd');
  if (gain < 0 && out.tackler) stat(play, out.tackler, 'tfl');
  play.kind = 'run'; play.carrier = rb.id;
  play.text = out.td ? `${rb.last} ${call === 'outside' ? 'around the edge' : 'up the middle'}... TOUCHDOWN!`
    : `${rb.last} ${sneak ? 'sneaks' : call === 'outside' ? `sweeps ${side}` : 'up the middle'} for ${gain > 0 ? `${gain} yard${gain === 1 ? '' : 's'}` : gain === 0 ? 'no gain' : `a loss of ${-gain}`}${out.tackler ? `. Tackle by ${out.tackler.last}` : ''}.`;
  return { gain, td: out.td, fumble: out.fumble, time: out.time + 1.5, oob: call === 'outside' && !out.td && R.chance(0.18) };
}
