// The final report's ranking moves: where each team stood in scoring offense, scoring defense and its conference
// standings before this game (every game played so far) and after it, and which moves are worth a graphic (a climb, a
// new #1, a debut near the top). Teams that haven't played yet sit at the bottom, unranked.
const CATS = [
  { key: 'off', title: 'Scoring offense', unit: 'offense', better: (a, b) => b.ppg - a.ppg || (b.pf - b.pa) - (a.pf - a.pa), value: (t) => `${t.ppg.toFixed(1)} PPG` },
  { key: 'def', title: 'Scoring defense', unit: 'defense', better: (a, b) => a.papg - b.papg || (b.pf - b.pa) - (a.pf - a.pa), value: (t) => `${t.papg.toFixed(1)} allowed` },
  { key: 'conf', title: 'standings', unit: 'conference', better: (a, b) => (b.w / Math.max(1, b.gp)) - (a.w / Math.max(1, a.gp)) || (b.pf - b.pa) - (a.pf - a.pa), value: (t) => `${t.w}-${t.l}` },
];

function table(teams, games) {
  const s = Object.fromEntries(teams.map((t) => [t.id, { id: t.id, gp: 0, w: 0, l: 0, pf: 0, pa: 0 }]));
  games.forEach((g) => [[g.home, g.homeScore, g.awayScore], [g.away, g.awayScore, g.homeScore]].forEach(([id, f, a]) => {
    const t = s[id]; if (!t) return; t.gp += 1; t.pf += f; t.pa += a; if (f > a) t.w += 1; else if (f < a) t.l += 1;
  }));
  return Object.values(s).map((t) => ({ ...t, ppg: t.gp ? t.pf / t.gp : 0, papg: t.gp ? t.pa / t.gp : 0 }));
}
const order = (rows, cat) => [...rows].sort((a, b) => (!a.gp - !b.gp) || cat.better(a, b));   // unplayed teams last

// weeks: the season's weeks. game: this game ({ id, home, away }). score: { home, away }. teams: every team. playoff: a
// playoff game never moves the standings, so only the offense and defense ranks can change.
// Returns up to 3 graphics: { cat, title, conf, team, from, to, rows (after, in order), was (ids in the old order) }.
export function rankMoves(weeks, game, score, teams, playoff = false) {
  const played = weeks.flatMap((w) => w.games).filter((g) => g.status === 'final' && g.id !== game.id);
  const now = [...played, { home: game.home, away: game.away, homeScore: score.home, awayScore: score.away }];
  const b4 = table(teams, played), af = table(teams, now), confOf = Object.fromEntries(teams.map((t) => [t.id, t.conference]));
  const win = score.home >= score.away ? game.home : game.away, out = [];
  for (const id of [game.home, game.away]) for (const cat of CATS.filter((c) => !playoff || c.key !== 'conf')) {
    const pool = (rows) => (cat.key === 'conf' ? rows.filter((r) => confOf[r.id] === confOf[id]) : rows);
    const was = order(pool(b4), cat), is = order(pool(af), cat);
    const from = b4.find((r) => r.id === id).gp ? was.findIndex((r) => r.id === id) + 1 : null, to = is.findIndex((r) => r.id === id) + 1;
    const climb = from ? from - to : 0;
    const score = (climb > 0 ? climb * 2 + (to <= 5 ? 3 : 0) : 0) + (to === 1 && from !== 1 ? 5 : 0) + (!from && to <= 3 ? 3 : 0) + (id === win ? 0.5 : 0);
    out.push({ cat: cat.key, unit: cat.unit, title: cat.key === 'conf' ? `${confOf[id]} ${cat.title}` : cat.title, conf: cat.key === 'conf' ? confOf[id] : null, team: id, from, to, score,
      rows: is.map((r) => ({ id: r.id, value: cat.value(r), played: r.gp > 0 })), was: was.map((r) => r.id) });
  }
  const best = out.filter((m) => m.score > 1).sort((a, b) => b.score - a.score), pick = [];
  for (const m of best) if (pick.length < 3 && pick.filter((p) => p.team === m.team).length < 2) pick.push(m);
  return pick.length ? pick : [out.find((m) => m.team === win && m.cat === 'conf')].filter(Boolean);   // nothing moved much: the winner's conference standings
}
