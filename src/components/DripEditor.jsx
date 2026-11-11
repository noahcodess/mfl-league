import React from 'react';
import HelmetCloseup from './HelmetCloseup.jsx';
import { HELMETS } from '../data/drip.js';
import { dripColor } from '../lib/uniformGear.js';

const SIDES = [['none', 'None'], ['right', 'Right'], ['left', 'Left'], ['both', 'Both']];
const TOKENS = [['jersey', 'Team'], ['trim', 'Trim'], ['white', 'White'], ['black', 'Black']];

function Choice({ label, value, options, onChange }) {
  return (
    <div className="drip-row"><span>{label}</span>
      <div className="drip-opts">{options.map(([v, l]) => <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>
    </div>
  );
}
function Colors({ label, value, colors, onChange, allowNone }) {
  return (
    <div className="drip-row"><span>{label}</span>
      <div className="drip-swatches">
        {allowNone && <button className={!value || value === 'none' ? 'on none' : 'none'} onClick={() => onChange('none')}>None</button>}
        {TOKENS.map(([t, l]) => <button key={t} title={l} className={value === t ? 'on' : ''} style={{ background: dripColor(t, colors) }} onClick={() => onChange(t)} />)}
      </div>
    </div>
  );
}

// Every drip option with buttons: the four helmets (with a mini close-up each), undershirt, arm sleeves, gloves,
// QB play sheet, pants, compression shorts and leg sleeves. Colors come from the uniform so drip matches every jersey.
export default function DripEditor({ drip, onChange, team, colors, position }) {
  const set = (k) => (v) => onChange({ ...drip, [k]: v });
  return (
    <div className="drip-editor">
      <div className="drip-helmets">
        {HELMETS.map(([id, name]) => (
          <button key={id} className={`drip-helmet${drip.helmet === id ? ' on' : ''}`} onClick={() => set('helmet')(id)}>
            <HelmetCloseup team={team} colors={colors} model={id} scale={2} /><b>{name}</b>
          </button>
        ))}
      </div>
      <Choice label="Undershirt" value={drip.undershirt} options={[['none', 'None'], ['short', 'Peeking out'], ['long', 'Long sleeve']]} onChange={set('undershirt')} />
      {drip.undershirt !== 'none' && <Colors label="Undershirt color" value={drip.undershirtColor} colors={colors} onChange={set('undershirtColor')} />}
      <Choice label="Arm sleeves" value={drip.sleeves} options={SIDES} onChange={set('sleeves')} />
      {drip.sleeves !== 'none' && <>
        <Choice label="Sleeve style" value={drip.sleeveStyle} options={[['solid', 'Solid'], ['stripe', 'Stripe'], ['two_tone', 'Two-tone']]} onChange={set('sleeveStyle')} />
        <Colors label="Sleeve color" value={drip.sleeveColor} colors={colors} onChange={set('sleeveColor')} />
        {drip.sleeveStyle !== 'solid' && <Colors label="Second color" value={drip.sleeveColor2} colors={colors} onChange={set('sleeveColor2')} />}
      </>}
      <Choice label="Gloves" value={drip.gloves} options={SIDES} onChange={set('gloves')} />
      {drip.gloves !== 'none' && <Colors label="Glove color" value={drip.gloveColor} colors={colors} onChange={set('gloveColor')} />}
      {position === 'QB' && <Choice label="Play sheet" value={drip.playsheet ? 'yes' : 'no'} options={[['no', 'None'], ['yes', 'On his left wrist']]} onChange={(v) => set('playsheet')(v === 'yes')} />}
      <Choice label="Pants" value={drip.pants} options={[['classic', 'Classic (to the knee)'], ['short', 'Short']]} onChange={set('pants')} />
      {drip.pants === 'short' && <Colors label="Compression shorts" value={drip.compression} colors={colors} onChange={set('compression')} allowNone />}
      <Choice label="Leg sleeves" value={drip.legSleeves} options={SIDES} onChange={set('legSleeves')} />
      {drip.legSleeves !== 'none' && <Colors label="Leg sleeve color" value={drip.legColor} colors={colors} onChange={set('legColor')} />}
    </div>
  );
}
