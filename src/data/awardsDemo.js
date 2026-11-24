// Dev only (the demo league has no saved games): plays a quick 12-week season with the real engine so the Awards tab has
// a season to rank. Same shape as awards.seasonInputs.
import { loadLineups } from './gameLineups.js';
import { getTeams } from './teams.js';
import { playGame } from '../lib/simGame.js';

export async function demoInputs(salt = 0) {   // salt: a different season each time
  const ids = getTeams().map((t) => t.id), L = Object.fromEntries((await loadLineups(ids)).map((l, k) => [ids[k], l]));
  const players = {}, teams = {}, games = [];
  ids.forEach((t) => { teams[t] = { w: 0, l: 0, pf: 0, pa: 0, rank: 8, moves: { trades: t.length % 3, signings: t.charCodeAt(1) % 4, resigns: 1, draft: 3 }, picks: 5, youth: 0.4, helped: 0.2, activity: { days: t.charCodeAt(2) % 40, minutes: 600 } };
    L[t].all.forEach((p) => { players[p.id] = { name: p.name, pos: p.pos, team: t, rookie: (p.age ?? 25) <= 21, games: 0, s: {} }; }); });
  for (let w = 0; w < 12; w++) {
    const order = [...ids].sort((a, b) => ((a.charCodeAt(0) * 31 + w * 17) % 97) - ((b.charCodeAt(0) * 31 + w * 17) % 97));
    for (let k = 0; k < order.length - 1; k += 2) {
      const [h, a] = [order[k], order[k + 1]], g = playGame(L[h], L[a], 1000 + w * 16 + k + salt * 7919, {}), hs = g.score.home, as = g.score.away;
      teams[h].pf += hs; teams[h].pa += as; teams[a].pf += as; teams[a].pa += hs; if (hs > as) { teams[h].w++; teams[a].l++; } else { teams[a].w++; teams[h].l++; }
      for (const [id, s] of Object.entries(g.players || {})) { const p = players[id]; if (!p) continue; p.games++; for (const [key, v] of Object.entries(s)) p.s[key] = /long/.test(key) ? Math.max(p.s[key] || 0, v) : (p.s[key] || 0) + v; }
      games.push({ id: `${w + 1}${k}`, week: w + 1, home: h, away: a, hs, as, ot: g.overtimes, scoring: g.scoring });
    }
  }
  return { players, teams, games, seasonDays: 84 };
}
