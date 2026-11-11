// Coaching schemes: 5 offense and 5 defense styles, and what Auto picks from a roster (strong passing group = pass-heavy, etc.).
export const OFFENSES = [
  ['air_raid', 'Air Raid', 'Pass-heavy, lots of deep shots.'],
  ['west_coast', 'West Coast', 'Quick, short passes to move the chains.'],
  ['balanced', 'Balanced', 'A healthy mix of run and pass.'],
  ['ground_pound', 'Ground & Pound', 'Run-heavy, wear the defense down.'],
  ['spread_option', 'Spread Option', 'Spread them out; the QB keeps it or pitches.'],
];
export const DEFENSES = [
  ['blitz', 'Blitz Heavy', 'Send extra rushers at the QB.'],
  ['man_press', 'Man Press', 'Lock up receivers one-on-one at the line.'],
  ['balanced', 'Balanced', 'Mix coverages and pressures.'],
  ['zone', 'Zone Cover', 'Sit in zones and read the QB.'],
  ['bend', "Bend Don't Break", 'Give up short stuff, stop the big play.'],
];
export const schemeName = (list, id) => list.find(([k]) => k === id)?.[1] || 'Balanced';

const avg = (xs) => (xs.length ? xs.reduce((s, p) => s + p.stars, 0) / xs.length : 0);
const top = (players, pos, n) => players.filter((p) => p.position === pos).sort((a, b) => b.stars - a.stars).slice(0, n);

// Auto: compares the passing group (QB, WRs, TE) to the run game (RB, line), and the pass rush to the coverage.
export function autoScheme(players) {
  const pass = avg([...top(players, 'QB', 1), ...top(players, 'QB', 1), ...top(players, 'WR', 2), ...top(players, 'TE', 1)]);
  const run = avg([...top(players, 'RB', 1), ...top(players, 'RB', 1), ...top(players, 'OT', 2), ...top(players, 'OG', 2), ...top(players, 'C', 1)]);
  const rush = avg([...top(players, 'DE', 2), ...top(players, 'DT', 2), ...top(players, 'DL', 1), ...top(players, 'LB', 2)]);
  const cover = avg([...top(players, 'CB', 2), ...top(players, 'SS', 1)]);
  const qb = top(players, 'QB', 1)[0];
  const offense = pass - run >= 0.5 ? 'air_raid' : pass - run >= 0.2 ? 'west_coast' : run - pass >= 0.5 ? 'ground_pound' : run - pass >= 0.2 && qb?.stars >= 3 ? 'spread_option' : 'balanced';
  const defense = rush - cover >= 0.5 ? 'blitz' : rush - cover >= 0.2 ? 'zone' : cover - rush >= 0.5 ? 'man_press' : cover - rush >= 0.2 ? 'bend' : 'balanced';
  return { offense, defense, why: `Passing group ${pass.toFixed(1)}★ vs run game ${run.toFixed(1)}★ · pass rush ${rush.toFixed(1)}★ vs coverage ${cover.toFixed(1)}★` };
}
