import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Tabs from './Tabs.jsx';
import CoachSprite from './CoachSprite.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { SKINS, HAIR } from '../lib/portraitLooks.js';
import { SHIRTS, PANTS, GLASSES, OUTFIT_COLORS, coachLooks } from '../lib/coachLooks.js';
import { COACH_RATINGS, coachStars, saveCoach } from '../data/coaches.js';

const STYLES = ['short', 'messy', 'side', 'curtains', 'crew', 'buzz', 'fade', 'spiky', 'curly', 'waves', 'flattop', 'hightop', 'afro', 'twists',
  'braids', 'locs', 'mohawk', 'manbun', 'mullet', 'long', 'bald'];
const FACE = [
  ['head', 'Face shape', ['oval', 'wide', 'narrow', 'square', 'long']],
  ['eyeShape', 'Eyes', ['normal', 'wide', 'narrow', 'close']],
  ['brows', 'Brows', ['normal', 'thick', 'thin', 'angled']],
  ['nose', 'Nose', ['normal', 'small', 'big', 'wide']],
  ['mouth', 'Mouth', ['neutral', 'smile', 'smirk', 'frown']],
  ['beard', 'Facial hair', ['none', 'stubble', 'beard', 'goatee', 'mustache', 'chinstrap']],
];
const EYE_COLORS = ['#3b2414', '#5a3a22', '#7a5a32', '#4f7fa8', '#5f8f6a', '#7d8a90'];

// Commissioner's coach maker: build any coach's look (skin, hair, face, outfit), name, 5 ratings and potential, with a live preview.
export default function CoachEditor({ coach, team, onClose, onSaved }) {
  const [L, setL] = useState(() => coachLooks(coach, team));
  const [name, setName] = useState(coach.name);
  const [r, setR] = useState(() => ({ ...coach.ratings }));
  const [pot, setPot] = useState(Number(coach.potential));
  const set = (k, v) => setL((x) => ({ ...x, [k]: v }));
  const chips = (k, list, label = (v) => v) => (
    <div className="echips">{list.map((v) => <button key={v} type="button" className={L[k] === v ? 'on' : ''} onClick={() => set(k, v)}>{label(v)}</button>)}</div>
  );
  const swatches = (k, list) => (
    <div className="ocolors">{list.map((c) => <button key={c} type="button" aria-label={c} className={L[k] === c ? 'on' : ''} style={{ background: c }} onClick={() => set(k, c)} />)}</div>
  );
  const save = async () => {
    const { shirt, shirtColor, pants, pantsColor, glasses, skin, hair, style, head, eyes, eyeShape, brows, nose, mouth, beard, freckles, earring } = L;
    await saveCoach(team.id, name, { shirt, shirtColor, pants, pantsColor, glasses, skin, hair, style, head, eyes, eyeShape, brows, nose, mouth, beard, freckles, earring },
      Object.fromEntries(COACH_RATINGS.map(([k]) => [k, Math.max(1, Math.min(99, Number(r[k]) || 50))])), pot);
    onSaved?.(); onClose();
  };
  return (
    <Modal onClose={onClose} className="coach-editor" style={{ '--team': team.color, '--team-accent': team.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="ceditor">
        <div className="ceditor-preview">
          <div className="coach-stage"><CoachSprite coach={coach} team={team} looks={L} height={224} bob /></div>
          <label className="oname"><span>First name</span><input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></label>
          <div className="dim">{team.name} · {coachStars(r)}★ now · {pot}★ potential</div>
        </div>
        <div className="ceditor-tabs">
          <Tabs tabs={[
            { key: 'face', label: 'Face & hair', render: () => (
              <div>
                <h4>Skin tone</h4>{swatches('skin', SKINS)}
                <h4>Hairstyle</h4>{chips('style', STYLES)}
                <h4>Hair color</h4>{swatches('hair', Object.values(HAIR))}
                <h4>Eye color</h4>{swatches('eyes', EYE_COLORS)}
                {FACE.map(([k, label, list]) => <div key={k}><h4>{label}</h4>{chips(k, list)}</div>)}
                <h4>Extras</h4>
                <div className="echips">
                  <button type="button" className={L.freckles ? 'on' : ''} onClick={() => set('freckles', !L.freckles)}>Freckles</button>
                  <button type="button" className={L.earring ? 'on' : ''} onClick={() => set('earring', !L.earring)}>Earring</button>
                </div>
              </div>
            ) },
            { key: 'outfit', label: 'Outfit', render: () => (
              <div>
                <h4>Shirt</h4>{chips('shirt', SHIRTS.map(([k]) => k), (k) => SHIRTS.find(([x]) => x === k)[1])}{swatches('shirtColor', [...OUTFIT_COLORS, team.color])}
                <h4>Pants</h4>{chips('pants', PANTS.map(([k]) => k), (k) => PANTS.find(([x]) => x === k)[1])}{swatches('pantsColor', [...OUTFIT_COLORS, team.color])}
                <h4>Glasses</h4>{chips('glasses', GLASSES.map(([k]) => k), (k) => GLASSES.find(([x]) => x === k)[1])}
              </div>
            ) },
            { key: 'ratings', label: 'Ratings', render: () => (
              <div className="eratings">
                {COACH_RATINGS.map(([k, label]) => (
                  <label key={k}><span>{label}</span><input type="range" min="1" max="99" value={r[k] ?? 50} onChange={(e) => setR((x) => ({ ...x, [k]: Number(e.target.value) }))} /><b>{r[k] ?? 50}</b></label>
                ))}
                <label><span>Potential</span><select value={pot} onChange={(e) => setPot(Number(e.target.value))}>{[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => <option key={v} value={v}>{v}★</option>)}</select></label>
              </div>
            ) },
          ]} />
        </div>
      </div>
      <div className="confirm-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <ConfirmButton label="Save coach" title={`Save Coach ${name}?`} yes="Save" text="His look, name, ratings and potential update everywhere on the site." onConfirm={save} />
      </div>
    </Modal>
  );
}
