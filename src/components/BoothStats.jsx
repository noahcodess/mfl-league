import React, { useMemo, useState } from 'react';
import { getTeam } from '../data/teams.js';
import { cardKindFor } from '../lib/boothLink.js';
import { cardLines } from '../lib/broadcastGfx.js';

// Broadcast Booth: search any player in the game and see how he's doing; put his stat card up on the broadcast (in his
// team's box on the scorebug, about 7 seconds). Below, the stat sheet so far: each team's passing, rushing, receiving and
// defensive leaders.
const top = (rows, key) => rows.filter((r) => (r.s[key] || 0) > 0).sort((a, b) => (b.s[key] || 0) - (a.s[key] || 0));

export default function BoothStats({ roster, stats, ids, send }) {
  const [q, setQ] = useState(''), [pick, setPick] = useState(null);
  const rows = useMemo(() => roster.map((p) => ({ ...p, s: stats[p.id] || {} })), [roster, stats]);
  const found = q.trim().length < 2 ? [] : rows.filter((p) => `${p.name} ${p.pos} ${p.number}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  const me = pick && rows.find((r) => r.id === pick);
  return (
    <section className="booth-card">
      <h3>🔎 Players & stat sheet</h3>
      <input className="booth-search" placeholder="Search a player (name, position, number)" value={q} onChange={(e) => setQ(e.target.value)} />
      {found.length > 0 && <div className="booth-found">{found.map((p) => <button key={p.id} className={pick === p.id ? 'on' : ''} onClick={() => setPick(p.id)}><img src={getTeam(ids[p.side])?.logo} alt="" />#{p.number ?? '-'} {p.name} <small>{p.pos}</small></button>)}</div>}
      {me && (
        <div className="booth-player" style={{ '--tc': getTeam(ids[me.side])?.color }}>
          <b>{me.name}</b><small>{me.pos} · {getTeam(ids[me.side])?.name}</small>
          <p>{cardLines(cardKindFor(me.pos, me.s), me.s).join(' · ')}</p>
          <button className="btn small" onClick={() => send('card', me.id, { secs: 7 })}>📺 Put his stat card up</button>
        </div>
      )}
      <div className="booth-sheet">
        {['away', 'home'].map((side) => {
          const mine = rows.filter((r) => r.side === side), qb = top(mine, 'att')[0], rb = top(mine, 'ryds')[0], wr = top(mine, 'recyds')[0], df = top(mine, 'tkl')[0];
          return (
            <div key={side}><h4><img src={getTeam(ids[side])?.logo} alt="" />{getTeam(ids[side])?.code}</h4>
              {qb && <p><small>PASS</small>{qb.name} {qb.s.cmp || 0}/{qb.s.att} · {qb.s.pyds || 0} yds · {qb.s.ptd || 0} TD · {qb.s.int || 0} INT</p>}
              {rb && <p><small>RUSH</small>{rb.name} {rb.s.car || 0} car · {rb.s.ryds} yds{rb.s.rtd ? ` · ${rb.s.rtd} TD` : ''}</p>}
              {wr && <p><small>REC</small>{wr.name} {wr.s.rec || 0} · {wr.s.recyds} yds{wr.s.rectd ? ` · ${wr.s.rectd} TD` : ''}</p>}
              {df && <p><small>DEF</small>{df.name} {df.s.tkl} tkl{df.s.sacks ? ` · ${df.s.sacks} sk` : ''}{df.s.dint ? ` · ${df.s.dint} INT` : ''}</p>}
              {!qb && !rb && !wr && !df && <p className="dim">No stats yet.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
