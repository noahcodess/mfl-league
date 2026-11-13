// Team and position rankings from a season's finished games: best offenses (points and yards per game), best defenses (fewest
// points and yards allowed, sacks, takeaways), and the top players at each position. Used by the Live tab.

export function teamStats(weeks) {
  const s = {};
  const get = (id) => (s[id] ||= { id, gp: 0, pf: 0, pa: 0, yds: 0, ydsA: 0, sacks: 0, take: 0 });
  weeks.forEach(({ games }) => games.filter((g) => g.status === 'final').forEach((g) => {
    const yd = { [g.home]: 0, [g.away]: 0 }, sk = { [g.home]: 0, [g.away]: 0 }, tk = { [g.home]: 0, [g.away]: 0 };
    (g.lines || []).forEach((l) => { yd[l.team] += (l.passYds || 0) + (l.rushYds || 0); sk[l.team] += l.sacks || 0; tk[l.team] += l.defInt || 0; });
    [[g.home, g.away, g.homeScore, g.awayScore], [g.away, g.home, g.awayScore, g.homeScore]].forEach(([me, op, f, a]) => {
      const t = get(me); t.gp += 1; t.pf += f; t.pa += a; t.yds += yd[me]; t.ydsA += yd[op]; t.sacks += sk[me]; t.take += tk[me];
    });
  }));
  return Object.values(s).map((t) => ({ ...t, ppg: t.pf / t.gp, papg: t.pa / t.gp, ypg: t.yds / t.gp, yapg: t.ydsA / t.gp }));
}

export const topOffenses = (stats, n = 5) => [...stats].sort((a, b) => b.ppg - a.ppg || b.ypg - a.ypg).slice(0, n);
export const topDefenses = (stats, n = 5) => [...stats].sort((a, b) => a.papg - b.papg || a.yapg - b.yapg).slice(0, n);

const rec = (l) => `${l.rec || 0} rec · ${l.recYds || 0} yds · ${l.recTD || 0} TD`;
export const POSITION_BOARDS = [
  ['QB', 'Quarterbacks', ['QB'], 'passYds', (l) => `${l.passYds} yds · ${l.passTD || 0} TD · ${l.int || 0} INT`],
  ['RB', 'Running backs', ['RB'], 'rushYds', (l) => `${l.rushYds} yds · ${l.rushTD || 0} TD`],
  ['WR', 'Receivers', ['WR'], 'recYds', rec],
  ['TE', 'Tight ends', ['TE'], 'recYds', rec],
  ['DL', 'Pass rushers', ['DE', 'DL', 'DT', 'LB'], 'sacks', (l) => `${l.sacks} sack${l.sacks === 1 ? '' : 's'}`],
  ['CB', 'Cornerbacks', ['CB'], 'defInt', (l) => `${l.defInt} INT`],
  ['S', 'Safeties', ['SS', 'FS'], 'defInt', (l) => `${l.defInt} INT`],
];

// totals: from seasonTotals. playerOf(teamId, id) → the player (for his position and name).
export function positionLeaders(totals, board, playerOf, n = 5) {
  const [, , positions, key] = board;
  return Object.values(totals)
    .map((t) => ({ ...t, player: playerOf(t.team, t.id) }))
    .filter((t) => t.player && positions.includes(t.player.position) && t[key] > 0)
    .sort((a, b) => b[key] - a[key] || (b.gp - a.gp))
    .slice(0, n);
}
