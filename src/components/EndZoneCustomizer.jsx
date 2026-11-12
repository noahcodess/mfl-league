import React, { useEffect, useState } from 'react';
import EndZonePreview from './EndZonePreview.jsx';
import FontChip from './FontChip.jsx';
import { fontsFor, DESIGNS, endZoneWords } from '../lib/endZoneDraw.js';
import { SHADOWS, SHADOW_COLORS } from '../lib/fontShadow.js';
import { useStadiums } from '../data/stadiums.js';
import { usePendingEndZone, requestEndZone } from '../data/endZones.js';

const KEYS = ['font', 'design', 'shadow', 'shadowColor'];
const label = (list, k) => (list.find(([v]) => v === k) || [k, k])[1];
const lookOf = (x) => Object.fromEntries(KEYS.map((k) => [k, x[k]]));

// My Team → Customize → End zones: pick a font, background and shadow, see both end zones, then send it to the commissioner.
export default function EndZoneCustomizer({ team }) {
  const st = useStadiums()[team.id];
  const [version, setVersion] = useState(0);
  const pending = usePendingEndZone(team.id, version);
  const [look, setLook] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (st && !look) setLook(lookOf(st)); }, [st, look]);
  if (!st || !look) return null;
  const fonts = fontsFor(team.id), nick = endZoneWords(team)[1];
  const changed = KEYS.some((k) => look[k] !== st[k]);
  const set = (k, v) => { setMsg(''); setLook((x) => ({ ...x, [k]: v })); };
  const row = (k, list) => (
    <div className="ez-designs">
      {list.map(([v, l]) => <button key={v} type="button" className={`btn small${look[k] === v ? '' : ' ghost'}`} onClick={() => set(k, v)}>{l}</button>)}
    </div>
  );
  const send = async () => {
    setBusy(true); setMsg('');
    try { await requestEndZone(look); setMsg('📨 Request sent to commissioner. Your new end zones go on once he approves.'); setVersion((v) => v + 1); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  };
  return (
    <section className="card ez-custom">
      <header className="numreq-head"><h3>🏁 End zones</h3><span className="dim">{st.name}</span></header>
      <p className="dim">Pick a font, a background and a shadow. The commissioner approves every change, and you'll hear back in your inbox.</p>
      {pending && (
        <p className="numreq-sent">⏳ Waiting on the commissioner: {label(fonts, pending.font)} font, {label(DESIGNS, pending.design)} background, {label(SHADOWS, pending.shadow)} shadow. Sending a new one replaces it.</p>
      )}
      <EndZonePreview team={team} look={look} label={changed ? 'Your new end zones' : 'Your end zones now'} />
      <h4>Font</h4>
      <div className="ez-chips">
        {fonts.map(([k, l, only]) => <FontChip key={k} team={team} word={nick} font={k} look={look} label={l} exclusive={!!only} active={look.font === k} onClick={() => set('font', k)} />)}
      </div>
      <h4>Background</h4>
      {row('design', DESIGNS)}
      <h4>Shadow</h4>
      {row('shadow', SHADOWS)}
      {look.shadow !== 'none' && <><h4 className="ez-sub">Shadow color</h4>{row('shadowColor', SHADOW_COLORS)}</>}
      <div className="ez-actions">
        <button className="btn" disabled={!changed || busy} onClick={send}>Send to commissioner</button>
        {changed && <button className="btn ghost" onClick={() => setLook(lookOf(st))}>Undo</button>}
        <small className="dim">Nothing changes until he approves it.</small>
      </div>
      {msg && <p className={msg.startsWith('📨') ? 'numreq-sent' : 'form-error'}>{msg}</p>}
    </section>
  );
}
