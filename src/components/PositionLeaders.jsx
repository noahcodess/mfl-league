import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { getPlayers } from '../data/players.js';
import { POSITION_BOARDS, positionLeaders } from '../lib/teamRanks.js';

const playerOf = (team, id) => getPlayers(team).find((p) => p.id === id);

// Live: the season's top five at each position (QBs by passing yards, RBs by rushing, receivers, pass rushers by sacks, DBs by INTs).
export default function PositionLeaders({ totals, through }) {
  const [pos, setPos] = useState('QB');
  const board = POSITION_BOARDS.find((b) => b[0] === pos), list = positionLeaders(totals, board, playerOf);
  return (
    <article className="lv-card">
      <header><span>🏅</span><div><b>Top {board[1].toLowerCase()}</b><small>Through Week {through}</small></div></header>
      <div className="lv-tabs">{POSITION_BOARDS.map(([k]) => <button key={k} className={k === pos ? 'on' : ''} onClick={() => setPos(k)}>{k}</button>)}</div>
      {!list.length ? <p className="dim">Nobody yet.</p> : (
        <ol className="lv-rank">
          {list.map((t, i) => (
            <li key={t.id}>
              <span className="lv-n">{i + 1}</span><TeamBadge team={getTeam(t.team)} size="sm" />
              <div><b>{t.player.name}</b><small>{t.player.position} · {getTeam(t.team)?.code} · {t.gp} games</small></div>
              <span className="lv-line">{board[4](t)}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
