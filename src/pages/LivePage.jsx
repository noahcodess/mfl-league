import React, { useState } from 'react';
import LiveHeader from '../components/LiveHeader.jsx';
import BirthdayView from '../components/BirthdayView.jsx';
import FaLiveView from '../components/FaLiveView.jsx';
import LiveSimpleView from '../components/LiveSimpleView.jsx';
import LiveGames from '../components/LiveGames.jsx';
import LiveSeason from '../components/LiveSeason.jsx';
import CeremonyLive from '../components/CeremonyLive.jsx';
import LivePlayoffs from '../components/LivePlayoffs.jsx';
import DraftPage from './DraftPage.jsx';
import { useSchedule } from '../data/schedule.js';
import { useDraftStatus } from '../data/draftRoom.js';
import { currentSeason, currentPhase, currentWeek, offseasonStep } from '../data/teams.js';
import { liveStage } from '../lib/liveStage.js';

// Live: whatever the league is doing right now. Birthday & Farewell, re-signing, free agency (sign players right here),
// draft night (the full draft room), preseason games, or the season (week tabs, games, top players, standings), always with a
// countdown to what's next. After Week 12, the award ceremony (its stage and nominees, nothing else), then the playoffs. The owner and commissioner can preview the season view any time.
export default function LivePage({ viewer, canControl, reload }) {
  const draft = useDraftStatus(currentSeason());
  const rows = useSchedule(currentSeason()) || [];
  const draftAt = rows.find((r) => r.kind === 'draft')?.at;
  const demoCer = import.meta.env.DEV && /democer/.test(window.location.search);   // dev: preview the ceremony
  const demoPlay = import.meta.env.DEV && /demoplay=1[456]/.test(window.location.search);   // dev: preview the playoffs
  const stage = demoPlay ? 'playoffs' : demoCer ? 'awards' : liveStage({ phase: currentPhase(), step: offseasonStep(), draft, draftAt, week: currentWeek() });
  const [preview, setPreview] = useState(false);
  if (stage === 'draft') return <DraftPage viewer={viewer} canControl={canControl} />;
  if (stage === 'awards') return <div className="live"><CeremonyLive season={currentSeason()} canControl={canControl} /></div>;   // after Week 12: its own moment
  if (stage === 'playoffs') return <div className="live"><LivePlayoffs canControl={canControl} teamId={viewer?.team_id} /></div>;   // after the ceremony: round by round
  if (preview) {
    return (
      <div className="live">
        <div className="ls-preview-bar"><button className="btn small ghost" onClick={() => setPreview(false)}>← Back to now</button><span className="dim">Previewing how Live looks during the season</span></div>
        <LiveSeason preview canControl={canControl} teamId={viewer?.team_id} />
      </div>
    );
  }
  return (
    <div className="live">
      {stage !== 'season' && <LiveHeader stage={stage} />}   {/* in the season, LiveSeason's week card is the header */}
      {canControl && stage !== 'season' && <div className="ls-preview-bar"><button className="btn small" onClick={() => setPreview(true)}>📺 Preview the season view</button></div>}
      {(stage === 'birthday_soon' || stage === 'birthday') && <BirthdayView done={stage === 'birthday'} canControl={canControl} reload={reload} />}
      {stage === 'fa' && <FaLiveView viewer={viewer} />}
      {stage === 'resign' && <LiveSimpleView stage={stage} />}
      {stage === 'camp' && <LiveGames kind="preseason" />}
      {stage === 'season' && <LiveSeason canControl={canControl} teamId={viewer?.team_id} />}
    </div>
  );
}
