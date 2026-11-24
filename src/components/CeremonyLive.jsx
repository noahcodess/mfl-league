// The Live tab after Week 12: the award ceremony is its own moment (no weeks, games or standings). The stage with its
// countdown on the screen, the commissioner's show button, and below it the nominees (each award's 3 finalists, by name
// so nobody can tell who won), which turn into the winners after the show.
import React, { useState } from 'react';
import CeremonyStage from './CeremonyStage.jsx';
import ShowStart from './ShowStart.jsx';
import { AWARDS } from '../lib/awardRank.js';
import { SHOW_ORDER, useCeremony } from '../data/ceremony.js';
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

export default function CeremonyLive({ season, canControl }) {
  const [v, setV] = useState(0), state = useCeremony(season, v), reload = async () => setV((n) => n + 1);
  const lists = state?.revealed ? state.winners : state?.finalists;
  return (
    <div className="cer-live">
      <p className="cer-title">MFL Award Ceremony<b>Season {season}</b></p>
      <CeremonyStage season={season} state={state} />
      {state?.started && !state.finished && <p className="cer-live-note">🔴 The ceremony is happening now. Join the Discord call!</p>}
      {canControl && state?.locked && <ShowStart season={season} state={state} reload={reload} />}
      <section className="cer-noms">
        <h2>{state?.revealed ? '🏆 The winners' : '🎭 The nominees'}</h2>
        {!lists ? <p className="dim">{state?.finished ? 'The winners are revealed here in a moment...' : 'The finalists are announced soon.'}</p> : (
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
