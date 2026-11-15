import React from 'react';
import Tabs from '../components/Tabs.jsx';
import CustomizeTab from '../components/CustomizeTab.jsx';
import TeamOverview from '../components/TeamOverview.jsx';
import DraftTab from '../components/DraftTab.jsx';
import TeamSchedule from '../components/TeamSchedule.jsx';
import TeamPage from './TeamPage.jsx';
import FreeAgentsPage from './FreeAgentsPage.jsx';
import TradesPage from './TradesPage.jsx';

// My Team: everything about your own team in one place, by tab. Overview (hub, countdowns, contracts), Schedule, Roster
// (depth chart), Free agency (sign players), Trades (offers, block, builder), Customize (uniforms and end zones) and Draft
// (picks, next draft class, scouting, watch list).
export default function MyTeamPage({ viewer, reload, initialTab }) {
  return (
    <div className="myteam">
      <Tabs initial={initialTab} tabs={[
        { key: 'overview', label: '🏠 Overview', render: () => <TeamOverview viewer={viewer} reload={reload} /> },
        { key: 'schedule', label: '📅 Schedule', render: () => <TeamSchedule teamId={viewer.team_id} canPick /> },
        { key: 'roster', label: '📋 Roster', render: () => <TeamPage teamId={viewer.team_id} viewer={viewer} /> },
        { key: 'fa', label: '💰 Free agency', render: () => <FreeAgentsPage viewer={viewer} /> },
        { key: 'trades', label: '🔁 Trades', render: () => <TradesPage viewer={viewer} /> },
        { key: 'customize', label: '🎨 Customize', render: () => <CustomizeTab teamId={viewer.team_id} /> },
        { key: 'picks', label: '🎓 Draft', render: () => <DraftTab viewer={viewer} /> },
      ]} />
    </div>
  );
}
