import React from 'react';
import { links } from '../lib/router.js';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { leagueLogo } from '../data/logos.js';
import { signOut } from '../data/session.js';
import SandboxButton from './SandboxButton.jsx';

// Top bar: MFL logo, main navigation, live-data light, the commissioner's TEST switch, and who's logged in.
export default function Header({ page, session, ready, live, onLeagueChange }) {
  const p = session.profile;
  const isCommish = ready && (p?.role === 'commissioner' || p?.site_owner);
  const myTeam = ready && p?.role === 'coach' && p.team_id;
  return (
    <header className="header">
      <a className="brand" href={links.home}><img src={leagueLogo.light} alt="" /><span>MFL</span></a>
      <nav className="nav">
        {myTeam && <a className={page === 'home' ? 'on' : ''} href={links.home}>My Team</a>}
        {myTeam && <a className={page === 'team' ? 'on' : ''} href={links.team(p.team_id)}>Roster</a>}
        {!myTeam && <a className={page === 'home' ? 'on' : ''} href={links.home}>Home</a>}
        <a className={page === 'league' ? 'on' : ''} href={links.league}>League</a>
        <a className={page === 'freeAgents' ? 'on' : ''} href={links.freeAgents}>Free Agents</a>
        <a className={page === 'draft' ? 'on' : ''} href={links.draft}>Draft</a>
        <a className={page === 'dataCheck' ? 'on' : ''} href={links.dataCheck}>Data Check</a>
        {isCommish && <a className={page === 'control' ? 'on' : ''} href={links.control}>League Control</a>}
        {isCommish && <a className={page === 'console' ? 'on' : ''} href={links.console}>Accounts</a>}
      </nav>
      <div className="header-right">
        <span className="season" title={live ? 'Live league data' : 'Offline copy of the league data'}>
          <span className={`live-dot${live ? ' on' : ''}`} /> Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}
        </span>
        {ready && session.unlocked && <SandboxButton onChanged={onLeagueChange} />}
        {session.status === 'in' ? (
          <span className="who">{p.site_owner && <span className="owner-tag" title={p.test_commish ? 'Testing: seeing the site as the commissioner' : session.unlocked ? 'Test mode: full commissioner powers' : 'Site owner: you can see everything, change nothing'}>{p.test_commish ? 'COMMISH · TEST' : session.unlocked ? 'OWNER · TEST' : 'OWNER'}</span>}<b>{p.username}</b><button className="btn small ghost" onClick={() => signOut(p.role === 'commissioner' && !p.test_commish)}>Log out</button></span>
        ) : session.status === 'out' && <a className="btn small" href={links.login}>Log in</a>}
      </div>
    </header>
  );
}
