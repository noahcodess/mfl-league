// Offensive formations. A formation nudges a play, it never decides it: heavy sets help the run and play action a little,
// spread sets help receivers get open and hurt the run a little. Every number is small on purpose so ratings stay king.
// run: yards added to a run's starting point. protect: seconds the pocket holds longer (minus = shorter).
// sep: yards of extra separation for every route. rub: extra separation against man coverage only (stacked/bunched).
// pa: extra separation on play action. short: helps only in short yardage (goal line).
export const FORMATIONS = {
  singleback: { name: 'Singleback', run: 0, protect: 0, sep: 0, pa: 0 },
  ace: { name: 'Ace Twins', run: -0.05, protect: 0, sep: 0.08, pa: 0.05 },
  i_form: { name: 'I-Form', run: 0.3, protect: 0.12, sep: -0.12, pa: 0.25 },
  strong_i: { name: 'Strong I', run: 0.35, protect: 0.15, sep: -0.18, pa: 0.2 },
  weak_i: { name: 'Weak I', run: 0.25, protect: 0.1, sep: -0.1, pa: 0.2 },
  pistol: { name: 'Pistol', run: 0.12, protect: 0.05, sep: 0.02, pa: 0.15 },
  shotgun: { name: 'Shotgun', run: -0.15, protect: 0.1, sep: 0.1, pa: 0 },
  gun_trips: { name: 'Gun Trips', run: -0.25, protect: 0, sep: 0.18, pa: 0, rub: 0.15 },
  gun_bunch: { name: 'Gun Bunch', run: -0.25, protect: 0, sep: 0.08, pa: 0, rub: 0.4 },
  empty: { name: 'Empty', run: -9, protect: -0.3, sep: 0.3, pa: 0 },
  goal_line: { name: 'Goal Line', run: 0.15, protect: 0.25, sep: -0.45, pa: 0.3, short: 0.6 },
};

// Which formations each scheme likes to line up in (how often, relative). Every scheme can use every formation.
export const SCHEME_FORMATIONS = {
  air_raid: { shotgun: 3, gun_trips: 3, gun_bunch: 2, empty: 2, pistol: 1, singleback: 0.6, ace: 0.6, i_form: 0.3, strong_i: 0.2, weak_i: 0.2, goal_line: 0.3 },
  west_coast: { shotgun: 2, gun_bunch: 2, singleback: 2, ace: 1.5, gun_trips: 1.5, pistol: 1, i_form: 0.8, weak_i: 0.6, strong_i: 0.4, empty: 0.6, goal_line: 0.5 },
  balanced: { singleback: 2, shotgun: 2, i_form: 1.3, pistol: 1, ace: 1, gun_trips: 1, gun_bunch: 0.8, strong_i: 0.8, weak_i: 0.8, empty: 0.4, goal_line: 0.6 },
  ground_pound: { i_form: 3, strong_i: 2.5, singleback: 2, weak_i: 1.5, pistol: 1, ace: 0.8, shotgun: 0.8, gun_trips: 0.4, gun_bunch: 0.3, empty: 0.15, goal_line: 1 },
  vertical: { shotgun: 2.5, singleback: 1.5, gun_trips: 2, pistol: 1.2, ace: 1.2, i_form: 0.8, empty: 1, gun_bunch: 0.8, strong_i: 0.5, weak_i: 0.5, goal_line: 0.4 },
  zone_run: { pistol: 2.5, singleback: 2.5, ace: 1.5, shotgun: 1.5, i_form: 1, weak_i: 1, strong_i: 0.8, gun_trips: 0.8, gun_bunch: 0.5, empty: 0.3, goal_line: 0.6 },
};

// How much each scheme throws compared to a balanced team (added to the pass rate), and which depths it reaches for.
// Skills matter more than this: a team's passing edge from its players can move it about twice as far.
export const SCHEME_LEAN = {
  air_raid: { pass: 0.08, depth: { quick: 1.3, short: 1.2, medium: 1, deep: 1.1 } },
  west_coast: { pass: 0.04, depth: { quick: 1.5, short: 1.4, medium: 0.9, deep: 0.6 } },
  balanced: { pass: 0, depth: { quick: 1, short: 1, medium: 1, deep: 1 } },
  ground_pound: { pass: -0.07, depth: { quick: 0.9, short: 1, medium: 1, deep: 1 } },
  vertical: { pass: 0.05, depth: { quick: 0.7, short: 0.8, medium: 1.2, deep: 1.7 } },
  zone_run: { pass: -0.04, depth: { quick: 0.9, short: 1, medium: 1.2, deep: 1.1 } },
};
