import React from 'react';
import Header from './components/Header.jsx';
import LeaguePage from './pages/LeaguePage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import DataCheckPage from './pages/DataCheckPage.jsx';
import { useHashRoute } from './lib/router.js';

// Picks which screen to show from the address (#team-crf, #data-check).
export default function App() {
  const route = useHashRoute();
  return (
    <div className="app">
      <Header page={route.page} />
      <main className="main">
        {route.page === 'team' && <TeamPage teamId={route.id} />}
        {route.page === 'dataCheck' && <DataCheckPage />}
        {route.page === 'league' && <LeaguePage />}
      </main>
    </div>
  );
}
