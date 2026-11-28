import React from 'react';
import Tabs from './Tabs.jsx';
import ScheduleEditor from './ScheduleEditor.jsx';
import SeasonGames from './SeasonGames.jsx';
import PreseasonGames from './PreseasonGames.jsx';
import PlayoffGames from './PlayoffGames.jsx';

// Commissioner's Desk → Schedule: the regular season games, the playoff broadcasts, preseason games, and the league calendar
// (offseason dates, auto-run).
export default function ScheduleTab({ canControl }) {
  return (
    <Tabs tabs={[
      { key: 'games', label: '🏈 Regular season games', render: () => <SeasonGames canControl={canControl} /> },
      { key: 'playoffs', label: '🏆 Playoffs', render: () => <PlayoffGames canControl={canControl} /> },
      { key: 'preseason', label: '🏟️ Preseason', render: () => <PreseasonGames canControl={canControl} /> },
      { key: 'calendar', label: '📅 League calendar', render: () => <ScheduleEditor canControl={canControl} /> },
    ]} />
  );
}
