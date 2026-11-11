// Coaching schemes (Madden-style): 6 offenses and 6 defenses, and what Auto picks from a roster.
export const OFFENSES = [
  ['air_raid', 'Air Raid', 'Spread out with four or five receivers and throw on almost every down.'],
  ['west_coast', 'West Coast', 'Quick, timed short passes that work like a run game to move the chains.'],
  ['balanced', 'Balanced', 'A pro-style mix of run and pass so the defense never knows what is coming.'],
  ['ground_pound', 'Ground & Pound', 'Power runs behind big blockers to control the clock and wear defenses down.'],
  ['vertical', 'Vertical Attack', 'Stretch the field with deep routes and big-armed throws for explosive plays.'],
  ['zone_run', 'Zone Run & Play Action', 'Outside zone runs that set up play-action passes off the same look.'],
];
export const DEFENSES = [
  ['blitz', 'Blitz Heavy', 'Send linebackers and safeties after the QB to force sacks and rushed throws.'],
  ['lockdown_man', 'Lockdown Man', 'Trust your corners to win one-on-one so everyone else can attack the ball.'],
  ['balanced', 'Balanced', 'Mix fronts and coverages so the offense can never settle into a rhythm.'],
  ['cover2', 'Cover 2 Zone', 'Two safeties split the deep field while corners and linebackers jump short routes.'],
  ['cover3', 'Cover 3 Zone', 'Three deep defenders plus an extra man near the line to shut down the run.'],
  ['bend', "Bend Don't Break", 'Keep safeties deep so nothing gets over the top and make offenses drive the whole field.'],
];
export const schemeName = (list, id) => list.find(([k]) => k === id)?.[1] || 'Balanced';
export const schemeInfo = (list, id) => list.find(([k]) => k === id) || list[2];

const avg = (xs) => (xs.length ? xs.reduce((s, p) => s + p.stars, 0) / xs.length : 0);
const top = (players, pos, n) => players.filter((p) => p.position === pos).sort((a, b) => b.stars - a.stars).slice(0, n);

// Auto: compares the passing group (QB, WRs, TE) to the run game (RB, line), and the pass rush to the coverage.
export function autoScheme(players) {
  const qb = top(players, 'QB', 1);
  const pass = avg([...qb, ...qb, ...top(players, 'WR', 2), ...top(players, 'TE', 1)]);
  const rb = top(players, 'RB', 1);
  const run = avg([...rb, ...rb, ...top(players, 'OT', 2), ...top(players, 'OG', 2), ...top(players, 'C', 1)]);
  const rush = avg([...top(players, 'DE', 2), ...top(players, 'DT', 2), ...top(players, 'DL', 1), ...top(players, 'LB', 2)]);
  const cover = avg([...top(players, 'CB', 2), ...top(players, 'SS', 1)]);
  const offense = pass - run >= 0.5 ? 'air_raid' : pass - run >= 0.2 ? (qb[0]?.stars >= 4 ? 'vertical' : 'west_coast')
    : run - pass >= 0.5 ? 'ground_pound' : run - pass >= 0.2 ? 'zone_run' : 'balanced';
  const defense = rush < 3 && cover < 3 ? 'bend' : rush - cover >= 0.5 ? 'blitz' : rush - cover >= 0.2 ? 'cover3'
    : cover - rush >= 0.5 ? 'lockdown_man' : cover - rush >= 0.2 ? 'cover2' : 'balanced';
  return { offense, defense, pass, run, rush, cover };
}
