// Dev-only playoff preview (?demoplay=13|14|15|16; 13 = the award ceremony week, just before): the regular season all played, then the rounds up to that week set,
// every round before it already played. Used by the demo schedule so the playoff screens can be seen offline.
import { getTeams } from './teams.js';
import { records } from '../lib/seasonStats.js';
import { playoffSeeds, firstRound } from '../lib/playoffSeeds.js';

export const DEMO_PLAY = import.meta.env.DEV ? +(new URLSearchParams(window.location.search).get('demoplay') || 0) : 0;

const win = (g) => (g.home_score > g.away_score ? g.home : g.away);

export function demoPlayoffGames(regular) {
  if (!DEMO_PLAY) return [];
  const weeks = Array.from({ length: 12 }, (_, i) => ({ games: regular.filter((g) => g.week === i + 1).map((g) => ({ ...g, homeScore: g.home_score, awayScore: g.away_score })) }));
  const seeds = playoffSeeds(getTeams(), records(weeks)), seedOf = Object.fromEntries(Object.values(seeds).flat().map((s) => [s.id, s.seed]));
  let id = 9000;
  const game = (week, kind, a, b, played) => {
    const [home, away] = seedOf[a] <= seedOf[b] ? [a, b] : [b, a];
    return { id: ++id, week, kind, home, away, rivalry: false, slot: null, prime: kind === 'craft_bowl' ? 'sun_night' : null, starts_at: null,
      status: played ? 'final' : 'scheduled', home_score: played ? 24 + (id % 9) : null, away_score: played ? 17 + (id % 11) : null, odds: { home_win: 0.55, away_win: 0.45, rating: 'great', keys: [] } };
  };
  const out = [], champs = [];
  for (const list of DEMO_PLAY >= 14 ? Object.values(seeds) : []) {
    const qf = firstRound(list).map(([h, a]) => game(14, 'quarterfinal', h.id, a.id, DEMO_PLAY > 14));
    out.push(...qf);
    if (DEMO_PLAY >= 15) { const sf = game(15, 'semifinal', win(qf[0]), win(qf[1]), DEMO_PLAY > 15); out.push(sf); champs.push(win(sf)); }
  }
  if (DEMO_PLAY >= 16) out.push(game(16, 'craft_bowl', champs[0], champs[1], false));
  return out;
}
