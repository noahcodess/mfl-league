// The halftime report's numbers: first-half team totals, the player of the half, and up to three storylines worth a card
// (a receiver cooking his corner, a quarterback who can't miss, a back ripping off big runs, a pass rusher living in the
// backfield, a defense that's given up nothing, a ballhawk). Everything comes from the plays already shown.
import { tally } from './simStats.js';
import { playerOfGame } from './playerOfGame.js';

const r = (s, k) => s?.[k] || 0;

// plays: every play before halftime. sideOf: { playerId: 'home' | 'away' }. score: the score at the half.
export function halfStory(plays, sideOf, score) {
  const { players, teams } = tally(plays);
  const leader = score.home === score.away ? null : score.home > score.away ? 'home' : 'away';
  const rows = Object.entries(players).filter(([id]) => sideOf[id]).map(([id, s]) => ({ player_id: id, team_id: sideOf[id], stats: s }));
  const potg = playerOfGame(rows, leader);
  const stories = [];
  // receiver vs his defender: catches made with that defender on him
  const duel = {};
  plays.forEach((p) => p.events.forEach((e) => {
    if (e.type !== 'catch' || !e.target || !e.def) return;
    const d = (duel[`${e.target}|${e.def}`] ||= { off: e.target, def: e.def, tgt: 0, rec: 0, yds: 0, td: 0 });
    d.tgt += 1; if (e.result === 'catch') { d.rec += 1; d.yds += p.result.played ?? p.result.gain ?? 0; if (p.result.td) d.td += 1; }
  }));
  const best = Object.values(duel).filter((d) => d.rec >= 2 && d.yds >= 35).sort((a, b) => b.yds - a.yds)[0];
  if (best) stories.push({ kind: 'duel', side: sideOf[best.off], ...best, score: best.yds + best.td * 25 });
  rows.forEach(({ player_id: id, team_id: side, stats: s }) => {
    if (r(s, 'att') >= 6 && r(s, 'cmp') / r(s, 'att') >= 0.72 && r(s, 'pyds') >= 100) stories.push({ kind: 'qb', id, side, cmp: r(s, 'cmp'), att: r(s, 'att'), yds: r(s, 'pyds'), td: r(s, 'ptd'), score: r(s, 'pyds') * 0.5 + r(s, 'ptd') * 20 });
    if (r(s, 'car') >= 4 && r(s, 'ryds') / r(s, 'car') >= 6) stories.push({ kind: 'rb', id, side, car: r(s, 'car'), yds: r(s, 'ryds'), ypc: r(s, 'ryds') / r(s, 'car'), td: r(s, 'rtd'), score: r(s, 'ryds') + r(s, 'rtd') * 20 });
    if (r(s, 'sacks') >= 2) stories.push({ kind: 'rush', id, side, sacks: r(s, 'sacks'), pres: r(s, 'pres'), score: r(s, 'sacks') * 30 });
    if (r(s, 'dint') >= 1) stories.push({ kind: 'pick', id, side, n: r(s, 'dint'), score: r(s, 'dint') * 35 });
  });
  ['home', 'away'].forEach((side) => { const opp = side === 'home' ? 'away' : 'home'; if (teams[opp].plays >= 12 && teams[opp].yds < 75) stories.push({ kind: 'wall', side, yds: teams[opp].yds, plays: teams[opp].plays, score: 120 - teams[opp].yds }); });
  const seen = new Set();
  const top = stories.sort((a, b) => b.score - a.score).filter((x) => { const k = x.id || x.off || x.kind + x.side; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
  return { teams, players, potg, stories: top, leader };
}

// The team stat lines each network shows (every network picks its own set, so no two halftime reports read the same).
const LINES = {
  yds: ['Total yards', (t) => t.yds], pyds: ['Passing', (t) => t.pyds], ryds: ['Rushing', (t) => t.ryds], fd: ['First downs', (t) => t.fd],
  third: ['3rd down', (t) => `${t.third[0]}/${t.third[1]}`, (t) => (t.third[1] ? t.third[0] / t.third[1] : 0)], tov: ['Turnovers', (t) => t.tov],
  top: ['Possession', (t) => `${Math.floor(t.top / 60)}:${String(t.top % 60).padStart(2, '0')}`, (t) => t.top], big: ['Explosive plays', (t) => t.big],
  ypp: ['Yards per play', (t) => (t.plays ? (t.yds / t.plays).toFixed(1) : '0.0'), (t) => (t.plays ? t.yds / t.plays : 0)], sacked: ['Sacks allowed', (t) => t.sacked],
};
const BY_NET = { fox: ['yds', 'pyds', 'ryds', 'tov', 'third'], cbs: ['fd', 'top', 'third', 'ypp', 'tov'], nbc: ['yds', 'big', 'ypp', 'tov', 'top'],
  espn: ['ypp', 'big', 'sacked', 'tov', 'third'], tnf: ['yds', 'fd', 'big', 'tov', 'top'], snf: ['yds', 'pyds', 'ryds', 'big', 'top'], stnf: ['ypp', 'fd', 'sacked', 'third', 'tov'], mnf: ['yds', 'big', 'third', 'tov', 'ypp'] };
// [label, away text, home text, away share 0-1] for the bars.
export function teamLines(teams, key) {
  return (BY_NET[key] || BY_NET.fox).map((k) => {
    const [label, show, num = show] = LINES[k], a = Number(num(teams.away)) || 0, h = Number(num(teams.home)) || 0;
    return [label, show(teams.away), show(teams.home), a + h ? a / (a + h) : 0.5];
  });
}

// Each team's passing, rushing and receiving leader so far: [{ side, rows: [[label, playerId, line]] }].
export function halfLeaders(players, sideOf) {
  const top = (side, key) => Object.entries(players).filter(([id, s]) => sideOf[id] === side && r(s, key) > 0).sort((a, b) => r(b[1], key) - r(a[1], key))[0];
  return ['away', 'home'].map((side) => {
    const rows = [];
    const p = top(side, 'pyds'), ru = top(side, 'ryds'), re = top(side, 'recyds');
    if (p) rows.push(['Passing', p[0], `${r(p[1], 'cmp')}/${r(p[1], 'att')} · ${r(p[1], 'pyds')} yds · ${r(p[1], 'ptd')} TD`]);
    if (ru) rows.push(['Rushing', ru[0], `${r(ru[1], 'car')} car · ${r(ru[1], 'ryds')} yds${r(ru[1], 'rtd') ? ` · ${r(ru[1], 'rtd')} TD` : ''}`]);
    if (re) rows.push(['Receiving', re[0], `${r(re[1], 'rec')} rec · ${r(re[1], 'recyds')} yds${r(re[1], 'rectd') ? ` · ${r(re[1], 'rectd')} TD` : ''}`]);
    return { side, rows };
  });
}
