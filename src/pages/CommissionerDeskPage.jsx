import React from 'react';
import Tabs from '../components/Tabs.jsx';
import OffseasonPanel from '../components/OffseasonPanel.jsx';
import WeekControl from '../components/WeekControl.jsx';
import ScheduleEditor from '../components/ScheduleEditor.jsx';
import CommishTrades from '../components/CommishTrades.jsx';
import CoachList from '../components/CoachList.jsx';
import AccountsPanel from '../components/AccountsPanel.jsx';
import SandboxButton from '../components/SandboxButton.jsx';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { inSandbox } from '../data/sandbox.js';

// The Commissioner's Desk: every league office tool in one place, by tab. Offseason (steps + draft settings),
// Season (game weeks), Schedule, Trades, Coaches, Accounts.
export default function CommissionerDeskPage({ canControl, reload, viewerKey, accountsReadOnly, testMode, initialTab }) {
  return (
    <div>
      <div className="console-head">
        <div><h1>Commissioner's Desk</h1><div className="dim">Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}. You set the pace; the league does the rest.</div></div>
        {canControl && (
          <div className="test-card">
            <span>{inSandbox() ? '🧪 TEST mode is on. Leaving it resets the league.' : '🧪 Try anything first: TEST mode resets when you leave it.'}</span>
            <SandboxButton onChanged={reload} />
          </div>
        )}
      </div>
      {!canControl && <div className="notice">View only. The commissioner runs the league with his key.</div>}
      <Tabs initial={initialTab} tabs={[
        { key: 'offseason', label: '📆 Offseason', render: () => <OffseasonPanel canControl={canControl} reload={reload} viewerKey={viewerKey} /> },
        { key: 'season', label: '🏈 Season', render: () => <WeekControl canControl={canControl} reload={reload} /> },
        { key: 'schedule', label: '📅 Schedule', render: () => <ScheduleEditor canControl={canControl} /> },
        { key: 'trades', label: '🔁 Trades', render: () => <CommishTrades canControl={canControl} /> },
        { key: 'coaches', label: '🧢 Coaches', render: () => <CoachList canControl={canControl} /> },
        { key: 'accounts', label: '👥 Accounts', render: () => <AccountsPanel readOnly={accountsReadOnly} testMode={testMode} /> },
      ]} />
    </div>
  );
}
