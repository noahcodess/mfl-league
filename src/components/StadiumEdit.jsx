import React, { useEffect, useState } from 'react';
import { useStadiums, saveStadium } from '../data/stadiums.js';

// Commissioner's Desk → Teams → a team → Stadium: rename it and set how many fans it holds.
export default function StadiumEdit({ team, canControl }) {
  const st = useStadiums()[team.id];
  const [name, setName] = useState(st?.name || '');
  const [cap, setCap] = useState(st?.capacity || '');
  const [msg, setMsg] = useState('');
  useEffect(() => { setName(st?.name || ''); setCap(st?.capacity || ''); }, [st?.name, st?.capacity]);
  const changed = st && (name.trim() !== st.name || Number(cap) !== st.capacity);
  const save = async () => { setMsg(''); try { await saveStadium(team.id, name, cap); setMsg('✅ Saved.'); } catch (e) { setMsg(e.message); } };
  return (
    <div className="te-stadium">
      <label className="field"><span>🏟️ Stadium name</span><input value={name} maxLength={40} disabled={!canControl} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span>Capacity</span><input type="number" min="1000" max="200000" step="500" value={cap} disabled={!canControl} onChange={(e) => setCap(e.target.value)} /></label>
      <button className="btn small" disabled={!canControl || !changed} onClick={save}>Save</button>
      {msg && <small className={msg.startsWith('✅') ? 'num-ok' : 'form-error'} style={{ gridColumn: '1 / -1' }}>{msg}</small>}
    </div>
  );
}
