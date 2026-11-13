import React from 'react';
import { links } from '../lib/router.js';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { leagueLogo } from '../data/logos.js';
import { signOut } from '../data/session.js';
import SandboxButton from './SandboxButton.jsx';
import { useInbox } from '../data/inbox.js';

// Top bar: MFL logo, main navigation, live-data light, the inbox bell, the commissioner's TEST switch, and who's logged in.
export default function Header({ page, session, ready, live, onLeagueChange }) {
  const p = session.profile;
  const isCommish = ready && (p?.role === 'commissioner' || p?.site_owner);
  const myTeam = ready && p?.role === 'coach' && p.team_id;
  const { unread } = useInbox(ready ? p?.user_id : null);
  return (
    <header className="header">
      <a className="brand" href={links.home}><img src={leagueLogo.light} alt="" /><span>MFL</span></a>
      <nav className="nav">
        {myTeam && <a className={['home', 'trades'].includes(page) ? 'on' : ''} href={links.home}>My Team</a>}
        {!myTeam && <a className={page === 'home' ? 'on' : ''} href={links.home}>Home</a>}
        <a className={page === 'league' ? 'on' : ''} href={links.league}>League</a>
        <a className={`nav-live${['live', 'draft', 'freeAgents', 'game'].includes(page) ? ' on' : ''}`} href={links.live}><i className="live-pulse" />Live</a>
        {ready && !myTeam && <a className={page === 'trades' ? 'on' : ''} href={links.trades}>Trades</a>}
        {isCommish && <a className={page === 'control' ? 'on' : ''} href={links.control}>Commissioner's Desk</a>}
      </nav>
      <div className="header-right">
        <span className="season" title={live ? 'Live league data' : 'Offline copy of the league data'}>
          <span className={`live-dot${live ? ' on' : ''}`} /> Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}
        </span>
        {ready && <a className={`bell${page === 'inbox' ? ' on' : ''}`} href={links.inbox} title="Inbox">🔔{unread > 0 && <span className="bell-n">{unread > 9 ? '9+' : unread}</span>}</a>}
        {ready && session.unlocked && <SandboxButton onChanged={onLeagueChange} />}
        {session.status === 'in' ? (
          <span className="who">{p.site_owner && <span className="owner-tag" title={p.test_commish ? 'Testing: seeing the site as the commissioner' : session.unlocked ? 'Test mode: full commissioner powers' : 'Site owner: you can see everything, change nothing'}>{p.test_commish ? 'COMMISH · TEST' : session.unlocked ? 'OWNER · TEST' : 'OWNER'}</span>}<b>{p.username}</b><button className="btn small ghost" onClick={() => signOut(p.role === 'commissioner' && !p.test_commish)}>Log out</button></span>
        ) : session.status === 'out' && <a className="btn small" href={links.login}>Log in</a>}
      </div>
    </header>
  );
}
