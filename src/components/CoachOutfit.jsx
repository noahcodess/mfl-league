import React, { useEffect, useState } from 'react';
import { SHIRTS, PANTS, GLASSES, OUTFIT_COLORS, coachLooks } from '../lib/coachLooks.js';
import { saveMyCoach } from '../data/coaches.js';

// Your coach's outfit, kept simple: pick Shirt, Pants or Glasses, then a style and a color. The coach at the top updates live.
export default function CoachOutfit({ coach, team, onPreview, onSaved }) {
  const base = coachLooks(coach, team);
  const start = { shirt: base.shirt, shirtColor: base.shirtColor, pants: base.pants, pantsColor: base.pantsColor, glasses: base.glasses || 'none' };
  const [o, setO] = useState(start);
  const [part, setPart] = useState('shirt');
  const [msg, setMsg] = useState('');
  useEffect(() => { onPreview(o); return () => onPreview(null); }, [o]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => { setO((x) => ({ ...x, [k]: v })); setMsg(''); };
  const changed = Object.keys(start).some((k) => start[k] !== o[k]);
  const save = async () => { try { await saveMyCoach(o); setMsg('Saved ✓'); onSaved?.(); } catch (e) { setMsg(e.message); } };
  const styles = { shirt: SHIRTS, pants: PANTS, glasses: GLASSES }[part];
  const colorKey = { shirt: 'shirtColor', pants: 'pantsColor' }[part];
  return (
    <div className="outfit">
      <div className="seg">
        {[['shirt', '👕 Shirt'], ['pants', '👖 Pants'], ['glasses', '🕶️ Glasses']].map(([k, label]) => <button key={k} className={part === k ? 'on' : ''} onClick={() => setPart(k)}>{label}</button>)}
      </div>
      <div className="spills outfit-styles" key={part}>
        {styles.map(([id, label]) => <button key={id} type="button" className={o[part] === id ? 'on' : ''} onClick={() => set(part, id)}>{label}</button>)}
      </div>
      {colorKey && (
        <div className="ocolors" key={`c-${part}`}>
          {OUTFIT_COLORS.map((c) => <button key={c} type="button" aria-label={c} className={o[colorKey] === c ? 'on' : ''} style={{ background: c }} onClick={() => set(colorKey, c)} />)}
          <button type="button" className={`team-swatch${o[colorKey] === team.color ? ' on' : ''}`} style={{ background: team.color }} onClick={() => set(colorKey, team.color)}>Team</button>
        </div>
      )}
      <p className="dim">Your name, face and hair are set by the commissioner. He gets a notice when you change your outfit.</p>
      {(changed || msg) && (
        <div className="confirm-actions">
          {msg && <span className={msg.startsWith('Saved') ? 'good' : 'bad'}>{msg}</span>}
          {changed && <button className="btn ghost" onClick={() => setO(start)}>Undo</button>}
          {changed && <button className="btn" onClick={save}>Save outfit</button>}
        </div>
      )}
    </div>
  );
}
