import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import BirthdayShowGate from './components/BirthdayShowGate.jsx';
import Redirect from './components/Redirect.jsx';
import LeaguePage from './pages/LeaguePage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import LivePage from './pages/LivePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import KeySetupPage from './pages/KeySetupPage.jsx';
import KeyUnlockPage from './pages/KeyUnlockPage.jsx';
import HomePage from './pages/HomePage.jsx';
import MyTeamPage from './pages/MyTeamPage.jsx';
import CommissionerDeskPage from './pages/CommissionerDeskPage.jsx';
import FreeAgentsPage from './pages/FreeAgentsPage.jsx';
import DraftPage from './pages/DraftPage.jsx';
import DraftDeskPage from './pages/DraftDeskPage.jsx';
import TradesPage from './pages/TradesPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import TradeLauncher from './components/TradeLauncher.jsx';
import SandboxBanner from './components/SandboxBanner.jsx';
import DraftAlert from './components/DraftAlert.jsx';
import ScheduleNotice from './components/ScheduleNotice.jsx';
import { usePresenceHeartbeat } from './data/presence.js';
import { useLeagueTick } from './data/leagueTick.js';
import { inSandbox } from './data/sandbox.js';
import { useHashRoute, homeFor, links } from './lib/router.js';
import { brandColors } from './lib/color.js';
import { useSession, loginStep } from './data/session.js';
import { loadLeague } from './data/loadLeague.js';
import { getTeam } from './data/teams.js';

const FORCED = { changePassword: ChangePasswordPage, keySetup: KeySetupPage, keyUnlock: KeyUnlockPage };

// Picks the screen: unfinished login steps come first, then whatever the address asks for.
function Screen({ route, session, step, reload }) {
  const Forced = FORCED[step];
  if (Forced) return <Forced session={session} />;
  if (route.page === 'login') return step === 'ready' ? <Redirect to={homeFor(session.profile)} /> : step === 'login' ? <LoginPage notice={session.error} /> : null;
  if (route.page === 'console') return <Redirect to={links.accounts} />;
  if (route.page === 'control') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    const p = session.profile;
    if (p.role !== 'commissioner' && !p.site_owner) return <div className="notice bad">Commissioner only.</div>;
    return <CommissionerDeskPage canControl={p.role === 'commissioner' || session.unlocked} reload={reload} viewerKey={`${p.user_id}-${session.unlocked}`}
      accountsReadOnly={p.role !== 'commissioner' && !session.unlocked} testMode={p.site_owner && session.unlocked} initialTab={route.tab} />;
  }
  if (route.page === 'home') {
    const p = step === 'ready' ? session.profile : null;
    return p?.role === 'coach' && p.team_id ? <MyTeamPage viewer={p} reload={reload} initialTab={route.tab} /> : <HomePage signedIn={!!p} />;
  }
  if (route.page === 'team' && step === 'ready' && session.profile?.role === 'coach' && route.id === session.profile.team_id) {
    return <MyTeamPage viewer={session.profile} reload={reload} initialTab="roster" />;
  }
  if (route.page === 'team') return <TeamPage teamId={route.id} viewer={step === 'ready' ? session.profile : null} />;
  if (route.page === 'draft') {
    const p = step === 'ready' ? session.profile : null;
    return <DraftPage viewer={p} canControl={p?.role === 'commissioner' || !!p?.site_owner /* TEMPORARY: owner tests the desk */} stageRoute={route.stage} />;
  }
  if (route.page === 'trades' || route.page === 'inbox') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    const p = session.profile;
    if (route.page === 'trades' && p.role === 'coach' && p.team_id) return <MyTeamPage viewer={p} reload={reload} initialTab="trades" />;
    return route.page === 'trades' ? <TradesPage viewer={p} canControl={p.role === 'commissioner' || !!p.site_owner} /> : <InboxPage viewer={p} />;
  }
  if (route.page === 'draftDesk') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    // TEMPORARY (testing): the site owner can open the desk too. The server still checks every action and every secret.
    return session.profile.role === 'commissioner' || session.profile.site_owner ? <DraftDeskPage viewer={session.profile} /> : <div className="notice bad">Commissioner only.</div>;
  }
  if (route.page === 'freeAgents') return <FreeAgentsPage viewer={step === 'ready' ? session.profile : null} />;
  if (route.page === 'live') {
    const p = step === 'ready' ? session.profile : null;
    return <LivePage viewer={p} reload={reload} canControl={p?.role === 'commissioner' || !!p?.site_owner /* TEMPORARY: owner tests the desk */} />;
  }
  return <LeaguePage />;
}

export default function App() {
  const route = useHashRoute();
  const session = useSession();
  const step = loginStep(session);
  const [live, setLive] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = async () => { setLive(await loadLeague()); setVersion((v) => v + 1); };
  useEffect(() => { loadLeague().then(setLive); }, []);
  const myTeam = step === 'ready' && session.profile?.role === 'coach' ? getTeam(session.profile.team_id) : null;
  usePresenceHeartbeat(step === 'ready');
  useLeagueTick(reload);
  return (
    <div className={`app${inSandbox() ? ' sandbox' : ''}`} style={inSandbox() ? undefined : brandColors(myTeam)}>
      {!route.stage && <Header page={route.page} session={session} ready={step === 'ready'} live={live} onLeagueChange={reload} />}
      {!route.stage && <SandboxBanner />}
      {myTeam && !route.stage && <DraftAlert teamId={myTeam.id} page={route.page} />}
      {!route.stage && <ScheduleNotice />}
      <TradeLauncher myTeamId={myTeam?.id} />
      {step === 'ready' || session.status === 'out' ? <BirthdayShowGate page={route.page} viewer={step === 'ready' ? session.profile : null} version={version} /> : null}
      <main className="main"><div className="page" key={`${route.page}-${route.id || ''}-${route.tab || ''}-${step}`}><Screen route={route} session={session} step={step} reload={reload} /></div></main>
    </div>
  );
}
