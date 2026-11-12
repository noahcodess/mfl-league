import React, { useEffect, useState } from 'react';
import { useStadiums, saveStadium, STAND_STYLES } from '../data/stadiums.js';
import { fontsFor, DESIGNS } from '../lib/endZoneDraw.js';
import EndZonePreview from './EndZonePreview.jsx';

// Commissioner's Desk → Teams → a team → Stadium: name, how many fans it holds, the end zone font and design, and the stands style.
// He changes the end zones directly (coaches send requests from My Team → Customize). The team page shows the result.
export default function StadiumEdit({ team, canControl }) {
  const st = useStadiums()[team.id];
  const [f, setF] = useState(st || {});
  const [msg, setMsg] = useState('');
  useEffect(() => { if (st) setF(st); }, [st]);
  if (!st) return null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const changed = ['name', 'font', 'design', 'style'].some((k) => String(f[k]).trim() !== String(st[k])) || Number(f.capacity) !== st.capacity;
  const save = async () => { setMsg(''); try { await saveStadium(team.id, f); setMsg('✅ Saved. Open the team page to see it.'); } catch (e) { setMsg(e.message); } };
  const sel = (k, opts) => <select value={f[k]} disabled={!canControl} onChange={set(k)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  return (
    <div className="te-stadium">
      <label className="field"><span>🏟️ Stadium name</span><input value={f.name} maxLength={40} disabled={!canControl} onChange={set('name')} /></label>
      <label className="field"><span>Capacity</span><input type="number" min="1000" max="200000" step="500" value={f.capacity} disabled={!canControl} onChange={set('capacity')} /></label>
      <label className="field"><span>End zone font</span>{sel('font', fontsFor(team.id))}</label>
      <label className="field"><span>End zone background</span>{sel('design', DESIGNS)}</label>
      <label className="field"><span>Stands</span>{sel('style', STAND_STYLES)}</label>
      <div style={{ gridColumn: '1 / -1' }}><EndZonePreview team={team} look={f} /></div>
      <button className="btn small" disabled={!canControl || !changed} onClick={save}>Save</button>
      {msg && <small className={msg.startsWith('✅') ? 'num-ok' : 'form-error'} style={{ gridColumn: '1 / -1' }}>{msg}</small>}
    </div>
  );
}
