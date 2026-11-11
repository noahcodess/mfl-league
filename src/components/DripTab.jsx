import React, { useState } from 'react';
import UniformSprite from './UniformSprite.jsx';
import HelmetCloseup from './HelmetCloseup.jsx';
import DripEditor from './DripEditor.jsx';
import DripSend from './DripSend.jsx';
import { usePlayerDrip, useDripStatus, setDrip, helmetName } from '../data/drip.js';
import { updatePlayer } from '../data/commishEdit.js';
import { useJerseys } from '../data/jerseys.js';
import { getTeam } from '../data/teams.js';
import { useSession } from '../data/session.js';

// Player card → Drip: the player in uniform (switch between his team's four) with a big helmet close-up, and the drip editor
// with a live preview, number included. His coach sends one change as a request; the commissioner saves directly.
export default function DripTab({ player }) {
  const team = getTeam(player.teamId);
  const jerseys = useJerseys(team);
  const [version, setVersion] = useState(0);
  const saved = usePlayerDrip(player.id, version);
  const status = useDripStatus(player.id, version);
  const { profile } = useSession();
  const commish = profile?.role === 'commissioner' || !!profile?.site_owner; // site owner: TEMPORARY test access
  const mine = !!profile?.team_id && profile.team_id === player.teamId;
  const [slot, setSlot] = useState(1);
  const [draft, setDraft] = useState(null);
  const [number, setNumber] = useState(null);
  const [msg, setMsg] = useState('');
  if (!team || !saved || !jerseys.length) return <p className="dim">Getting dressed...</p>;
  const drip = draft || saved;
  const num = number ?? player.number;
  const colors = (jerseys.find((j) => j.slot === slot) || jerseys[0]).colors;
  const done = (text) => { setDraft(null); setNumber(null); setVersion((v) => v + 1); setMsg(text); };
  const saveDirect = async () => {
    setMsg('');
    try {
      await setDrip(player.id, draft);
      if (num !== player.number) await updatePlayer(player.id, { number: Number(num) });
      done('✅ Saved.');
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="drip-tab">
      <div className="drip-stage">
        <div className="drip-field"><UniformSprite colors={colors} player={player} number={num} drip={drip} team={team} scale={4} /></div>
        <div className="drip-side">
          <HelmetCloseup team={team} colors={colors} model={drip.helmet} scale={4} />
          <b>{helmetName(drip.helmet)}</b>
          <div className="drip-kits">{jerseys.map((j) => <button key={j.slot} className={slot === j.slot ? 'on' : ''} onClick={() => setSlot(j.slot)}>{j.name}</button>)}</div>
        </div>
      </div>
      {mine && status?.pending && !draft && <p className="drip-wait">⏳ A drip change for him is waiting on the commissioner.</p>}
      {mine && !commish && status && !status.pending && status.left > 0 && !draft && <p className="drip-wait">🕒 He can change his drip again in {status.left} more week{status.left === 1 ? '' : 's'} (or offseason step{status.left === 1 ? '' : 's'}).</p>}
      {(commish || mine) && (draft ? (
        <>
          <div className="drip-row drip-number"><span>Number</span><span>#<input inputMode="numeric" maxLength={2} value={num ?? ''} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '') === '' ? '' : Number(e.target.value.replace(/\D/g, '')))} /></span></div>
          <DripEditor drip={drip} onChange={setDraft} team={team} colors={colors} position={player.position} />
          <div className="drip-actions">
            <button className="btn ghost" onClick={() => { setDraft(null); setNumber(null); }}>Cancel</button>
            {commish ? <button className="btn" onClick={saveDirect}>Save drip</button>
              : <DripSend player={player} saved={saved} draft={draft} number={num} status={status} onSent={(item) => done(`📨 Request sent to commissioner (${item}). You'll hear back in your inbox.`)} onError={setMsg} />}
          </div>
        </>
      ) : <button className="btn" disabled={!commish && (!status || status.pending || status.left > 0)} onClick={() => { setMsg(''); setDraft({ ...saved }); }}>✏️ Edit drip</button>)}
      {mine && !commish && <p className="dim drip-note">One change per request (like gloves, or his number). Once the commissioner accepts it, he waits 2 weeks (or 2 offseason steps) before the next one.</p>}
      {msg && <p className={msg.startsWith('✅') || msg.startsWith('📨') ? 'numreq-sent' : 'form-error'}>{msg}</p>}
    </div>
  );
}
