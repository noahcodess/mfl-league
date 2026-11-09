import React from 'react';
import { links } from '../lib/router.js';
import { currentSeason } from '../data/teams.js';

// Top bar with the league brand and main navigation.
export default function Header({ page }) {
  return (
    <header className="header">
      <a className="brand" href={links.league}><span className="brand-mark">MFL</span> League</a>
      <nav className="nav">
        <a className={page === 'league' ? 'on' : ''} href={links.league}>Teams</a>
        <a className={page === 'dataCheck' ? 'on' : ''} href={links.dataCheck}>Data Check</a>
      </nav>
      <span className="season">Season {currentSeason()}</span>
    </header>
  );
}
