// The defensive playbook: fronts plus coverages plus pressures (about 40 calls). Every call nudges the play a little:
// box: yards taken off runs (minus = easier to run on), deep/under: separation receivers get deep (15+ yards) or
// underneath (under 10), rush: seconds the rush gets home sooner, man/zone, blitz (an extra rusher the back must pick up).
// fit: how much each defensive scheme likes the call. Ratings still decide the play.
const FRONTS = {
  '4-3 Over': { box: 0.15, deep: 0, under: 0 }, '4-3 Under': { box: 0.2, deep: 0, under: 0.05 }, '3-4': { box: 0.1, deep: 0, under: -0.05 },
  'Nickel': { box: -0.15, deep: -0.05, under: -0.1 }, 'Dime': { box: -0.35, deep: -0.15, under: -0.2 }, 'Bear': { box: 0.4, deep: 0.15, under: 0.15 },
  'Goal Line': { box: 0.55, deep: 0.3, under: 0.25 },
};
// [coverage, cov, deep, under, rush, blitz, tags, fit]
const COVERAGES = [
  ['Cover 1', 'man', -0.1, 0, 0, false, 'base short', { lockdown_man: 1.8, blitz: 1.2 }],
  ['Cover 2', 'zone', -0.45, 0.15, 0, false, 'base long', { cover2: 2, bend: 1.4 }],
  ['Tampa 2', 'zone', -0.55, 0.2, 0, false, 'long', { cover2: 1.8, bend: 1.3 }],
  ['Cover 3', 'zone', -0.25, 0.05, 0, false, 'base', { cover3: 2, balanced: 1.2 }],
  ['Cover 4', 'zone', -0.6, 0.25, 0, false, 'long', { bend: 1.8, cover2: 1.2 }],
  ['Cover 6', 'zone', -0.4, 0.1, 0, false, 'base long', { balanced: 1.3, cover3: 1.2 }],
  ['2-Man', 'man', -0.5, -0.15, 0, false, 'long', { lockdown_man: 1.6 }],
  ['Cover 0 Blitz', 'man', 0.6, -0.1, 0.55, true, 'short pressure', { blitz: 2, lockdown_man: 1.2 }],
  ['Cover 1 Blitz', 'man', 0.15, -0.05, 0.35, true, 'pressure', { blitz: 1.8, lockdown_man: 1.3 }],
  ['Fire Zone', 'zone', 0.05, 0.1, 0.3, true, 'pressure long', { blitz: 1.6, cover3: 1.3 }],
  ['Sim Pressure', 'zone', -0.15, 0.05, 0.2, false, 'pressure', { blitz: 1.3, balanced: 1.2 }],
];
const FITS = { // which fronts each coverage is called out of
  'Cover 1': ['4-3 Over', '4-3 Under', '3-4', 'Nickel', 'Bear'], 'Cover 2': ['4-3 Over', 'Nickel', 'Dime', '3-4'], 'Tampa 2': ['4-3 Over', 'Nickel'],
  'Cover 3': ['4-3 Over', '4-3 Under', '3-4', 'Nickel', 'Bear'], 'Cover 4': ['Nickel', 'Dime', '4-3 Over'], 'Cover 6': ['Nickel', '4-3 Under', '3-4'],
  '2-Man': ['Nickel', 'Dime'], 'Cover 0 Blitz': ['4-3 Over', 'Nickel', 'Bear', 'Goal Line'], 'Cover 1 Blitz': ['4-3 Under', '3-4', 'Nickel'],
  'Fire Zone': ['3-4', 'Nickel', '4-3 Under'], 'Sim Pressure': ['Nickel', '3-4', 'Dime'],
};

export const DEF_CALLS = [
  ...COVERAGES.flatMap(([cv, cov, deep, under, rush, blitz, tags, fit]) => FITS[cv].map((front) => {
    const f = FRONTS[front];
    return { name: `${front} ${cv}`, front, coverage: cv, cov, blitz, rush, deep: deep + f.deep, under: under + f.under, box: f.box, tags: tags.split(' '), fit };
  })),
  { name: 'Goal Line Man', front: 'Goal Line', coverage: 'Cover 0', cov: 'man', blitz: false, rush: 0.2, deep: 0.3, under: 0.1, box: 0.55, tags: ['goal', 'short'], fit: {} },
  { name: 'Prevent', front: 'Dime', coverage: 'Prevent', cov: 'zone', blitz: false, rush: -0.3, deep: -1.3, under: 0.9, box: -0.5, tags: ['prevent'], fit: {}, prevent: true },
];
