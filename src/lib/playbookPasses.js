// The pass half of the playbook: every pass concept in every formation it can come out of (about 300 passes), with
// routes for the 4 players who can catch it on every roster: 2 WRs, the TE and the RB. A concept is
// its depth group (quick/short/medium/deep), the order the quarterback reads it, any fixed route depths, and its feel:
// pa (play action), screen, rollout (the QB moves the pocket), protect (extra blockers stay in: more time, one fewer
// route), rub (picks against man), beatsZone/beatsMan/beatsBlitz (where it shines). Ratings still decide the play.
import { FORMATIONS } from './playbookFormations.js';

const ALL = ['singleback', 'twins', 'tight', 'hback', 'pistol', 'shotgun', 'gun_wing', 'gun_trips', 'gun_bunch', 'empty'];
const SPREAD = ['shotgun', 'gun_trips', 'gun_bunch', 'empty', 'twins'];
const PA = ['singleback', 'tight', 'hback', 'pistol', 'twins', 'gun_wing', 'jumbo'];
// [name, sub, read order, tags, mods, depths, formations, scheme fit]
// tags: short, red, goal, hurry (two-minute / sideline), long (3rd and long), shot (deep shot), clock (keeps the clock running)
const CONCEPTS = [
  ['Slant-Flat', 'quick', ['WR1', 'RB', 'TE'], 'short red hurry', { beatsBlitz: 0.3 }, null, ALL, { west_coast: 1.6, air_raid: 1.2 }],
  ['Stick', 'quick', ['TE', 'WR2', 'RB'], 'short', { beatsZone: 0.3 }, null, SPREAD.concat(['singleback']), { air_raid: 1.5, west_coast: 1.4 }],
  ['Stick-Nod', 'medium', ['TE', 'WR1', 'WR2'], 'long', { beatsMan: 0.2 }, { TE: 16 }, ['shotgun', 'gun_trips', 'singleback'], { air_raid: 1.2, vertical: 1.2 }],
  ['Hitch', 'quick', ['WR2', 'WR1', 'RB'], 'hurry', { beatsZone: 0.2 }, null, ALL, { west_coast: 1.3, air_raid: 1.3 }],
  ['Quick Out', 'quick', ['WR1', 'WR2', 'TE'], 'hurry', { beatsZone: 0.15 }, null, ALL, { west_coast: 1.3 }],
  ['Spot', 'quick', ['TE', 'WR2', 'RB'], 'short red', { beatsZone: 0.25 }, null, ['gun_bunch', 'gun_trips', 'shotgun'], { west_coast: 1.5 }],
  ['Bubble Screen', 'quick', ['WR2', 'WR1'], 'screen', { screen: true, beatsBlitz: 0.4 }, { WR2: 0 }, ['gun_trips', 'gun_bunch', 'shotgun', 'twins'], { air_raid: 1.5, zone_run: 1.2 }],
  ['Tunnel Screen', 'quick', ['WR1', 'WR2'], 'screen', { screen: true, beatsBlitz: 0.5 }, { WR1: 0 }, ['shotgun', 'gun_trips', 'twins', 'singleback'], { air_raid: 1.3, west_coast: 1.3 }],
  ['Fade', 'quick', ['WR1', 'WR2'], 'red goal', { beatsMan: 0.2 }, { WR1: 9, WR2: 9 }, ['shotgun', 'gun_trips', 'singleback', 'jumbo'], { vertical: 1.3 }],
  ['Slant RPO', 'quick', ['WR1', 'WR2', 'TE'], 'short', { beatsZone: 0.2, rpo: true }, null, ['shotgun', 'pistol', 'gun_trips'], { zone_run: 1.6, air_raid: 1.3 }],
  ['Glance RPO', 'short', ['WR2', 'WR1', 'TE'], '', { rpo: true, beatsMan: 0.15 }, { WR2: 11 }, ['shotgun', 'pistol'], { zone_run: 1.5, vertical: 1.2 }],
  ['Mesh', 'short', ['TE', 'WR2', 'WR1', 'RB'], 'short', { rub: 0.5, beatsMan: 0.3 }, null, SPREAD, { air_raid: 2 }],
  ['Shallow Cross', 'short', ['WR2', 'TE', 'WR1'], '', { rub: 0.25, beatsMan: 0.2 }, null, ALL, { air_raid: 1.5, west_coast: 1.3 }],
  ['Spacing', 'short', ['WR2', 'TE', 'WR1', 'RB'], '', { beatsZone: 0.3 }, null, SPREAD.concat(['singleback']), { west_coast: 1.5 }],
  ['Curl-Flat', 'short', ['WR1', 'RB', 'TE'], '', { beatsZone: 0.2 }, null, ALL, { west_coast: 1.3, balanced: 1.2 }],
  ['Hank', 'short', ['WR1', 'WR2', 'TE'], '', { beatsZone: 0.25 }, null, ['shotgun', 'gun_trips', 'twins', 'singleback'], { air_raid: 1.3 }],
  ['Drive', 'short', ['TE', 'WR1', 'RB'], 'red', { rub: 0.2 }, null, ALL, { west_coast: 1.4, air_raid: 1.3 }],
  ['Snag', 'short', ['WR2', 'TE', 'RB'], 'red goal', { beatsZone: 0.3 }, null, ['gun_bunch', 'gun_trips', 'shotgun', 'singleback'], { west_coast: 1.4 }],
  ['Texas', 'short', ['RB', 'TE', 'WR1'], 'long', { beatsMan: 0.3 }, { RB: 6 }, ['shotgun', 'singleback', 'pistol', 'hback'], { west_coast: 1.6 }],
  ['RB Screen', 'short', ['RB', 'TE'], 'screen long', { screen: true, beatsBlitz: 0.6 }, { RB: 0 }, ['shotgun', 'singleback', 'pistol', 'hback', 'gun_wing'], { west_coast: 1.6, balanced: 1.2 }],
  ['Jailbreak Screen', 'short', ['WR1', 'WR2'], 'screen long', { screen: true, beatsBlitz: 0.55 }, { WR1: 0 }, ['gun_trips', 'shotgun', 'empty'], { air_raid: 1.4 }],
  ['Dagger', 'medium', ['WR2', 'WR1', 'TE'], 'long', { beatsZone: 0.3 }, null, ALL, { air_raid: 1.4, vertical: 1.4 }],
  ['Levels', 'medium', ['WR1', 'TE', 'WR2'], '', { beatsZone: 0.25 }, null, ALL, { air_raid: 1.4, balanced: 1.1 }],
  ['Hi-Lo', 'medium', ['TE', 'WR1', 'RB'], '', { beatsZone: 0.3 }, null, ALL, { west_coast: 1.3 }],
  ['Flood', 'medium', ['TE', 'WR1', 'RB'], '', { beatsZone: 0.35 }, null, ['singleback', 'hback', 'pistol', 'shotgun', 'gun_trips'], { balanced: 1.3, zone_run: 1.2 }],
  ['Smash', 'medium', ['WR2', 'WR1', 'TE'], 'red', { beatsZone: 0.35 }, { WR2: 13 }, ALL, { balanced: 1.3, vertical: 1.2 }],
  ['Y-Cross', 'medium', ['TE', 'WR1', 'WR2'], 'long', { beatsMan: 0.15, beatsZone: 0.15 }, null, ALL, { air_raid: 1.6 }],
  ['Dig', 'medium', ['WR1', 'WR2', 'TE'], 'long', { beatsZone: 0.2 }, null, ALL, { balanced: 1.2, vertical: 1.2 }],
  ['Sail', 'medium', ['WR2', 'TE', 'RB'], 'hurry', { beatsZone: 0.3 }, null, ALL, { balanced: 1.2 }],
  ['Out-Wheel', 'medium', ['WR2', 'RB', 'TE'], 'hurry', { beatsMan: 0.3 }, { RB: 16 }, ['shotgun', 'singleback', 'pistol', 'twins'], { vertical: 1.3 }],
  ['Corner-Flat', 'medium', ['WR1', 'RB', 'TE'], 'red hurry', { beatsZone: 0.25 }, { WR1: 14 }, ALL, { balanced: 1.2 }],
  ['Choice', 'medium', ['TE', 'WR1', 'WR2'], '', { beatsMan: 0.2, beatsZone: 0.2 }, null, ['shotgun', 'empty', 'gun_trips'], { air_raid: 1.4, west_coast: 1.2 }],
  ['PA Boot', 'medium', ['TE', 'WR2', 'RB'], 'clock', { pa: true, rollout: true }, null, PA, { zone_run: 2, balanced: 1.2 }],
  ['Flood Boot', 'medium', ['WR2', 'TE', 'RB'], '', { pa: true, rollout: true, beatsZone: 0.2 }, null, PA, { zone_run: 1.8 }],
  ['PA Crossers', 'medium', ['WR1', 'TE', 'WR2'], '', { pa: true, beatsMan: 0.2 }, null, PA, { zone_run: 1.6, west_coast: 1.2 }],
  ['Mills', 'deep', ['WR2', 'WR1', 'TE'], 'shot', { beatsZone: 0.25 }, { WR2: 22 }, ALL, { vertical: 1.6, air_raid: 1.2 }],
  ['Four Verticals', 'deep', ['WR2', 'WR1', 'TE'], 'hurry long shot', { beatsZone: 0.2 }, null, SPREAD.concat(['singleback']), { air_raid: 1.8, vertical: 1.5 }],
  ['Verts Bender', 'deep', ['TE', 'WR2', 'WR1'], 'shot', { beatsZone: 0.3 }, { TE: 18 }, ['shotgun', 'gun_trips', 'empty'], { air_raid: 1.4 }],
  ['PA Shot', 'deep', ['WR1', 'WR2', 'TE'], 'shot', { pa: true, protect: 0.25 }, null, PA, { vertical: 1.6, zone_run: 1.6, ground_pound: 1.5 }],
  ['Yankee', 'deep', ['WR1', 'WR2', 'TE'], 'shot', { pa: true, protect: 0.3, beatsZone: 0.2 }, { WR1: 26, WR2: 18 }, PA, { vertical: 1.7, ground_pound: 1.4 }],
  ['Max Protect Go', 'deep', ['WR1', 'WR2'], 'shot', { protect: 0.45, beatsMan: 0.15 }, null, ['hback', 'tight', 'singleback', 'shotgun'], { vertical: 1.6, ground_pound: 1.3 }],
  ['Post-Wheel', 'deep', ['WR2', 'RB', 'WR1'], 'shot', { beatsMan: 0.25 }, { RB: 18 }, ['shotgun', 'singleback', 'pistol', 'twins'], { vertical: 1.4 }],
  ['Go Route', 'deep', ['WR1', 'TE'], 'shot', { beatsMan: 0.2 }, null, ALL, { vertical: 1.5 }],
  ['Double Move', 'deep', ['WR2', 'WR1'], 'shot', { beatsMan: 0.35 }, null, ALL, { vertical: 1.5 }],
  ['Sluggo', 'deep', ['WR1', 'WR2', 'TE'], 'shot', { beatsMan: 0.35, beatsBlitz: -0.3 }, null, ALL, { vertical: 1.4, air_raid: 1.1 }],
  ['Corner-Post', 'deep', ['WR2', 'WR1', 'TE'], 'shot', { beatsZone: 0.3 }, null, ALL, { vertical: 1.4, balanced: 1.1 }],
  ['Seam', 'deep', ['TE', 'WR2', 'WR1'], '', { beatsZone: 0.25 }, { TE: 19 }, ['singleback', 'twins', 'shotgun', 'pistol', 'gun_trips'], { balanced: 1.3, west_coast: 1.1 }],
  ['Hail Mary', 'deep', ['WR1', 'WR2', 'TE'], 'hail', { protect: 0.3 }, { WR1: 42, WR2: 42, TE: 40 }, ['shotgun'], {}],
];

export const PASSES = CONCEPTS.flatMap(([name, sub, read, tags, mods, depths, forms, fit]) => [...new Set(forms)].filter((f) => FORMATIONS[f]).map((f) => ({
  name: name === 'Hail Mary' ? 'Hail Mary' : `${FORMATIONS[f].name} ${name}`, concept: name, sub, read, tags: tags ? tags.split(' ') : [], mods, depths, form: f, fit,
})));
