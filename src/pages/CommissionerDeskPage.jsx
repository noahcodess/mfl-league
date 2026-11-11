import React from 'react';
import Tabs from '../components/Tabs.jsx';
import OffseasonPanel from '../components/OffseasonPanel.jsx';
import WeekControl from '../components/WeekControl.jsx';
import ScheduleEditor from '../components/ScheduleEditor.jsx';
import CommishTrades from '../components/CommishTrades.jsx';
import CoachList from '../components/CoachList.jsx';
import AccountsPanel from '../components/AccountsPanel.jsx';
import TeamEditList from '../components/TeamEditList.jsx';
import PlayerEditList from '../components/PlayerEditList.jsx';
import SandboxButton from '../components/SandboxButton.jsx';
import { currentSeason, currentPhase, PHASE_NAMES } from '../data/teams.js';
import { inSandbox } from '../data/sandbox.js';

// The Commissioner's Desk: every league office tool in one place, by tab. Offseason (steps, draft settings, league rules),
// Season (game weeks), Schedule, Teams (names, logos), Players (edit anyone), Trades, Coaches, Accounts.
export default function CommissionerDeskPage({ canControl, reload, viewerKey, accountsReadOnly, testMode, initialTab }) {
  return (
    <div className="desk">
      <div className="console-head desk-head">
        <div className="desk-seal" aria-hidden>MFL</div>
        <div><small className="desk-kicker">League office</small><h1>Commissioner's Desk</h1><div className="dim">Season {currentSeason()} · {PHASE_NAMES[currentPhase()]}. You set the pace; the league does the rest.</div></div>
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
        { key: 'season', label: '🏟️ Season', render: () => <WeekControl canControl={canControl} reload={reload} /> },
        { key: 'schedule', label: '📅 Schedule', render: () => <ScheduleEditor canControl={canControl} /> },
        { key: 'teams', label: '🛡️ Teams', render: () => <TeamEditList canControl={canControl} reload={reload} /> },
        { key: 'players', label: '🏈 Players', render: () => <PlayerEditList canControl={canControl} reload={reload} /> },
        { key: 'trades', label: '🔁 Trades', render: () => <CommishTrades canControl={canControl} /> },
        { key: 'coaches', label: '🧢 Coaches', render: () => <CoachList canControl={canControl} /> },
        { key: 'accounts', label: '👥 Accounts', render: () => <AccountsPanel readOnly={accountsReadOnly} testMode={testMode} /> },
      ]} />
    </div>
  );
}
