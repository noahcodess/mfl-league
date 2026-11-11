import React from 'react';
import { yearsLeft, contractOf } from '../data/contracts.js';
import { isRetiring } from '../data/players.js';
import { currentSeason } from '../data/teams.js';

// The notes that used to be badges, shown inside the player card: rookie, declining (regressed from his peak), retirement
// risk (only 26 and 27 year olds retire), and (when contract=true) whether his deal is ending.
export default function PlayerFlags({ player, contract }) {
  const flags = [];
  if (contract) {
    const left = yearsLeft(player);
    if (player.teamId && contractOf(player) && left === 0) flags.push(['red', 'Contract expiring', 'Re-sign him in the re-signing window or he hits free agency.']);
    else if (player.teamId && left === 1) flags.push(['amber', 'Final year of his deal', 'He can be re-signed next offseason.']);
  } else {
    if (player.rookieSeason != null && player.rookieSeason === currentSeason()) flags.push(['green', 'Rookie', 'First season in the league.']);
    if (player.peakStars != null && player.peakStars > player.stars) flags.push(['red', 'Declining', `Down ${(player.peakStars - player.stars).toFixed(1)}★ from his best (${player.peakStars}★). The red stars are what he's lost.`]);
    if (isRetiring(player) || player.age >= 27) flags.push(['red', 'Final season', 'He retires at his next birthday.']);
    else if (player.age === 26) flags.push(['amber', 'Retirement risk', 'About a 1 in 5 chance he retires at his next birthday (less likely for stars).']);
  }
  if (!flags.length) return null;
  return (
    <div className="pflags">
      {flags.map(([tone, label, note]) => (
        <div key={label} className={`pflag ${tone}`}><i /><b>{label}</b><span>{note}</span></div>
      ))}
    </div>
  );
}
