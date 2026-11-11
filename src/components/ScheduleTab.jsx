import React from 'react';
import Tabs from './Tabs.jsx';
import ScheduleEditor from './ScheduleEditor.jsx';
import SeasonGames from './SeasonGames.jsx';

// Commissioner's Desk → Schedule: the league calendar (offseason dates, auto-run) and the regular season games.
export default function ScheduleTab({ canControl }) {
  return (
    <Tabs tabs={[
      { key: 'games', label: '🏈 Regular season games', render: () => <SeasonGames canControl={canControl} /> },
      { key: 'calendar', label: '📅 League calendar', render: () => <ScheduleEditor canControl={canControl} /> },
    ]} />
  );
}
