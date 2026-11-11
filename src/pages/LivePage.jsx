import React from 'react';
import LiveHeader from '../components/LiveHeader.jsx';
import BirthdayView from '../components/BirthdayView.jsx';
import FaLiveView from '../components/FaLiveView.jsx';
import LiveSimpleView from '../components/LiveSimpleView.jsx';
import DraftPage from './DraftPage.jsx';
import { useSchedule } from '../data/schedule.js';
import { useDraftStatus } from '../data/draftRoom.js';
import { currentSeason, currentPhase, offseasonStep } from '../data/teams.js';
import { liveStage } from '../lib/liveStage.js';

// Live: whatever the league is doing right now. Birthday & Farewell, re-signing, free agency (sign players right here),
// draft night (the full draft room), training camp, or the current game week, always with a countdown to what's next.
export default function LivePage({ viewer, canControl, reload }) {
  const draft = useDraftStatus(currentSeason());
  const rows = useSchedule(currentSeason()) || [];
  const draftAt = rows.find((r) => r.kind === 'draft')?.at;
  const stage = liveStage({ phase: currentPhase(), step: offseasonStep(), draft, draftAt });
  if (stage === 'draft') return <DraftPage viewer={viewer} canControl={canControl} />;
  return (
    <div className="live">
      <LiveHeader stage={stage} />
      {(stage === 'birthday_soon' || stage === 'birthday') && <BirthdayView done={stage === 'birthday'} canControl={canControl} reload={reload} />}
      {stage === 'fa' && <FaLiveView viewer={viewer} />}
      {(stage === 'resign' || stage === 'camp' || stage === 'season') && <LiveSimpleView stage={stage} />}
    </div>
  );
}
