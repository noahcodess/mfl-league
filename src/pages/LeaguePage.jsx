import React from 'react';
import ConferenceTable from '../components/ConferenceTable.jsx';
import MarketReport from '../components/MarketReport.jsx';
import LeagueLog from '../components/LeagueLog.jsx';
import { getTeams, getConferences, capLimit, leagueEvents } from '../data/teams.js';
import { getAllPlayers, getFreeAgents } from '../data/players.js';
import { getIssues } from '../data/issues.js';
import { links } from '../lib/router.js';
import { money } from '../lib/format.js';

// League home: both conferences, each team ranked by overall rating.
export default function LeaguePage() {
  const teams = getTeams();
  const flagged = getIssues().length;
  return (
    <div>
      <div className="page-head">
        <h1>League</h1>
        <p className="dim">{teams.length} teams · {getAllPlayers().filter((p) => p.teamId).length} players · <a href={links.freeAgents}>{getFreeAgents().length} free agents</a> · {money(capLimit())} cap · 2 conferences</p>
      </div>
      {flagged > 0 && (
        <a className="notice" href={links.dataCheck}>{flagged} things in the imported data need a look. Open the Data Check.</a>
      )}
      {getConferences().map((c) => (
        <ConferenceTable key={c} name={c} teams={teams.filter((t) => t.conference === c)} />
      ))}
      <MarketReport />
      <LeagueLog events={leagueEvents()} limit={15} title="League news" />
    </div>
  );
}
