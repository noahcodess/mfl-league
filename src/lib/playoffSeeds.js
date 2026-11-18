// Playoff seeds: the top 4 in each conference by record (wins, then losses, then point difference). Seed 1 plays 4 and
// 2 plays 3, the better seed at home; the winners meet for the conference title, and the two champions play the Craft Bowl.
import { standings } from './seasonStats.js';

export const PLAYOFF_SPOTS = 4;
export function playoffSeeds(teams, rec) {
  const conf = standings(teams, rec), out = {};
  Object.entries(conf).forEach(([name, list]) => { out[name] = list.slice(0, PLAYOFF_SPOTS).map((r, k) => ({ id: r.id, seed: k + 1, w: r.w, l: r.l })); });
  return out;
}
// First-round games for one conference: [[home, away], [home, away]].
export const firstRound = (seeds) => (seeds.length < 4 ? [] : [[seeds[0], seeds[3]], [seeds[1], seeds[2]]]);
