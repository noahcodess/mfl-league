import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import GradeStamp from './GradeStamp.jsx';
import CommishPickModal from './CommishPickModal.jsx';
import { getTeam } from '../data/teams.js';
import { links } from '../lib/router.js';
import { startDraft, decidePick, announcePick, undoPick, pauseDraft, autoPick, pickFor, simDraft } from '../data/draftActions.js';

// The commissioner's desk: accept/deny picks, announce them, handle a coach whose time ran out, pause, go back, auto pick, sim, open the stage.
export default function DraftControls({ season, info, prospects, presence, coached, onChange }) {
  const [choosing, setChoosing] = useState(false);
  const [err, setErr] = useState('');
  const act = (fn) => async (...a) => { setErr(''); try { await fn(...a); onChange(); } catch (e) { setErr(e.message); throw e; } };
  const quick = (fn) => async () => { try { await act(fn)(); } catch { /* shown above */ } };
  const slot = info.current;
  const team = slot ? getTeam(slot.team_id) : null;
  const p = info.pending;
  const live = info.phase === 'live' || info.phase === 'paused';
  const human = slot && coached?.includes(slot.team_id);

  return (
    <section className="desk">
      <div className="desk-head">
        <b>🎛️ Commissioner desk</b>
        <a className="btn small ghost" href={links.draftStage} target="_blank" rel="noreferrer">📺 Open stage in a new window</a>
      </div>
      {err && <p className="notice bad">{err}</p>}

      {info.phase === 'pre' && (
        <ConfirmButton label={`🏈 Start the Season ${season} draft`} title={`Start the Season ${season} draft?`} yes="Start the draft"
          text="The first team goes on the clock in 10 seconds. Every coach sees it live. Free agency rounds must be finished first." onConfirm={act(startDraft)} />
      )}

      {p && p.status === 'pending' && (
        <div className="desk-pick">
          <Headshot player={p.player} team={getTeam(p.team_id)} size={56} />
          <div><small>{getTeam(p.team_id)?.name} turned in</small><b>{p.player?.name}</b><span>{p.player?.position} · {p.player?.college} · <StarRating value={p.player?.stars} /></span></div>
          <div className="desk-btns">
            <button className="btn good" onClick={quick(() => decidePick(p.id, true))}>✅ Accept</button>
            <ConfirmButton className="btn ghost" label="✋ Deny" title={`Deny ${p.player?.name}?`} yes="Deny the pick"
              text={`${getTeam(p.team_id)?.name} goes back on the clock with a fresh timer and has to pick again.`} onConfirm={act(() => decidePick(p.id, false))} />
          </div>
        </div>
      )}

      {p && p.status === 'ready' && (
        <div className="desk-pick ready">
          <Headshot player={p.player} team={getTeam(p.team_id)} size={56} />
          <div><small>Ready to announce · Pick #{p.pick_no}</small><b>{p.player?.name}</b><span>{p.player?.position} · {p.player?.college}</span></div>
          {p.grade && <GradeStamp grade={p.grade} size="sm" />}
          <button className="btn announce" onClick={quick(announcePick)}>🎙️ Announce pick</button>
        </div>
      )}

      {info.timeUp && human && !p && (
        <div className="desk-pick timeup">
          <div><small>⏰ Time's up</small><b>{team?.name}</b><span>{presence?.[slot.team_id]?.username || 'The coach'} didn't pick in time. Your call.</span></div>
          <div className="desk-btns">
            <ConfirmButton label="🤖 Auto pick" title={`Auto pick for ${team?.name}?`} yes="Auto pick"
              text="Takes their top flagged player if they flagged any; otherwise a good player off the board." onConfirm={act(autoPick)} />
            <button className="btn ghost" onClick={() => setChoosing(true)}>🔎 Make the pick for them</button>
          </div>
        </div>
      )}

      {live && (
        <div className="desk-row">
          <button className="btn small" onClick={quick(() => pauseDraft(info.phase === 'live'))}>{info.phase === 'live' ? '⏸ Pause' : '▶️ Resume'}</button>
          <ConfirmButton className="btn small ghost" label="⏪ Go back a pick" title="Go back a pick?" yes="Take it back" disabled={!info.made && !p}
            text={p ? 'The pick that just came in goes back, and that team is on the clock again.' : `Pick #${info.last?.pick_no} (${info.last?.player?.name}) is taken back: he returns to the board, his contract is torn up, and that team is on the clock again.`}
            onConfirm={act(undoPick)} />
          <ConfirmButton className="btn small ghost" label={`🤖 Auto pick for ${team?.code || ''}`} title={`Auto pick for ${team?.name}?`} yes="Auto pick" disabled={!!p || !slot}
            text="The pick is made for them right now." onConfirm={act(autoPick)} />
          <button className="btn small ghost" disabled={!!p || !slot} onClick={() => setChoosing(true)}>🔎 Pick for {team?.code || ''}</button>
          <ConfirmButton className="btn small ghost" label="⏩ Sim to the end" title="Finish the whole draft now?" yes="Sim it"
            text="Every pick left is made instantly with no reveals, and a pick that's waiting goes through. Use this to wrap up fast." onConfirm={act(simDraft)} />
        </div>
      )}

      {coached?.length > 0 && (
        <div className="desk-online">
          {coached.map((id) => {
            const c = presence?.[id];
            return <span key={id} className={c?.online ? 'on' : ''}><i className={`dot${c?.online ? ' on' : ''}`} /> {getTeam(id)?.code} {c?.username ? `· ${c.username}` : ''}</span>;
          })}
        </div>
      )}

      {choosing && slot && (
        <CommishPickModal team={team} prospects={prospects} onClose={() => setChoosing(false)}
          onPick={async (pl) => { await act(() => pickFor(pl.id))(); setChoosing(false); }} />
      )}
    </section>
  );
}
