import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Redirect from './components/Redirect.jsx';
import LeaguePage from './pages/LeaguePage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import DataCheckPage from './pages/DataCheckPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import KeySetupPage from './pages/KeySetupPage.jsx';
import KeyUnlockPage from './pages/KeyUnlockPage.jsx';
import ConsolePage from './pages/ConsolePage.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeagueControlPage from './pages/LeagueControlPage.jsx';
import FreeAgentsPage from './pages/FreeAgentsPage.jsx';
import { useHashRoute, homeFor } from './lib/router.js';
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
  if (route.page === 'console') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    const p = session.profile;
    if (p.role === 'commissioner' || p.site_owner) return <ConsolePage readOnly={p.role !== 'commissioner' && !session.unlocked} testMode={p.site_owner && session.unlocked} />;
    return <div className="notice bad">Commissioner only.</div>;
  }
  if (route.page === 'control') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    const p = session.profile;
    if (p.role !== 'commissioner' && !p.site_owner) return <div className="notice bad">Commissioner only.</div>;
    return <LeagueControlPage canControl={p.role === 'commissioner' || session.unlocked} reload={reload} viewerKey={`${p.user_id}-${session.unlocked}`} />;
  }
  if (route.page === 'home') {
    const p = step === 'ready' ? session.profile : null;
    return p?.role === 'coach' && p.team_id ? <DashboardPage viewer={p} reload={reload} /> : <HomePage signedIn={!!p} />;
  }
  if (route.page === 'team') return <TeamPage teamId={route.id} viewer={step === 'ready' ? session.profile : null} />;
  if (route.page === 'freeAgents') return <FreeAgentsPage viewer={step === 'ready' ? session.profile : null} />;
  if (route.page === 'dataCheck') return <DataCheckPage />;
  return <LeaguePage />;
}

export default function App() {
  const route = useHashRoute();
  const session = useSession();
  const step = loginStep(session);
  const [live, setLive] = useState(false);
  const [, setVersion] = useState(0);
  const reload = async () => { setLive(await loadLeague()); setVersion((v) => v + 1); };
  useEffect(() => { loadLeague().then(setLive); }, []);
  const myTeam = step === 'ready' && session.profile?.role === 'coach' ? getTeam(session.profile.team_id) : null;
  return (
    <div className="app" style={brandColors(myTeam)}>
      <Header page={route.page} session={session} ready={step === 'ready'} live={live} />
      <main className="main"><div className="page" key={`${route.page}-${route.id || ''}-${step}`}><Screen route={route} session={session} step={step} reload={reload} /></div></main>
    </div>
  );
}
