// The defensive playbook, built for the 10-man defense every team has: 5 linemen (DL, 2 DT, 2 DE), 2 linebackers, 2 corners
// and 1 safety. No nickel or dime backs and no second safety: fronts change by who stands up or drops, and every coverage
// is drawn for 3 defensive backs. Every call nudges the play a little:
// box: yards taken off runs (minus = easier to run on), deep/under: separation receivers get deep (15+ yards) or
// underneath (under 10), rush: seconds the rush gets home sooner (minus = later), blitz: an extra rusher the back must pick
// up. fit: how much each defensive scheme likes it. vs: how it lines up against what the offense shows ('heavy'/'spread').
// Ratings still decide the play.
export const FRONTS = {
  '5-2': { info: 'All five linemen down, two linebackers behind them.', box: 0.15, deep: 0, under: 0, rush: 0, vs: { heavy: 1.5, base: 1.2, spread: 0.6 } },
  '4-3 Look': { info: 'One end stands up as a third linebacker.', box: 0.08, deep: 0, under: -0.06, rush: -0.03, vs: { heavy: 1, base: 1.3, spread: 1 } },
  '3-4 Look': { info: 'Both ends stand up on the edges and can rush or drop.', box: 0.04, deep: 0, under: -0.1, rush: 0.03, vs: { heavy: 0.8, base: 1.1, spread: 1.2 } },
  'Bear': { info: 'Five down tight with the linebackers walked up: a wall against the run.', box: 0.4, deep: 0.15, under: 0.15, rush: 0.05, vs: { heavy: 2.4, base: 0.6, spread: 0.12 } },
  'Spread': { info: 'An end drops into coverage and the linebackers widen to match a spread-out offense.', box: -0.35, deep: -0.05, under: -0.2, rush: -0.15, vs: { heavy: 0.1, base: 0.7, spread: 2.4 } },
  'Goal Line': { info: 'Everyone crowds the line.', box: 0.55, deep: 0.3, under: 0.25, rush: 0.05, vs: { heavy: 2, base: 0.8, spread: 0.2 } },
};
// [name, cov, deep, under, rush, blitz, tags, fit, fronts, what it is]
const COVERAGES = [
  ['Cover 1', 'man', -0.1, 0, 0, false, 'base short', { lockdown_man: 1.8, blitz: 1.2 }, ['5-2', '4-3 Look', '3-4 Look', 'Bear'],
    'Corners lock on the receivers, linebackers take the back and tight end, the safety alone deep.'],
  ['Cover 1 Robber', 'man', -0.05, -0.2, 0, false, 'base', { lockdown_man: 1.5, balanced: 1.2 }, ['4-3 Look', '5-2', '3-4 Look'],
    'Man coverage with a linebacker sitting in the middle to rob crossing routes and spy the quarterback.'],
  ['Cover 2 Roll', 'zone', -0.45, 0.15, 0, false, 'base long', { cover2: 2, bend: 1.4 }, ['4-3 Look', '3-4 Look', 'Spread'],
    'One corner rolls back so he and the safety split the deep field in halves; the other corner and the linebackers sit underneath.'],
  ['Cover 3', 'zone', -0.25, 0.06, 0, false, 'base', { cover3: 2, balanced: 1.2 }, ['5-2', '4-3 Look', '3-4 Look', 'Bear', 'Spread'],
    'Both corners and the safety each take a deep third; the linebackers and an end cover underneath.'],
  ['Cover 3 Deep', 'zone', -0.55, 0.2, -0.05, false, 'long', { bend: 1.8, cover3: 1.2 }, ['Spread', '3-4 Look'],
    'Cover 3 played extra deep: nothing gets over the top, but short throws are open.'],
  ['Cover 0 Blitz', 'man', 0.6, -0.1, 0.55, true, 'short pressure', { blitz: 2, lockdown_man: 1.2 }, ['5-2', 'Bear', 'Goal Line', '4-3 Look'],
    'Everyone in man and the safety and a linebacker blitz. Nobody deep if it fails.'],
  ['Cover 1 Blitz', 'man', 0.15, -0.05, 0.35, true, 'pressure', { blitz: 1.8, lockdown_man: 1.3 }, ['5-2', '4-3 Look', '3-4 Look'],
    'A linebacker blitzes with man coverage behind him and the safety deep.'],
  ['Fire Zone', 'zone', 0.05, 0.1, 0.3, true, 'pressure long', { blitz: 1.6, cover3: 1.3 }, ['3-4 Look', '4-3 Look', 'Spread'],
    'A linebacker blitzes and an end drops into his spot, with three deep behind it.'],
  ['Sim Pressure', 'zone', -0.15, 0.05, 0.2, false, 'pressure', { blitz: 1.3, balanced: 1.2 }, ['3-4 Look', 'Spread', '4-3 Look'],
    'Shows a blitz, sends five, drops an end: pressure without giving up the deep ball.'],
];

export const DEF_CALLS = [
  ...COVERAGES.flatMap(([cv, cov, deep, under, rush, blitz, tags, fit, fronts, info]) => fronts.map((front) => {
    const f = FRONTS[front];
    return { name: `${front} ${cv}`, front, coverage: cv, info, cov, blitz, rush: rush + f.rush, deep: deep + f.deep, under: under + f.under, box: f.box,
      tags: tags.split(' '), fit, vs: f.vs, robber: cv === 'Cover 1 Robber' };
  })),
  { name: 'Goal Line Man', front: 'Goal Line', coverage: 'Goal Line Man', info: 'Everyone crowds the line in man coverage.', cov: 'man', blitz: false, rush: 0.2,
    deep: 0.3, under: 0.1, box: 0.55, tags: ['goal', 'short'], fit: {}, vs: FRONTS['Goal Line'].vs },
  { name: 'Prevent', front: 'Spread', coverage: 'Prevent', info: 'Rush four, everyone else deep. Gives up short stuff to stop the long one.', cov: 'zone', blitz: false,
    rush: -0.3, deep: -1.3, under: 0.9, box: -0.5, tags: ['prevent'], fit: {}, vs: FRONTS.Spread.vs, prevent: true },
];
