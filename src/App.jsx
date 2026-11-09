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
import { useHashRoute, homeFor } from './lib/router.js';
import { brandColors } from './lib/color.js';
import { useSession, loginStep } from './data/session.js';
import { loadLeague } from './data/loadLeague.js';
import { getTeam } from './data/teams.js';

const FORCED = { changePassword: ChangePasswordPage, keySetup: KeySetupPage, keyUnlock: KeyUnlockPage };

// Picks the screen: unfinished login steps come first, then whatever the address asks for.
function Screen({ route, session, step }) {
  const Forced = FORCED[step];
  if (Forced) return <Forced session={session} />;
  if (route.page === 'login') return step === 'ready' ? <Redirect to={homeFor(session.profile)} /> : step === 'login' ? <LoginPage notice={session.error} /> : null;
  if (route.page === 'console') {
    if (step === 'login') return <LoginPage />;
    if (step !== 'ready') return null;
    return session.profile.role === 'commissioner' ? <ConsolePage /> : <div className="notice bad">Commissioner only.</div>;
  }
  if (route.page === 'team') return <TeamPage teamId={route.id} />;
  if (route.page === 'dataCheck') return <DataCheckPage />;
  return <LeaguePage />;
}

export default function App() {
  const route = useHashRoute();
  const session = useSession();
  const step = loginStep(session);
  const [live, setLive] = useState(false);
  useEffect(() => { loadLeague().then(setLive); }, []);
  const myTeam = step === 'ready' && session.profile?.role === 'coach' ? getTeam(session.profile.team_id) : null;
  return (
    <div className="app" style={brandColors(myTeam)}>
      <Header page={route.page} session={session} ready={step === 'ready'} live={live} />
      <main className="main"><Screen route={route} session={session} step={step} /></main>
    </div>
  );
}
