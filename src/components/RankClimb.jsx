// One ranking move in the final report: a league (or conference) table where the team's row slides from where it stood
// before the game to where it stands now, passing the teams it jumped, then a banner says what happened ("▲ 3 · now #4").
// Styled by the network around it. m: from rankMoves. sfx: the report's sounds (a whoosh as it moves, a ping as it lands).
import React, { useEffect, useMemo, useState } from 'react';
import ConfLogo from './ConfLogo.jsx';
import { getTeam } from '../data/teams.js';

const SHOW = 8;

export default function RankClimb({ m, sfx }) {
  const [moved, setMoved] = useState(false), [landed, setLanded] = useState(false), team = getTeam(m.team);
  const start = Math.max(0, Math.min(m.rows.length - SHOW, m.to - 5));   // the window of rows around where he lands
  const rows = useMemo(() => m.rows.slice(start, start + SHOW).map((r, k) => ({ ...r, end: k, begin: (m.was.indexOf(r.id) >= 0 ? m.was.indexOf(r.id) : m.rows.length) - start })), [m, start]);
  useEffect(() => {
    const a = setTimeout(() => { setMoved(true); if (m.from !== m.to) sfx?.play('whoosh', { gain: 0.55 }); }, 1000);
    const b = setTimeout(() => { setLanded(true); sfx?.play('ping', { gain: 0.8 }); }, 2500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const where = m.conf ? `in the ${m.conf}` : 'in the league', climb = m.from ? m.from - m.to : 0;
  const banner = !m.from ? `Debuts at #${m.to} ${where}` : m.to === 1 && m.from !== 1 ? `New #1 ${where}` : climb > 0 ? `▲ ${climb} · now #${m.to} ${where}` : climb < 0 ? `▼ ${-climb} · now #${m.to} ${where}` : `Holds at #${m.to} ${where}`;
  return (
    <div className="rk" style={{ '--tc': team?.color || '#888' }}>
      <div className="rk-head">
        <small className="rk-kicker">{m.conf ? <ConfLogo conf={m.conf} size={28} /> : '📈'} {m.title}</small>
        <h3 className="hf"><img src={team?.logo} alt="" />{team?.name} {m.cat === 'conf' ? '' : m.unit}</h3>
      </div>
      <div className="rk-board" style={{ '--n': rows.length }}>
        {rows.map((r, k) => <span key={`n${k}`} className="rk-num" style={{ '--y': k }}>{start + k + 1}</span>)}
        {rows.map((r) => {
          const t = getTeam(r.id), me = r.id === m.team, y = moved ? r.end : Math.min(SHOW + 0.5, Math.max(-1.5, r.begin));
          return (
            <div key={r.id} className={`rk-row${me ? ' me' : ''}${me && landed ? ' landed' : ''}`} style={{ '--y': y, '--rc': t?.color, transitionDelay: me ? '0s' : `${0.05 * Math.abs(r.end - r.begin)}s` }}>
              <img src={t?.logo} alt="" /><b>{t?.name}</b><span>{r.played ? r.value : '-'}</span>
            </div>
          );
        })}
      </div>
      <div className={`rk-banner hf${landed ? ' on' : ''}`}>{banner}</div>
    </div>
  );
}
