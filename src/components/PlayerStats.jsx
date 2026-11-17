import React from 'react';
import { usePlayerSeasonStats } from '../data/playerStats.js';
import { currentSeason } from '../data/teams.js';

// Player card → Morale & Stats: this season's numbers from every final game (passing, rushing, receiving, defense, kicking),
// only the groups he actually has, then a week-by-week log.
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-');
const per = (a, b) => (b ? (a / b).toFixed(1) : '-');
const GROUPS = [
  ['🎯 Passing', (s) => s.att, (s) => [['C/ATT', `${s.cmp || 0}/${s.att || 0}`], ['CMP%', pct(s.cmp, s.att)], ['YDS', s.pyds || 0], ['Y/A', per(s.pyds, s.att)], ['TD', s.ptd || 0], ['INT', s.int || 0], ['SCK', s.sk || 0]]],
  ['🏃 Rushing', (s) => s.car, (s) => [['CAR', s.car || 0], ['YDS', s.ryds || 0], ['YPC', per(s.ryds, s.car)], ['TD', s.rtd || 0], ['LONG', s.rlong || 0], ['FUM', s.fuml || 0]]],
  ['🙌 Receiving', (s) => s.rec || s.tgt, (s) => [['REC', s.rec || 0], ['TGT', s.tgt || 0], ['YDS', s.recyds || 0], ['Y/R', per(s.recyds, s.rec)], ['TD', s.rectd || 0], ['YAC', s.yac || 0], ['DROP', s.drops || 0]]],
  ['🛡️ Defense', (s) => s.tkl || s.sacks || s.dint || s.pd, (s) => [['TKL', s.tkl || 0], ['TFL', s.tfl || 0], ['SACK', s.sacks || 0], ['INT', s.dint || 0], ['PD', s.pd || 0], ['FF', s.ff || 0], ['TD', s.dtd || 0]]],
  ['🦶 Kicking', (s) => s.fga || s.xpa || s.punts, (s) => [['FG', `${s.fgm || 0}/${s.fga || 0}`], ['LONG', s.fglong || 0], ['XP', `${s.xpm || 0}/${s.xpa || 0}`], ['PUNTS', s.punts || 0], ['AVG', per(s.puntyds, s.punts)]]],
  ['↩️ Returns', (s) => s.kr || s.pr, (s) => [['KR', s.kr || 0], ['KR YDS', s.kryds || 0], ['PR', s.pr || 0], ['PR YDS', s.pryds || 0], ['TD', (s.krtd || 0) + (s.prtd || 0)]]],
];
const quick = (s) => GROUPS.filter(([, has]) => has(s)).map(([, , cols]) => cols(s).slice(0, 3).map(([k, v]) => `${v} ${k}`).join(', ')).join(' · ');

export default function PlayerStats({ player }) {
  const data = usePlayerSeasonStats(player.id, currentSeason());
  if (!data) return <p className="dim">Loading stats...</p>;
  if (!data.games.length) return <p className="dim pstats-none">📊 No games played yet this season.</p>;
  const s = data.total, groups = GROUPS.filter(([, has]) => has(s));
  return (
    <section className="pstats">
      <h4>📊 Season {currentSeason()} · {data.games.length} game{data.games.length > 1 ? 's' : ''}</h4>
      {groups.map(([label, , cols]) => (
        <div key={label} className="pstats-group"><b>{label}</b>
          <div className="pstats-row">{cols(s).map(([k, v]) => <span key={k}><small>{k}</small>{v}</span>)}</div>
        </div>
      ))}
      <details className="pstats-log"><summary>Game log</summary>
        <ul>{data.games.map((g) => <li key={g.game_id}><small>Wk {g.week}</small> {quick(g.stats) || 'No stats'}</li>)}</ul>
      </details>
    </section>
  );
}
