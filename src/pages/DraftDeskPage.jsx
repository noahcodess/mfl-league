import React, { useEffect, useState } from 'react';
import DraftControls from '../components/DraftControls.jsx';
import CommishBoard from '../components/CommishBoard.jsx';
import CommishPickModal from '../components/CommishPickModal.jsx';
import DraftResults from '../components/DraftResults.jsx';
import TeamBadge from '../components/TeamBadge.jsx';
import { useDraftClass } from '../data/draft.js';
import { useDraftRoom } from '../data/draftRoom.js';
import { useDraftIntel } from '../data/draftIntel.js';
import { useCoachPresence } from '../data/presence.js';
import { usePotentials } from '../data/potentials.js';
import { useSchedule } from '../data/schedule.js';
import { pickFor } from '../data/draftActions.js';
import { currentSeason, getTeam } from '../data/teams.js';
import { useNow, readDraft, clockText, roundOf } from '../lib/draftClock.js';
import { WINDOWS } from '../lib/windows.js';
import CommishTrades from '../components/CommishTrades.jsx';

// The commissioner desk window: meant to sit on a second monitor while the main screen (the draft room) is shared.
// Shows what nobody else sees: the pick before it's revealed, every potential, who scouted and flagged whom, who's online.
export default function DraftDeskPage({ viewer }) {
  const season = currentSeason();
  const [target, setTarget] = useState(null);
  useEffect(() => { document.title = WINDOWS.draftDesk.title; }, []);
  const draft = useDraftRoom(season);
  const now = useNow(draft.offset);
  const info = readDraft(draft, now);
  const prospectsAll = useDraftClass(season);
  const potentials = usePotentials(`${viewer.user_id}-desk-${draft.picks?.length || 0}`);
  const intel = useDraftIntel(season, true);
  const presence = useCoachPresence(true);
  const schedule = useSchedule(season);
  const draftAt = schedule?.find((r) => r.kind === 'draft')?.at || null;
  if (!prospectsAll || !draft.loaded) return <div className="desk-page"><p className="dim">Loading the desk...</p></div>;
  const taken = new Set([...(draft.picks || []).map((p) => p.player_id), draft.pending?.player_id]);
  const prospects = prospectsAll.filter((p) => !taken.has(p.id));
  const slot = info.current;
  const team = slot ? getTeam(slot.team_id) : null;
  const status = info.phase === 'pre' ? 'Not started' : info.phase === 'done' ? 'Draft complete'
    : info.countdown ? `Revealing in ${info.countdown}...` : info.pickState === 'in' ? 'Pick is in: accept or deny'
      : info.pickState === 'accepted' ? 'Ready to announce' : info.timeUp ? "Time's up: your call" : info.reveal ? 'Reveal playing' : 'On the clock';
  return (
    <div className="desk-page">
      <header className="desk-top">
        <div><b>COMMISSIONER WINDOW: DRAFT DESK</b><small>Season {season} · only you see this window · keep the draft room on your shared screen</small></div>
        {slot && (
          <div className="desk-now">
            {team && <TeamBadge team={team} size="sm" />}
            <span>#{slot.pick_no} {team?.code} · {roundOf(slot)}</span>
            <b className={info.left <= 10 && info.pickState === 'clock' ? 'hot' : ''}>{info.phase === 'paused' ? 'PAUSED' : clockText(info.left)}</b>
            <em>{status}</em>
          </div>
        )}
        {!slot && <em className="dim">{status}</em>}
      </header>
      <DraftControls season={season} info={info} draftAt={draftAt} prospects={prospects} presence={presence} coached={draft.coached} onChange={draft.refresh} hideWindowLink />
      <div className="desk-cols">
        <section className="desk-panel">
          <CommishBoard prospects={prospects} potentials={potentials.map} intel={intel} canPick={!!slot && !draft.pending && info.phase !== 'pre'} onPickFor={setTarget} />
        </section>
        <section className="desk-panel">
          <CommishTrades canControl compact />
          <DraftResults slots={draft.slots || []} picks={draft.picks || []} onPickNo={slot?.pick_no} />
        </section>
      </div>
      {target && team && (
        <CommishPickModal team={team} prospects={prospects} initial={target} onClose={() => setTarget(null)}
          onPick={async (pl) => { await pickFor(pl.id); setTarget(null); draft.refresh(); }} />
      )}
    </div>
  );
}
