import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Headshot from './Headshot.jsx';
import TeamBadge from './TeamBadge.jsx';
import StarRating from './StarRating.jsx';
import { getTeam } from '../data/teams.js';
import { POSITION_NAMES } from '../data/positions.js';

const CAKE_MS = 4800;
const TITLE_MS = 2400;
const TRIBUTE_MS = 3200;

// The Birthday & Farewell show, full screen: the cake (everyone is a year older), tribute cards for the best retirees,
// then end credits rolling through every player who retired. Skippable; onClose when it's over.
export default function BirthdayShow({ retired, season, onClose }) {
  const stars = retired.slice(0, Math.min(5, retired.length));
  const [phase, setPhase] = useState('cake'); // cake → title → tribute → credits
  const [i, setI] = useState(0);
  const creditSecs = Math.max(16, retired.length * 0.55);

  useEffect(() => {
    let t;
    if (phase === 'cake') t = setTimeout(() => setPhase(retired.length ? 'title' : 'credits'), CAKE_MS);
    else if (phase === 'title') t = setTimeout(() => setPhase(stars.length ? 'tribute' : 'credits'), TITLE_MS);
    else if (phase === 'tribute') t = setTimeout(() => (i + 1 < stars.length ? setI(i + 1) : setPhase('credits')), TRIBUTE_MS);
    return () => clearTimeout(t);
  }, [phase, i]);

  const p = stars[i];
  const team = p ? getTeam(p.lastTeamId) : null;
  return createPortal(
    <div className={`bshow phase-${phase}`}>
      <button className="bshow-skip btn small ghost" onClick={() => (phase === 'credits' ? onClose() : setPhase('credits'))}>{phase === 'credits' ? 'Close ✕' : 'Skip ⏭'}</button>
      {phase === 'cake' && (
        <div className="bshow-cake">
          <div className="confetti" aria-hidden>{Array.from({ length: 28 }, (_, k) => <i key={k} style={{ '--k': k }} />)}</div>
          <div className="cake big" aria-hidden>
            <div className="candles">{[0, 1, 2, 3, 4, 5, 6].map((k) => <i key={k} style={{ '--i': k }} />)}</div>
            <div className="tier top" /><div className="tier mid" /><div className="tier base" /><div className="plate" />
          </div>
          <h1 className="bshow-pop">Happy Birthday, MFL!</h1>
          <p className="bshow-sub">Every player just turned a year older. Season {season} is on the way.</p>
        </div>
      )}
      {phase === 'title' && (
        <div className="bshow-title">
          <small>Birthday & Farewell</small>
          <h1>Farewell, legends</h1>
          <p>{retired.length} player{retired.length === 1 ? '' : 's'} hung up the cleats.</p>
        </div>
      )}
      {phase === 'tribute' && p && (
        <div className="bshow-tribute" key={p.id} style={{ '--team': team?.color || '#666' }}>
          <div className="bshow-portrait"><Headshot player={p} team={team} size={200} /></div>
          <div className="bshow-info">
            <small>Tribute {i + 1} of {stars.length}</small>
            <h1>{p.name}</h1>
            <div className="bshow-team">{team && <TeamBadge team={team} size="md" />}<span>{team?.name || 'Free agent'}</span></div>
            <StarRating value={p.stars} elite={p.elite} peak={p.peakStars} showNumber />
            <p>{POSITION_NAMES[p.position] || p.position} · Retired at {p.retiredAge}{p.college ? ` · ${p.college}` : ''}</p>
          </div>
        </div>
      )}
      {phase === 'credits' && (
        <div className="bshow-credits">
          <div className="bshow-roll" style={{ animationDuration: `${creditSecs}s` }} onAnimationEnd={onClose}>
            <h2>Thank you</h2>
            <p className="dim">The Season {season} retirement class</p>
            {retired.map((r) => {
              const t = getTeam(r.lastTeamId);
              return <div key={r.id} className="bshow-line"><span>{r.position}</span><b>{r.name}</b><em>{t?.code || 'FA'}</em><i>{'★'.repeat(Math.floor(r.stars || 0))}{(r.stars || 0) % 1 ? '½' : ''}</i></div>;
            })}
            {!retired.length && <p>Nobody retired this year.</p>}
            <h2 className="bshow-fin">MFL</h2>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
