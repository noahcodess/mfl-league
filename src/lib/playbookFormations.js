// Offensive formations, built for the 10-man roster every team has: QB, RB, TE, 2 WRs and 5 linemen (no fullback, no third
// receiver). A formation nudges a play, it never decides it: heavy sets help the run and play action a little, spread sets
// help receivers get open and hurt the run a little. Every number is small on purpose so ratings stay king.
// run: yards added to a run's start. protect: seconds the pocket holds longer. sep: separation for every route.
// rub: extra separation against man only (stacked receivers). pa: extra separation on play action. short: short yardage.
// look: what the defense sees ('heavy', 'base' or 'spread'). spots: where the 5 skill players line up for the broadcast,
// [yards off the ball, yards from the middle (minus = left)].
const UNDER = { QB: [-2.2, 0], RB: [-6.5, 0] }, GUN = { QB: [-4.5, 0], RB: [-4.5, 1.8] };
export const FORMATIONS = {
  singleback: { name: 'Singleback', run: 0, protect: 0, sep: 0, pa: 0, look: 'base', spots: { ...UNDER, TE: [-1.7, 6.2], WR1: [-0.8, -14], WR2: [-0.8, 14] } },
  tight: { name: 'Singleback Tight', run: 0.12, protect: 0.08, sep: -0.1, pa: 0.15, look: 'heavy', spots: { ...UNDER, TE: [-1.7, 6.2], WR1: [-0.9, -8.5], WR2: [-0.9, 9.5] } },
  twins: { name: 'Twins', run: -0.05, protect: 0, sep: 0.08, pa: 0.05, rub: 0.1, look: 'base', spots: { ...UNDER, TE: [-1.7, 6.2], WR1: [-0.8, -15], WR2: [-1.4, -10] } },
  hback: { name: 'H-Back', run: 0.3, protect: 0.12, sep: -0.12, pa: 0.25, look: 'heavy', spots: { ...UNDER, TE: [-3.6, 2.6], WR1: [-0.8, -14], WR2: [-0.8, 14] } },
  pistol: { name: 'Pistol', run: 0.12, protect: 0.05, sep: 0.02, pa: 0.15, look: 'base', spots: { QB: [-3.8, 0], RB: [-6.6, 0], TE: [-1.7, 6.2], WR1: [-0.8, -14], WR2: [-0.8, 14] } },
  shotgun: { name: 'Shotgun', run: -0.15, protect: 0.1, sep: 0.1, pa: 0, look: 'spread', spots: { ...GUN, TE: [-1.7, 6.2], WR1: [-0.8, -14], WR2: [-0.8, 14] } },
  gun_wing: { name: 'Gun Wing', run: -0.05, protect: 0.15, sep: 0.02, pa: 0.05, look: 'base', spots: { ...GUN, TE: [-2.6, 5.4], WR1: [-0.8, -14], WR2: [-0.8, 14] } },
  gun_trips: { name: 'Gun Trips', run: -0.25, protect: 0, sep: 0.18, pa: 0, rub: 0.15, look: 'spread', spots: { ...GUN, RB: [-4.5, -1.8], TE: [-1.7, 6.2], WR1: [-1.3, 10.5], WR2: [-0.8, 15.5] } },
  gun_bunch: { name: 'Gun Bunch', run: -0.25, protect: 0, sep: 0.08, pa: 0, rub: 0.4, look: 'spread', spots: { ...GUN, RB: [-4.5, -1.8], TE: [-1.6, 7.4], WR1: [-0.8, 9.2], WR2: [-2.5, 9.9] } },
  empty: { name: 'Empty', run: -9, protect: -0.3, sep: 0.3, pa: 0, look: 'spread', spots: { QB: [-4.5, 0], RB: [-0.9, -8.5], TE: [-1.7, 6.2], WR1: [-0.8, -15], WR2: [-0.8, 14] } },
  jumbo: { name: 'Jumbo', run: 0.15, protect: 0.25, sep: -0.45, pa: 0.3, short: 0.6, look: 'heavy', spots: { ...UNDER, TE: [-1.7, 6.2], WR1: [-1.0, -7.5], WR2: [-1.0, 7.8] } },
};

// Which formations each scheme likes to line up in (how often, relative). Every scheme can use every formation.
export const SCHEME_FORMATIONS = {
  air_raid: { shotgun: 3, gun_trips: 3, gun_bunch: 2, empty: 2, gun_wing: 1, pistol: 1, singleback: 0.6, twins: 0.6, tight: 0.2, hback: 0.2, jumbo: 0.3 },
  west_coast: { shotgun: 2, gun_bunch: 2, singleback: 2, twins: 1.5, gun_trips: 1.5, gun_wing: 1.2, pistol: 1, hback: 0.7, tight: 0.6, empty: 0.6, jumbo: 0.5 },
  balanced: { singleback: 2, shotgun: 2, hback: 1.2, pistol: 1, twins: 1, gun_wing: 1, gun_trips: 1, tight: 0.9, gun_bunch: 0.8, empty: 0.4, jumbo: 0.6 },
  ground_pound: { hback: 3, tight: 2.5, singleback: 2, jumbo: 1, pistol: 1, gun_wing: 1, twins: 0.8, shotgun: 0.8, gun_trips: 0.4, gun_bunch: 0.3, empty: 0.15 },
  vertical: { shotgun: 2.5, singleback: 1.5, gun_trips: 2, pistol: 1.2, twins: 1.2, gun_wing: 1, hback: 0.8, empty: 1, gun_bunch: 0.8, tight: 0.5, jumbo: 0.4 },
  zone_run: { pistol: 2.5, singleback: 2.5, twins: 1.5, shotgun: 1.5, hback: 1.2, gun_wing: 1.2, tight: 1, gun_trips: 0.8, gun_bunch: 0.5, empty: 0.3, jumbo: 0.6 },
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
