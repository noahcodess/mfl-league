// Coaching schemes (Madden-style): 6 offenses and 6 defenses, and what Auto picks from a roster. Written for the 10-man teams
// the league plays with: QB, RB, TE, 2 WRs and 5 linemen on offense; 5 linemen, 2 LBs, 2 CBs and 1 safety on defense.
// A scheme sets a team's habits (favorite formations, calls and how often it throws), never more than about half its calls.
export const OFFENSES = [
  ['air_raid', 'Air Raid', 'Shotgun, Trips and Empty: spread the receivers, tight end and even the running back out and throw it all over.'],
  ['west_coast', 'West Coast', 'Quick, timed short passes out of Bunch and Twins that work like a run game to move the chains.'],
  ['balanced', 'Balanced', 'A pro-style mix of formations, runs and passes so the defense never knows what is coming.'],
  ['ground_pound', 'Ground & Pound', 'Under center with the tight end leading the way from the H-Back spot: power runs that wear defenses down.'],
  ['vertical', 'Vertical Attack', 'Stretch the field with deep routes, double moves and play-action shots for explosive plays.'],
  ['zone_run', 'Zone Run & Play Action', 'Pistol and Singleback zone runs that set up bootlegs and play action off the same look.'],
];
export const DEFENSES = [
  ['blitz', 'Blitz Heavy', 'Send linebackers and the safety after the QB: sacks and rushed throws, but nobody deep when it misses.'],
  ['lockdown_man', 'Lockdown Man', 'Corners lock up the receivers one on one, linebackers take the back and tight end, the safety stays deep.'],
  ['balanced', 'Balanced', 'Mix fronts and coverages so the offense can never settle into a rhythm.'],
  ['cover2', 'Cover 2 Roll', 'With one safety, a corner rolls back so the two split the deep field in halves while everyone else jumps short routes.'],
  ['cover3', 'Cover 3 Zone', 'Both corners and the safety each take a deep third while the linemen and linebackers stay home against the run.'],
  ['bend', "Bend Don't Break", 'Corners and the safety play deep so nothing gets over the top, and offenses have to drive the whole field.'],
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
