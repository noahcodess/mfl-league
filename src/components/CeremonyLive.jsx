// The Live tab after Week 12: the award ceremony stage with its countdown, and below it the nominees (each award's 3
// finalists, by name so nobody can tell who won). After the show they turn into the winners.
import React from 'react';
import CeremonyStage from './CeremonyStage.jsx';
import { AWARDS } from '../lib/awardRank.js';
import { SHOW_ORDER } from '../data/ceremony.js';
import { getTeam } from '../data/teams.js';

const ORDER = SHOW_ORDER.map((k) => AWARDS.find((a) => a.key === k));

function Person({ r, won }) {
  const t = r.team && getTeam(r.team);
  return (
    <li className={won ? 'won' : ''}>
      {t ? <img src={t.logo} alt="" /> : <span className="cer-dot">🎬</span>}
      <span className="cer-who"><b>{won && '🏆 '}{r.name}</b><small>{[r.pos, r.line].filter(Boolean).join(' · ')}</small></span>
    </li>
  );
}

// season: number. state: from useCeremony.
export default function CeremonyLive({ season, state }) {
  const lists = state?.revealed ? state.winners : state?.finalists;
  return (
    <div className="cer-live">
      <CeremonyStage season={season} state={state} />
      <section className="cer-noms">
        <h2>{state?.revealed ? '🏆 The winners' : '🎭 The nominees'}</h2>
        {!lists ? <p className="dim">The finalists are announced soon. Check back here.</p> : (
          <div className="cer-grid">
            {ORDER.map((a) => (
              <article key={a.key} className="cer-card">
                <header><span>{a.icon}</span><b>{a.name}</b></header>
                <ol>{(lists[a.key] || []).map((r, n) => <Person key={r.id} r={r} won={state.revealed && n === 0} />)}</ol>
              </article>
            ))}
          </div>
        )}
        {lists && !state.revealed && <p className="dim cer-foot">Listed by name. The winners are revealed at the ceremony.</p>}
      </section>
    </div>
  );
}
