import React, { useState } from 'react';

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-'), avg = (a, b) => (b ? (a / b).toFixed(1) : '-');
// Each table: [title, which players show, columns as [label, value(stats), sort number(stats)]].
const TABLES = [
  ['Passing', (s) => s.att, [['C/ATT', (s) => `${s.cmp || 0}/${s.att}`, (s) => s.cmp || 0], ['Comp %', (s) => pct(s.cmp || 0, s.att), (s) => (s.cmp || 0) / s.att], ['YDS', (s) => s.pyds || 0], ['Y/A', (s) => avg(s.pyds || 0, s.att), (s) => (s.pyds || 0) / s.att], ['TD', (s) => s.ptd || 0], ['INT', (s) => s.int || 0], ['SACK', (s) => s.sk || 0], ['LNG', (s) => s.plong || 0]]],
  ['Rushing', (s) => s.car, [['CAR', (s) => s.car], ['YDS', (s) => s.ryds || 0], ['AVG', (s) => avg(s.ryds || 0, s.car), (s) => (s.ryds || 0) / s.car], ['TD', (s) => s.rtd || 0], ['LNG', (s) => s.rlong || 0], ['BRK TKL', (s) => s.brk || 0], ['FUM', (s) => s.fum || 0]]],
  ['Receiving', (s) => s.tgt, [['REC', (s) => s.rec || 0], ['TGT', (s) => s.tgt], ['YDS', (s) => s.recyds || 0], ['AVG', (s) => avg(s.recyds || 0, s.rec), (s) => (s.recyds || 0) / (s.rec || 1)], ['TD', (s) => s.rectd || 0], ['YAC', (s) => s.yac || 0], ['LNG', (s) => s.reclong || 0], ['DROP', (s) => s.drops || 0]]],
  ['Defense', (s) => s.tkl || s.sacks || s.dint || s.pd || s.pres, [['TKL', (s) => s.tkl || 0], ['TFL', (s) => s.tfl || 0], ['SACK', (s) => s.sacks || 0], ['PRES', (s) => s.pres || 0], ['INT', (s) => s.dint || 0], ['PD', (s) => s.pd || 0], ['FF', (s) => s.ff || 0], ['FR', (s) => s.fr || 0], ['MISS', (s) => s.miss || 0]]],
  ['Kicking and returns', (s) => s.fga || s.xpa || s.punts || s.kr || s.pr, [['FG', (s) => `${s.fgm || 0}/${s.fga || 0}`, (s) => s.fgm || 0], ['LNG', (s) => s.fglong || 0], ['XP', (s) => `${s.xpm || 0}/${s.xpa || 0}`, (s) => s.xpm || 0], ['PUNT', (s) => s.punts || 0], ['P AVG', (s) => avg(s.puntyds || 0, s.punts), (s) => (s.puntyds || 0) / (s.punts || 1)], ['KR YDS', (s) => s.kryds || 0], ['PR YDS', (s) => s.pryds || 0]]],
];

function Table({ title, rows, cols }) {
  const [sort, setSort] = useState(null);
  const num = (c, s) => Number((c[2] || c[1])(s)) || 0, list = sort == null ? rows : rows.slice().sort((a, b) => num(cols[sort], b.s) - num(cols[sort], a.s));
  if (!rows.length) return null;
  return (
    <table className="bx-table">
      <thead><tr><th>{title}</th>{cols.map((c, i) => <th key={c[0]} className={sort === i ? 'on' : ''} onClick={() => setSort(i)} title="Tap to sort">{c[0]}</th>)}</tr></thead>
      <tbody>{list.map(({ p, s }) => <tr key={p.id}><td>{p.pos} {p.name}</td>{cols.map((c) => <td key={c[0]}>{c[1](s)}</td>)}</tr>)}</tbody>
    </table>
  );
}

// A game's box score: both teams' passing, rushing, receiving, defense and kicking. Tap any column to sort by it.
// game: a result from the engine. names: { playerId: { id, name, pos, side } }. teams: { home, away } team records.
export default function BoxScore({ game, names, teams }) {
  const [side, setSide] = useState('away');
  const rows = Object.entries(game.players).map(([id, s]) => ({ p: names[id], s })).filter((r) => r.p && r.p.side === side), T = game.teams;
  const line = (label, f) => <tr key={label}><td>{f(T.away)}</td><th>{label}</th><td>{f(T.home)}</td></tr>;
  return (
    <div className="bx">
      <table className="bx-team"><tbody>
        {line('Total yards', (t) => t.yds)}{line('Passing', (t) => t.pyds)}{line('Rushing', (t) => t.ryds)}{line('First downs', (t) => t.fd)}
        {line('3rd down', (t) => t.third.join('/'))}{line('4th down', (t) => t.fourth.join('/'))}{line('Turnovers', (t) => t.tov)}{line('Sacks allowed', (t) => t.sacked)}
        {line('20+ yard plays', (t) => t.big)}{line('Time of possession', (t) => `${Math.floor(t.top / 60)}:${String(t.top % 60).padStart(2, '0')}`)}
      </tbody></table>
      <div className="bx-tabs">{['away', 'home'].map((k) => <button key={k} className={`btn small${side === k ? '' : ' ghost'}`} onClick={() => setSide(k)}>{teams[k].name}</button>)}</div>
      {TABLES.map(([title, show, cols]) => <Table key={title + side} title={title} rows={rows.filter((r) => show(r.s))} cols={cols} />)}
    </div>
  );
}
