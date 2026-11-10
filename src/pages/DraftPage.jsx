import React, { useEffect, useRef, useState } from 'react';
import DraftHeader from '../components/DraftHeader.jsx';
import OnTheClock from '../components/OnTheClock.jsx';
import DraftUpNext from '../components/DraftUpNext.jsx';
import DeskBar from '../components/DeskBar.jsx';
import DraftBoard from '../components/DraftBoard.jsx';
import DraftResults from '../components/DraftResults.jsx';
import DraftRecap from '../components/DraftRecap.jsx';
import DraftOrder from '../components/DraftOrder.jsx';
import DraftTicker from '../components/DraftTicker.jsx';
import DraftConfirm from '../components/DraftConfirm.jsx';
import PickReveal from '../components/PickReveal.jsx';
import RevealCountdown from '../components/RevealCountdown.jsx';
import ProspectModal from '../components/ProspectModal.jsx';
import Tabs from '../components/Tabs.jsx';
import DraftNight from '../components/DraftNight.jsx';
import { useSchedule, useLeagueNumbers } from '../data/schedule.js';
import { useDraftClass, useDraftOrder } from '../data/draft.js';
import { useDraftRoom } from '../data/draftRoom.js';
import { useDraftFlags } from '../data/draftFlags.js';
import { useCoachPresence } from '../data/presence.js';
import { useMyScouts } from '../data/scouting.js';
import { usePotentials } from '../data/potentials.js';
import { makePick } from '../data/draftActions.js';
import { currentSeason } from '../data/teams.js';
import { useNow, readDraft, revealStyle } from '../lib/draftClock.js';

// The MFL Draft room: the stage (who's on the clock, the clock, reveals), the big board to pick from, results, and the commissioner's desk.
// Stage mode hides everything but the show, for screen sharing on the Discord call.
export default function DraftPage({ viewer, canControl, stageRoute }) {
  const season = currentSeason();
  const myTeam = viewer?.role === 'coach' ? viewer.team_id : null;
  const [stage, setStage] = useState(!!stageRoute);
  const [open, setOpen] = useState(null);
  const [drafting, setDrafting] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [version, setVersion] = useState(0);
  const tabsRef = useRef(null);
  const draft = useDraftRoom(season);
  const now = useNow(draft.offset);
  const info = readDraft(draft, now);
  const myPicks = (draft.picks || []).filter((p) => p.team_id === myTeam).length;
  const viewerKey = viewer ? `${viewer.user_id}-${viewer.team_id}-${viewer.role}-${version}-${myPicks}` : null;
  const prospectsAll = useDraftClass(season);
  const order = useDraftOrder(season);
  const potentials = usePotentials(viewerKey);
  const scouts = useMyScouts(myTeam ? viewerKey : null, version);
  const { flags, toggle } = useDraftFlags(myTeam);
  const presence = useCoachPresence(canControl);
  const schedule = useSchedule(season);
  const opens = useLeagueNumbers(['draft_room_opens_minutes']);
  const draftAt = schedule?.find((r) => r.kind === 'draft')?.at || null;

  useEffect(() => {
    document.body.classList.toggle('stage-on', stage);
    return () => document.body.classList.remove('stage-on');
  }, [stage]);

  if (!prospectsAll || !draft.loaded) return <div className="draft-room"><p className="dim">Loading the draft room...</p></div>;
  const taken = new Set([...(draft.picks || []).map((p) => p.player_id || p.player?.id), draft.pending?.player_id || draft.pending?.player?.id]);
  const prospects = prospectsAll.filter((p) => !taken.has(p.id));
  const scouted = new Set(scouts?.scouted || []);
  const onClock = !!myTeam && info.current?.team_id === myTeam && info.pickState === 'clock' && !info.timeUp && info.phase === 'live';
  const isBot = (id) => !(draft.coached || []).includes(id);
  const reveal = info.revealing && !dismissed.has(info.revealing.id) ? info.revealing : null;
  const lockIn = async (p) => { await makePick(p.id); draft.refresh(); };
  const goPick = () => tabsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const board = () => (
    <DraftBoard prospects={prospects} potentials={potentials.map} flags={flags} scouted={scouted} canFlag={!!myTeam}
      onFlag={toggle} onClock={onClock} onDraft={setDrafting} onOpen={setOpen} />
  );

  return (
    <div className={`draft-room${stage ? ' stage-mode' : ''}`}>
      <div className="draft-lights" aria-hidden="true"><i /><i /><i /><i /></div>
      <DraftHeader season={season} info={info} draftAt={draftAt} isCoach={!!myTeam} stage={stage} onStage={() => setStage((s) => !s)} />
      {canControl && !stage && <DeskBar season={season} info={info} draftAt={draftAt} prospects={prospects} presence={presence} coached={draft.coached} onChange={draft.refresh} />}

      {info.phase === 'pre' && (
        <DraftNight season={season} startsAt={draftAt} opensMinutes={opens?.draft_room_opens_minutes ?? 15} now={now} prospects={prospects.length} isCoach={!!myTeam} />
      )}
      {(info.phase === 'live' || info.phase === 'paused') && (
        <>
          <OnTheClock info={info} myTeamId={myTeam} presence={presence} onPickNow={goPick} />
          <DraftUpNext slots={info.upNext} isBot={isBot} presence={presence} myTeamId={myTeam} />
        </>
      )}
      {info.phase === 'done' && <DraftRecap season={season} picks={draft.picks} />}

      {stage ? (
        <section className="stage-results"><DraftResults slots={draft.slots} picks={draft.picks} onPickNo={info.current?.pick_no} /></section>
      ) : (
        <section className="card draft-tabs" ref={tabsRef}>
          <Tabs initial={info.phase === 'done' ? 'results' : 'board'} tabs={[
            ...(info.phase !== 'done' ? [{ key: 'board', label: onClock ? '🏈 Make your pick' : 'Big board', render: board }] : []),
            { key: 'results', label: 'Picks', render: () => <DraftResults slots={draft.slots} picks={draft.picks} onPickNo={info.current?.pick_no} /> },
            { key: 'order', label: 'Draft order', render: () => <DraftOrder season={season} order={order} myTeamId={myTeam} /> },
          ]} />
        </section>
      )}
      <DraftTicker picks={draft.picks} season={season} />

      {info.countdown > 0 && info.last && <RevealCountdown pick={info.last} seconds={info.countdown} showName={canControl} />}
      {reveal && (
        <PickReveal key={reveal.id} pick={reveal} variant={revealStyle(reveal)} mine={reveal.team_id === myTeam}
          potential={potentials.map[reveal.player?.id]} onDone={() => setDismissed((d) => new Set(d).add(reveal.id))} />
      )}
      {open && (
        <ProspectModal player={open} potential={potentials.map[open.id] ?? null} scouts={scouts} scouted={scouted.has(open.id)}
          onScouted={() => setVersion((v) => v + 1)} onClose={() => setOpen(null)}
          footer={myTeam && !taken.has(open.id) && (
            <>
              <button className={`btn ghost${flags.has(open.id) ? ' on' : ''}`} onClick={() => toggle(open.id)}>{flags.has(open.id) ? '⚑ Flagged' : '⚑ Flag him'}</button>
              {onClock && <button className="btn" onClick={() => { setDrafting(open); setOpen(null); }}>🏈 Draft him</button>}
            </>
          )} />
      )}
      {drafting && info.current && <DraftConfirm player={drafting} slot={info.current} onConfirm={lockIn} onClose={() => setDrafting(null)} />}
    </div>
  );
}
