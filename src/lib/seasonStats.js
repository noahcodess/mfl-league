// Numbers worked out from a season's games: team records, conference standings, each week's top players, and season leaders.
// Works the same for the sample season and the real one.

export function records(weeks) {
  const rec = {};
  const get = (id) => (rec[id] ||= { w: 0, l: 0, pf: 0, pa: 0, last: [] });
  weeks.forEach(({ games }) => games.forEach((g) => {
    get(g.home); get(g.away);
    if (g.status !== 'final') return;
    const hw = g.homeScore > g.awayScore;
    [[g.home, g.homeScore, g.awayScore, hw], [g.away, g.awayScore, g.homeScore, !hw]].forEach(([id, f, a, won]) => {
      const r = get(id); r[won ? 'w' : 'l'] += 1; r.pf += f; r.pa += a; r.last.push(won ? 'W' : 'L');
    });
  }));
  Object.values(rec).forEach((r) => {
    const last = r.last[r.last.length - 1]; let n = 0;
    for (let i = r.last.length - 1; i >= 0 && r.last[i] === last; i--) n++;
    r.streak = last ? `${last}${n}` : '-';
  });
  return rec;
}

export const recordText = (r) => (r ? `${r.w}-${r.l}` : '0-0');

// { Overworld: [{ id, ...record }], Nether: [...] }, best first (wins, then point difference).
export function standings(teams, rec) {
  const out = {};
  teams.forEach((t) => { (out[t.conference || 'League'] ||= []).push({ id: t.id, ...(rec[t.id] || { w: 0, l: 0, pf: 0, pa: 0, streak: '-' }) }); });
  Object.values(out).forEach((list) => list.sort((a, b) => b.w - a.w || a.l - b.l || (b.pf - b.pa) - (a.pf - a.pa)));
  return out;
}

const STAR_KINDS = [
  ['pass', 'Passing', (l) => l.passYds || 0, (l) => `${l.comp}/${l.att}, ${l.passYds} yds, ${l.passTD} TD${l.int ? `, ${l.int} INT` : ''}`],
  ['rush', 'Rushing', (l) => l.rushYds || 0, (l) => `${l.rushYds} yds, ${l.rushTD} TD`],
  ['rec', 'Receiving', (l) => l.recYds || 0, (l) => `${l.rec} rec, ${l.recYds} yds, ${l.recTD} TD`],
  ['def', 'Defense', (l) => (l.sacks || 0) * 2 + (l.defInt || 0) * 3, (l) => [l.sacks && `${l.sacks} sack${l.sacks > 1 ? 's' : ''}`, l.defInt && `${l.defInt} INT`].filter(Boolean).join(', ')],
];

// The best line of the week in each category, from finished games only.
export function weekStars(week) {
  const lines = week.games.filter((g) => g.status === 'final').flatMap((g) => g.lines || []);
  return STAR_KINDS.map(([key, label, val, text]) => {
    const best = lines.reduce((a, l) => (val(l) > (a ? val(a) : 0) ? l : a), null);
    return best && { key, label, id: best.id, team: best.team, text: text(best) };
  }).filter(Boolean);
}

// Season totals for every player: { id: { team, gp, passYds, passTD, int, rushYds, rushTD, rec, recYds, recTD, sacks, defInt } }.
export function seasonTotals(weeks) {
  const tot = {};
  weeks.forEach(({ games }) => games.filter((g) => g.status === 'final').forEach((g) => (g.lines || []).forEach((l) => {
    const t = (tot[l.id] ||= { id: l.id, team: l.team, gp: 0 });
    t.gp += 1;
    Object.entries(l).forEach(([k, v]) => { if (typeof v === 'number') t[k] = (t[k] || 0) + v; });
  })));
  return tot;
}

export const LEADER_KINDS = [['passYds', 'Passing yards'], ['passTD', 'Passing TDs'], ['rushYds', 'Rushing yards'], ['rushTD', 'Rushing TDs'],
  ['recYds', 'Receiving yards'], ['rec', 'Receptions'], ['sacks', 'Sacks'], ['defInt', 'Interceptions']];

export function leaders(totals, key, n = 5) {
  return Object.values(totals).filter((t) => t[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, n);
}
