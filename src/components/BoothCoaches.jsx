import React from 'react';
import { getTeam } from '../data/teams.js';
import { isTestMode } from '../data/teams.js';

// Broadcast Booth: both coaches (online, last seen, or Bot), timeouts left, and a button to call a timeout for either
// team (it takes effect before the next snap, and the rest of the game plays out from it).
const ago = (t) => { if (!t) return 'never'; const m = Math.round((Date.now() - Date.parse(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function BoothCoaches({ s, ids, coaches, presence, coached, send }) {
  const to = s?.play?.before?.to;
  return (
    <section className="booth-card">
      <h3>🧢 Coaches & timeouts</h3>
      {['away', 'home'].map((side) => {
        const t = getTeam(ids[side]), c = coaches?.[t.id], human = coached.includes(t.id) && !isTestMode(), p = presence[t.id], left = to?.[side] ?? 3;
        return (
          <div key={side} className="booth-coach" style={{ '--tc': t.color }}>
            <img src={t.logo} alt="" />
            <div><b>{t.name}</b><small>{c?.name ? `Coach ${c.name}` : 'Coach'} · {human ? (p?.online ? <em className="on">● Online</em> : <em>Last seen {ago(p?.lastSeen)}</em>) : <em className="bot">🤖 Bot</em>}</small></div>
            <span className="booth-tos">{[0, 1, 2].map((k) => <i key={k} className={k < left ? 'on' : ''} />)}</span>
            <button className="btn small" disabled={!s?.play || left <= 0} onClick={() => send('timeout', null, { input: { kind: 'timeout', side, by: 'commissioner' } })}>⏸ Timeout</button>
          </div>
        );
      })}
      <p className="dim booth-note">A timeout happens before the next snap and stops the clock; the game plays on from there.</p>
    </section>
  );
}
