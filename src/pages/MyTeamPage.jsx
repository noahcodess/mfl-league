import React from 'react';
import Tabs from '../components/Tabs.jsx';
import TeamOverview from '../components/TeamOverview.jsx';
import PickList from '../components/PickList.jsx';
import TeamPage from './TeamPage.jsx';
import FreeAgentsPage from './FreeAgentsPage.jsx';
import TradesPage from './TradesPage.jsx';
import { getPicks } from '../data/picks.js';
import { currentSeason } from '../data/teams.js';

// My Team: everything about your own team in one place, by tab. Overview (hub, countdowns, contracts), Roster
// (depth chart), Free agency (sign players), Trades (offers, block, builder) and Draft picks.
export default function MyTeamPage({ viewer, reload, initialTab }) {
  return (
    <div className="myteam">
      <Tabs initial={initialTab} tabs={[
        { key: 'overview', label: '🏠 Overview', render: () => <TeamOverview viewer={viewer} reload={reload} /> },
        { key: 'roster', label: '📋 Roster', render: () => <TeamPage teamId={viewer.team_id} viewer={viewer} /> },
        { key: 'fa', label: '💰 Free agency', render: () => <FreeAgentsPage viewer={viewer} /> },
        { key: 'trades', label: '🔁 Trades', render: () => <TradesPage viewer={viewer} /> },
        { key: 'picks', label: '🎟️ Picks', render: () => <PickList picks={getPicks(viewer.team_id)} currentSeason={currentSeason()} title="All your draft picks" /> },
      ]} />
    </div>
  );
}
