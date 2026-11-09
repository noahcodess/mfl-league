import React from 'react';
import { links } from '../lib/router.js';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { leagueLogo } from '../data/logos.js';
import { signOut } from '../data/session.js';

// Top bar: MFL logo, main navigation, live-data light, and who's logged in.
export default function Header({ page, session, ready, live }) {
  const p = session.profile;
  const isCommish = ready && p?.role === 'commissioner';
  const myTeam = ready && p?.role === 'coach' && p.team_id;
  return (
    <header className="header">
      <a className="brand" href={links.league}><img src={leagueLogo.light} alt="" /><span>MFL</span></a>
      <nav className="nav">
        {myTeam && <a className={page === 'team' ? 'on' : ''} href={links.team(p.team_id)}>My Team</a>}
        <a className={page === 'league' ? 'on' : ''} href={links.league}>League</a>
        <a className={page === 'dataCheck' ? 'on' : ''} href={links.dataCheck}>Data Check</a>
        {isCommish && <a className={page === 'console' ? 'on' : ''} href={links.console}>Console</a>}
      </nav>
      <div className="header-right">
        <span className="season" title={live ? 'Live league data' : 'Offline copy of the league data'}>
          <span className={`live-dot${live ? ' on' : ''}`} /> Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}
        </span>
        {session.status === 'in' ? (
          <span className="who"><b>{p.username}</b><button className="btn small ghost" onClick={() => signOut(p.role === 'commissioner')}>Log out</button></span>
        ) : session.status === 'out' && <a className="btn small" href={links.login}>Log in</a>}
      </div>
    </header>
  );
}
