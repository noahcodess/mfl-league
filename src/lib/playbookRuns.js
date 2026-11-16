// The run half of the playbook: every run concept in every formation it can come out of (about 100 runs). A concept sets
// the gap (inside/outside/sneak), its feel (yds: a small head start, var: boom-or-bust, fool: how much it freezes the
// linebackers) and when coaches love it (tags). The formation adds its own small push. Ratings still decide the play.
import { FORMATIONS } from './playbookFormations.js';

const UNDER = ['singleback', 'ace', 'i_form', 'strong_i', 'weak_i', 'pistol'];
const GUN = ['shotgun', 'gun_trips', 'gun_bunch', 'pistol'];
const FB = ['i_form', 'strong_i', 'weak_i'];
// [name, sub, tags, { yds, var, fool, vsRush, option }, formations, scheme fit]
// tags: short (short yardage), red (red zone), goal (goal line), clock (killing clock), long (passing downs), hurry
const CONCEPTS = [
  ['Inside Zone', 'inside', '', { var: 1 }, [...UNDER, 'shotgun', 'gun_trips', 'gun_bunch'], { zone_run: 1.5, balanced: 1.1 }],
  ['Split Zone', 'inside', 'clock', { yds: 0.1, var: 0.95 }, ['singleback', 'ace', 'pistol', 'shotgun'], { zone_run: 1.6 }],
  ['Outside Zone', 'outside', '', { var: 1.15 }, [...UNDER, 'shotgun'], { zone_run: 2 }],
  ['Stretch', 'outside', 'clock', { yds: -0.1, var: 1.2 }, UNDER, { zone_run: 1.7, balanced: 1.1 }],
  ['Duo', 'inside', 'clock short', { yds: 0.25, var: 0.8 }, ['singleback', 'ace', 'i_form', 'strong_i', 'pistol'], { ground_pound: 1.7, balanced: 1.1 }],
  ['Power O', 'inside', 'short red clock goal', { yds: 0.35, var: 0.85 }, [...FB, 'singleback', 'pistol', 'goal_line'], { ground_pound: 2 }],
  ['Counter', 'inside', 'red', { yds: -0.1, var: 1.3, fool: 0.6 }, ['singleback', 'i_form', 'pistol', 'shotgun', 'ace'], { ground_pound: 1.4, balanced: 1.2 }],
  ['Iso', 'inside', 'short goal', { yds: 0.3, var: 0.75 }, [...FB, 'goal_line'], { ground_pound: 1.6 }],
  ['Dive', 'inside', 'short goal', { yds: 0.1, var: 0.6 }, [...UNDER, 'goal_line'], { ground_pound: 1.3 }],
  ['Trap', 'inside', '', { var: 1.25, fool: 0.4 }, ['singleback', 'i_form', 'shotgun', 'pistol'], { balanced: 1.2, west_coast: 1.1 }],
  ['Draw', 'inside', 'long', { yds: -0.2, var: 1.35, vsRush: 0.9 }, [...GUN, 'singleback'], { air_raid: 1.6, west_coast: 1.3, vertical: 1.2 }],
  ['Delay', 'inside', 'long', { yds: -0.2, var: 1.3, vsRush: 0.7 }, ['shotgun', 'gun_trips', 'gun_bunch'], { air_raid: 1.5 }],
  ['Toss Sweep', 'outside', 'red', { yds: 0.05, var: 1.4 }, [...FB, 'singleback', 'ace'], { balanced: 1.2, ground_pound: 1.2 }],
  ['Lead Toss', 'outside', 'red goal', { yds: 0.15, var: 1.25 }, [...FB, 'goal_line'], { ground_pound: 1.5 }],
  ['Pitch', 'outside', '', { var: 1.5 }, ['singleback', 'ace', 'i_form', 'pistol', 'shotgun'], { zone_run: 1.4, balanced: 1.1 }],
  ['Read Option', 'inside', 'red', { var: 1.3, fool: 0.5, option: true }, ['shotgun', 'pistol', 'gun_trips'], { zone_run: 1.4, vertical: 1.2, air_raid: 1.1 }],
  ['Speed Option', 'outside', '', { var: 1.5, option: true }, ['shotgun', 'pistol'], { zone_run: 1.3 }],
  ['Wham', 'inside', '', { yds: 0.15, var: 1, fool: 0.3 }, ['singleback', 'ace', 'i_form'], { ground_pound: 1.3, zone_run: 1.2 }],
  ['Crack Toss', 'outside', '', { var: 1.45 }, ['gun_trips', 'gun_bunch', 'ace', 'shotgun'], { air_raid: 1.2, vertical: 1.2 }],
];

export const RUNS = [
  { name: 'QB Sneak', sub: 'sneak', tags: ['short', 'goal'], form: 'goal_line', formName: '', mods: { yds: 0, var: 0.6 }, fit: {} },
  ...CONCEPTS.flatMap(([name, sub, tags, mods, forms, fit]) => forms.filter((f) => FORMATIONS[f].run > -5).map((f) => ({
    name: `${FORMATIONS[f].name} ${name}`, concept: name, sub, tags: tags ? tags.split(' ') : [], form: f, mods, fit,
  }))),
];
