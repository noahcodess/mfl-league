// One big ranking jump in the end-of-game show: the team's row starts at the bottom of a short ladder (its old spot) and
// glides to the top while the teams it passed each slip down one, all in one smooth move; its rank counts down as it
// climbs, then a banner says what happened ("▲ 6 · New #1 in the league"). Styled by the network around it.
// m: from rankMoves (only drastic ones get here). sfx: the report's sounds (the crowd cheers as it lands).
import React, { useEffect, useState } from 'react';
import ConfLogo from './ConfLogo.jsx';
import { getTeam } from '../data/teams.js';

const MAX = 5;   // passed teams shown under it at most

export default function RankClimb({ m, sfx }) {
  const [go, setGo] = useState(false), [landed, setLanded] = useState(false), [shown, setShown] = useState(m.from), team = getTeam(m.team);
  const k = Math.min(MAX, m.from - m.to), passed = m.rows.slice(m.to, m.to + k);   // after the game: ranks to+1 .. to+k
  useEffect(() => {
    const t = [setTimeout(() => setGo(true), 1100), setTimeout(() => { setLanded(true); sfx?.play('cheer', { gain: 0.5 }); }, 2350)];
    const steps = m.from - m.to, each = 1000 / Math.max(1, steps);
    for (let n = 1; n <= steps; n += 1) t.push(setTimeout(() => setShown(m.from - n), 1150 + n * each));   // the rank counts down as it climbs
    return () => t.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const where = m.conf ? `in the ${m.conf}` : 'in the league', climb = m.from - m.to;
  const value = (id) => m.rows.find((r) => r.id === id)?.value;
  const row = (id, y, rank, me) => {
    const t = getTeam(id);
    return (
      <div key={id} className={`rk-row${me ? ' me' : ''}${me && landed ? ' landed' : ''}`} style={{ '--y': y, '--rc': t?.color || '#888' }}>
        <span className="rk-rank hf">{rank}</span><img src={t?.logo} alt="" /><b>{t?.name}</b><span className="rk-val">{value(id)}</span>
      </div>
    );
  };
  return (
    <div className="rk" style={{ '--tc': team?.color || '#888' }}>
      <div className="rk-head">
        <small className="rk-kicker">{m.conf ? <ConfLogo conf={m.conf} size={28} /> : '📈'} {m.title}</small>
        <h3 className="hf"><img src={team?.logo} alt="" />{team?.name} {m.cat === 'conf' ? '' : m.unit}</h3>
      </div>
      <div className={`rk-board${go ? ' go' : ''}`} style={{ '--n': k + 1 }}>
        {passed.map((r, n) => row(r.id, go ? n + 1 : n, go ? m.to + n + 1 : m.to + n, false))}
        {row(m.team, go ? 0 : k, shown, true)}
      </div>
      <div className={`rk-banner hf${landed ? ' on' : ''}`}>▲ {climb} · {m.to === 1 ? `New #1 ${where}` : `Now #${m.to} ${where}`}</div>
    </div>
  );
}
