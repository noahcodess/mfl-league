import React, { useState } from 'react';
import UniformSprite from './UniformSprite.jsx';
import HelmetCloseup from './HelmetCloseup.jsx';
import DripEditor from './DripEditor.jsx';
import { usePlayerDrip, setDrip, helmetName } from '../data/drip.js';
import { useJerseys } from '../data/jerseys.js';
import { getTeam } from '../data/teams.js';
import { useSession } from '../data/session.js';

// Player card → Drip: the player in uniform (switch between his team's four) with a big helmet close-up, what he wears,
// and the drip editor with a live preview. The commissioner saves directly; coach requests come with the request system.
export default function DripTab({ player }) {
  const team = getTeam(player.teamId);
  const jerseys = useJerseys(team);
  const [version, setVersion] = useState(0);
  const saved = usePlayerDrip(player.id, version);
  const { profile } = useSession();
  const commish = profile?.role === 'commissioner' || !!profile?.site_owner; // site owner: TEMPORARY test access
  const mine = !!profile?.team_id && profile.team_id === player.teamId;
  const [slot, setSlot] = useState(1);
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState('');
  if (!team || !saved || !jerseys.length) return <p className="dim">Getting dressed...</p>;
  const drip = draft || saved;
  const colors = (jerseys.find((j) => j.slot === slot) || jerseys[0]).colors;
  const changed = draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => { setMsg(''); try { await setDrip(player.id, draft); setDraft(null); setVersion((v) => v + 1); setMsg('✅ Saved.'); } catch (e) { setMsg(e.message); } };
  return (
    <div className="drip-tab">
      <div className="drip-stage">
        <div className="drip-field"><UniformSprite colors={colors} player={player} drip={drip} team={team} scale={4} /></div>
        <div className="drip-side">
          <HelmetCloseup team={team} colors={colors} model={drip.helmet} scale={4} />
          <b>{helmetName(drip.helmet)}</b>
          <div className="drip-kits">{jerseys.map((j) => <button key={j.slot} className={slot === j.slot ? 'on' : ''} onClick={() => setSlot(j.slot)}>{j.name}</button>)}</div>
        </div>
      </div>
      {(commish || mine) && (draft ? (
        <>
          <DripEditor drip={drip} onChange={setDraft} team={team} colors={colors} position={player.position} />
          <div className="drip-actions">
            <button className="btn ghost" onClick={() => setDraft(null)}>Cancel</button>
            {commish ? <button className="btn" disabled={!changed} onClick={save}>Save drip</button>
              : <button className="btn" disabled title="Coming in the next update">Send request (next update)</button>}
          </div>
        </>
      ) : <button className="btn" onClick={() => { setMsg(''); setDraft({ ...saved }); }}>✏️ Edit drip</button>)}
      {!commish && mine && <p className="dim drip-note">Coaches will send drip changes to the commissioner: one change per player every 2 weeks (or 2 offseason steps). You can try looks out in the preview now.</p>}
      {msg && <p className={msg.startsWith('✅') ? 'numreq-sent' : 'form-error'}>{msg}</p>}
    </div>
  );
}
