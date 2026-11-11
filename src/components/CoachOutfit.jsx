import React, { useEffect, useState } from 'react';
import CoachSprite from './CoachSprite.jsx';
import { SHIRTS, PANTS, GLASSES, OUTFIT_COLORS, coachLooks } from '../lib/coachLooks.js';
import { saveMyCoach } from '../data/coaches.js';

// Your coach's outfit: 6 shirts, 6 pants, colors, glasses, and his name. The sprite above updates as you pick; Save keeps it.
export default function CoachOutfit({ coach, team, onPreview, onSaved }) {
  const base = coachLooks(coach, team);
  const [o, setO] = useState({ shirt: base.shirt, shirtColor: base.shirtColor, pants: base.pants, pantsColor: base.pantsColor, glasses: base.glasses || 'none' });
  const [name, setName] = useState(coach.name);
  const [msg, setMsg] = useState('');
  useEffect(() => { onPreview(o); return () => onPreview(null); }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => { setO((x) => ({ ...x, [k]: v })); setMsg(''); };
  const save = async () => {
    try { await saveMyCoach(name, o); setMsg('Saved ✓'); onSaved?.(); } catch (e) { setMsg(e.message); }
  };
  const pickRow = (list, key) => (
    <div className="opick">
      {list.map(([id, label]) => (
        <button key={id} type="button" className={o[key] === id ? 'on' : ''} onClick={() => set(key, id)}>
          {key !== 'glasses' && <CoachSprite coach={coach} team={team} looks={{ ...o, [key]: id }} height={56} />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
  const colors = (key) => (
    <div className="ocolors">{OUTFIT_COLORS.map((c) => <button key={c} type="button" aria-label={c} className={o[key] === c ? 'on' : ''} style={{ background: c }} onClick={() => set(key, c)} />)}
      <button type="button" className={`team-swatch${o[key] === team.color ? ' on' : ''}`} style={{ background: team.color }} onClick={() => set(key, team.color)}>Team</button></div>
  );
  return (
    <div className="outfit">
      <label className="oname"><span>Coach name</span><input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></label>
      <h4>Shirt</h4>{pickRow(SHIRTS, 'shirt')}{colors('shirtColor')}
      <h4>Pants</h4>{pickRow(PANTS, 'pants')}{colors('pantsColor')}
      <h4>Glasses</h4>{pickRow(GLASSES, 'glasses')}
      <p className="dim">Face and hair are set by the commissioner.</p>
      <div className="confirm-actions">{msg && <span className={msg.startsWith('Saved') ? 'good' : 'bad'}>{msg}</span>}<button className="btn" onClick={save}>Save outfit</button></div>
    </div>
  );
}
