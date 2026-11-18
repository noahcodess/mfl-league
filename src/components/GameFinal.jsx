import React, { useMemo } from 'react';
import Headshot from './Headshot.jsx';
import BoxScore from './BoxScore.jsx';
import StarRating from './StarRating.jsx';
import { useGameBox } from '../data/gameBox.js';
import { getAllPlayers } from '../data/players.js';
import { POSITION_NAMES } from '../data/positions.js';
import { openPlayerCard } from '../lib/playerCard.js';
import { playerOfGame } from '../lib/playerOfGame.js';

// Below a final game: the Player of the Game (his card, the big thing he did, his line; tap for the full card), the score by
// quarter, the scoring plays, then the box score for both teams.
const qName = (q) => (q > 4 ? (q === 5 ? 'OT' : `${q - 4}OT`) : `Q${q}`);
const clock = (c) => `${Math.floor(c / 60)}:${String(Math.round(c) % 60).padStart(2, '0')}`;

export default function GameFinal({ game, home, away }) {
  const box = useGameBox(game.id, true);
  const people = useMemo(() => Object.fromEntries(getAllPlayers().map((p) => [p.id, p])), []);
  if (!box) return <p className="dim">Loading the box score…</p>;
  if (!box.result) return <p className="dim gf-none">📊 No stats were saved for this game.</p>;
  const R = box.result, teams = { home, away }, side = (tid) => (tid === home.id ? 'home' : 'away');
  const winner = R.home_score > R.away_score ? home.id : away.id, potg = playerOfGame(box.rows, winner), star = potg && people[potg.player_id];
  const quarters = Math.max(4, ...(R.scoring || []).map((x) => x.quarter));
  const byQ = (s, q) => (R.scoring || []).filter((x) => x.side === s && x.quarter === q).reduce((n, x) => n + x.pts, 0);
  const names = Object.fromEntries(box.rows.map((x) => [x.player_id, { id: x.player_id, name: people[x.player_id]?.name || 'Unknown', pos: people[x.player_id]?.position || '', side: side(x.team_id) }]));
  const result = { players: Object.fromEntries(box.rows.map((x) => [x.player_id, x.stats])), teams: R.teams };
  const team = star && (star.teamId === home.id ? home : star.teamId === away.id ? away : teams[side(potg.team_id)]);
  return (
    <div className="gf">
      {potg && star && (
        <section className="gf-potg" style={{ '--tc': team.color, '--ta': team.accent }}>
          <small className="gf-kicker">⭐ Player of the Game</small>
          <button type="button" className="gf-card" onClick={() => openPlayerCard(star)} title="Open his player card">
            <Headshot player={star} team={team} size={132} />
            <div className="gf-who">
              <span className="gf-pos">#{star.number ?? '-'} · {POSITION_NAMES[star.position] || star.position}</span>
              <b>{star.name}</b>
              <span className="gf-team"><img src={team.logo} alt="" /> {team.name}</span>
              <StarRating value={star.stars} elite={star.elite} />
            </div>
          </button>
          <div className="gf-feat">{potg.feat}</div>
          <p className="gf-line">{potg.line}</p>
          <small className="gf-scroll">Scroll for the full stat sheet ↓</small>
        </section>
      )}
      <section className="card gf-sheet">
        <h3>📊 Stat sheet</h3>
        <table className="gf-lines"><thead><tr><th />{Array.from({ length: quarters }, (_, k) => <th key={k}>{qName(k + 1)}</th>)}<th>T</th></tr></thead>
          <tbody>{['away', 'home'].map((s) => (
            <tr key={s}><td><img src={teams[s].logo} alt="" /> {teams[s].code}</td>{Array.from({ length: quarters }, (_, k) => <td key={k}>{byQ(s, k + 1)}</td>)}<td><b>{R[`${s}_score`]}</b></td></tr>
          ))}</tbody></table>
        {(R.scoring || []).length > 0 && (
          <ol className="gf-scoring">{R.scoring.map((x) => (
            <li key={`${x.n}-${x.how}`}><img src={teams[x.side].logo} alt="" /><span>{qName(x.quarter)} {x.quarter > 4 ? '' : clock(x.clock)}</span><b>+{x.pts}</b>{x.text || x.how}</li>
          ))}</ol>
        )}
        {R.teams && <BoxScore game={result} names={names} teams={teams} />}
      </section>
    </div>
  );
}
