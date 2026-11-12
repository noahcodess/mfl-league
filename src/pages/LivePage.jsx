import React, { useState } from 'react';
import LiveHeader from '../components/LiveHeader.jsx';
import BirthdayView from '../components/BirthdayView.jsx';
import FaLiveView from '../components/FaLiveView.jsx';
import LiveSimpleView from '../components/LiveSimpleView.jsx';
import LiveGames from '../components/LiveGames.jsx';
import LiveSeason from '../components/LiveSeason.jsx';
import DraftPage from './DraftPage.jsx';
import { useSchedule } from '../data/schedule.js';
import { useDraftStatus } from '../data/draftRoom.js';
import { currentSeason, currentPhase, offseasonStep } from '../data/teams.js';
import { liveStage } from '../lib/liveStage.js';

// Live: whatever the league is doing right now. Birthday & Farewell, re-signing, free agency (sign players right here),
// draft night (the full draft room), preseason games, or the season (week tabs, games, top players, standings), always with a
// countdown to what's next. The owner and commissioner can preview the season view any time.
export default function LivePage({ viewer, canControl, reload }) {
  const draft = useDraftStatus(currentSeason());
  const rows = useSchedule(currentSeason()) || [];
  const draftAt = rows.find((r) => r.kind === 'draft')?.at;
  const stage = liveStage({ phase: currentPhase(), step: offseasonStep(), draft, draftAt });
  const [preview, setPreview] = useState(false);
  if (stage === 'draft') return <DraftPage viewer={viewer} canControl={canControl} />;
  if (preview) {
    return (
      <div className="live">
        <div className="ls-preview-bar"><button className="btn small ghost" onClick={() => setPreview(false)}>← Back to now</button><span className="dim">Previewing how Live looks during the season</span></div>
        <LiveSeason preview />
      </div>
    );
  }
  return (
    <div className="live">
      <LiveHeader stage={stage} />
      {canControl && stage !== 'season' && <div className="ls-preview-bar"><button className="btn small" onClick={() => setPreview(true)}>📺 Preview the season view</button></div>}
      {(stage === 'birthday_soon' || stage === 'birthday') && <BirthdayView done={stage === 'birthday'} canControl={canControl} reload={reload} />}
      {stage === 'fa' && <FaLiveView viewer={viewer} />}
      {stage === 'resign' && <LiveSimpleView stage={stage} />}
      {stage === 'camp' && <LiveGames kind="preseason" />}
      {stage === 'season' && <LiveSeason />}
    </div>
  );
}
