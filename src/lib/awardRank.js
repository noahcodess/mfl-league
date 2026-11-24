// The season awards and how each is ranked (a top 5; the top 3 are the finalists people see). The player awards come from
// awardMath (impact points against a normal starter at each position), Game of the Year from gameOfYear, Coach of the
// Year from coachOfYear. The commissioner can reorder and add to every list; these are the numbers' picks.
import { seasonValues, statLine } from './awardMath.js';
import { gameScore } from './gameOfYear.js';
import { coachScore } from './coachOfYear.js';
import { comebackCase, comebackScore } from './comeback.js';

export const AWARDS = [
  { key: 'mvp', name: 'Most Valuable Player', icon: '🏆', kind: 'player',
    how: 'The player worth the most to his team: what his plays added on offense or defense next to a normal starter at his position, with defense counting a bit less, and more for a player whose team won. Quarterbacks win it most, but anyone can.' },
  { key: 'opoy', name: 'Offensive Player of the Year', icon: '🏈', kind: 'player',
    how: 'The best offensive player: yards, touchdowns, catches and efficiency, minus turnovers and sacks, measured against a normal starter at his position. Usually a quarterback or a receiver, sometimes a running back, rarely a tight end.' },
  { key: 'dpoy', name: 'Defensive Player of the Year', icon: '🛡️', kind: 'player',
    how: 'The best defensive player: sacks, pressures, tackles for loss, interceptions, pass breakups, forced fumbles and defensive touchdowns, minus missed tackles and catches given up, measured against a normal starter at his position. Interceptions and pass breakups count big, so safeties and corners win it most, then linebackers; a lineman can win it with a huge year.' },
  { key: 'oroy', name: 'Offensive Rookie of the Year', icon: '🌱', kind: 'player',
    how: 'The best first-year player on offense, ranked the same way as Offensive Player of the Year (against a normal starter at his position), with a small boost for helping his team win.' },
  { key: 'droy', name: 'Defensive Rookie of the Year', icon: '🌿', kind: 'player',
    how: 'The best first-year player on defense, ranked the same way as Defensive Player of the Year (against a normal starter at his position), with a small boost for helping his team win.' },
  { key: 'cpoy', name: 'Comeback Player of the Year', icon: '🔥', kind: 'player',
    how: 'A great season after a real dip: last season he was hurt for a long stretch, or benched after starting before, or out of the league after starting before, or a good starter who had a bad year. Never a rookie or a first-year starter, and he has to be a real, productive starter now. Weighs how deep the dip was, how good he is now and how far he climbed. Needs last season on the site, so early seasons may have no candidates.' },
  { key: 'coy', name: 'Coach of the Year', icon: '🧢', kind: 'team',
    how: 'Winning, and beating what the team was expected to do from its preseason rank (34%); how active the coach is on the site (22%); the moves he made (trades, signings, re-signings, draft picks) and whether they helped (20%); the team\'s future: draft picks and young talent (14%); point differential (10%). A coach who made no moves at all can win, but it\'s rare.' },
  { key: 'goty', name: 'Game of the Year', icon: '🎬', kind: 'game',
    how: 'Close finishes count most, then the teams trading scores (lead changes, ties, answering each other), scores late in the game, comebacks, overtime and two good teams. Low-scoring games barely count (under about 20 points combined); from 25 points up they count fully, and a shootout gets a little extra.' },
];
export const byKey = Object.fromEntries(AWARDS.map((a) => [a.key, a]));

const MVP_POS = { QB: 1.1, RB: 1, WR: 0.95, TE: 0.85, OL: 0.6 };   // the MVP leans to the quarterback, like real football
// A player's season in the units comeback.js uses: about 0 for a normal starter, about 1 for his position's standouts.
export const impact = (v) => (v ? (v.off ?? v.def ?? -900) / 100 : -9);
const top = (rows, k = 5) => rows.filter((r) => r.score > -Infinity).sort((a, b) => b.score - a.score).slice(0, k).map((r) => ({ ...r, score: Math.round(r.score * 10) / 10 }));

// season: { players: { id: { name, pos, team, rookie, games, s } }, teams: { id: { w, l, pf, pa, rank, moves, helped, picks,
// youth, activity } }, games: [{ id, home, away, hs, as, ot, scoring, prime, rivalry }], seasonDays, season (its number),
// teamGames, history (comeback.js: each player's earlier seasons) }.
// Returns { mvp: [{ id, score, line }], ... } (top 5 each).
export function rankAwards(season) {
  const vals = seasonValues(season.players), P = season.players, T = season.teams || {};
  const win = (team) => { const t = T[team]; return t && t.w + t.l ? t.w / (t.w + t.l) : 0.5; };
  const player = (id, score) => ({ id, score, line: statLine(P[id].s, P[id].pos) });
  const ids = Object.keys(vals).filter((id) => (P[id].games || 0) >= 3);
  const offV = (id) => vals[id].off ?? -Infinity, defV = (id) => vals[id].def ?? -Infinity;
  const best = (id, dk) => Math.max(offV(id), defV(id) * dk);
  return {
    mvp: top(ids.map((id) => player(id, Math.max(offV(id) * (MVP_POS[vals[id].group] ?? 1), defV(id) * 0.38) * (0.7 + 0.6 * win(P[id].team))))),
    opoy: top(ids.filter((id) => vals[id].off != null).map((id) => player(id, offV(id)))),
    dpoy: top(ids.filter((id) => vals[id].def != null).map((id) => player(id, defV(id)))),
    oroy: top(ids.filter((id) => P[id].rookie && vals[id].off != null).map((id) => player(id, offV(id) * (0.9 + 0.2 * win(P[id].team))))),
    droy: top(ids.filter((id) => P[id].rookie && vals[id].def != null).map((id) => player(id, defV(id) * (0.9 + 0.2 * win(P[id].team))))),
    cpoy: top(ids.map((id) => {   // needs last season's history (season.history); none means no candidates
      const now = impact(vals[id]), c = comebackCase(season.season, season.history?.[id], now, P[id].games || 0, season.teamGames || 12);
      return c ? { ...player(id, comebackScore(c, now, win(P[id].team))), line: `${c.why} · ${statLine(P[id].s, P[id].pos)}`, story: c.kind } : { id, score: -Infinity };
    })),
    coy: top(Object.entries(T).map(([id, t]) => {
      const c = coachScore({ ...t, winPct: win(id), pd: t.w + t.l ? (t.pf - t.pa) / (t.w + t.l) : 0, seasonDays: season.seasonDays });
      return { id, score: c.score, line: `${t.w}-${t.l} · ${Math.round(c.count)} move${Math.round(c.count) === 1 ? '' : 's'}` };   // activity stays private: finalists are public
    })),
    goty: top((season.games || []).filter((g) => g.hs + g.as > 0).map((g) => {
      const r = gameScore({ ...g, q: [win(g.home), win(g.away)] });
      return { id: String(g.id), score: r.score, line: r.why };
    })),
  };
}
