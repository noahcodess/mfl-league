import React, { useEffect, useState } from 'react';
import { prepareLogo } from '../lib/logoCheck.js';
import { getTeams } from '../data/teams.js';
import { savePlan, uploadPlanLogo, openStadiums, roman } from '../data/craftBowlPlans.js';

// Edit one season's Craft Bowl: upload a logo, pick its two colors, pick the stadium (the ones that hosted within 3 seasons
// are greyed out) or roll the dice. onRoll(season) runs the dice animation on the tile and resolves to the stadium it lands on.
export default function CraftBowlEditor({ plan, plans, stadiums, canControl, onRoll, rolling }) {
  const [draft, setDraft] = useState(plan), [file, setFile] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(plan); setFile(null); setMsg(''); }, [plan.season]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft((d) => ({ ...d, stadium: plan.stadium })); }, [plan.stadium]);   // the dice saves the stadium right away
  const teams = getTeams(), open = new Set(openStadiums(plans, plan.season, teams.map((t) => t.id)));
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const pickFile = async (e) => { setMsg(''); try { const f = await prepareLogo(e.target.files?.[0], { solid: true }); setFile(f); set('logo', f.preview); } catch (err) { setMsg(`⚠️ ${err.message}`); } };
  const roll = async () => { setMsg(''); try { const id = await onRoll(plan.season); if (id) setMsg(`🎲 Landed on ${stadiums[id]?.name || id}. Saved.`); } catch (err) { setMsg(`⚠️ ${err.message}`); } };
  const save = async () => {
    setBusy(true); setMsg('');
    try { const logo = file ? await uploadPlanLogo(plan.season, file.blob) : draft.logo; await savePlan({ ...draft, logo }); setDraft((d) => ({ ...d, logo })); setFile(null); setMsg('✅ Saved'); }
    catch (err) { setMsg(`⚠️ ${err.message}`); }
    setBusy(false);
  };
  const changed = JSON.stringify(draft) !== JSON.stringify(plan);
  return (
    <section className="card cb-edit" style={{ '--cb1': draft.primary, '--cb2': draft.secondary }}>
      <h3>🏆 Craft Bowl {roman(plan.season)} <small className="dim">Season {plan.season}</small></h3>
      <div className="cb-fields">
        <label className="cb-field"><span>🖼️ Logo</span>
          <input type="file" accept="image/*" disabled={!canControl} onChange={pickFile} />
          {draft.logo && <button type="button" className="btn ghost small" disabled={!canControl} onClick={() => { setFile(null); set('logo', null); }}>✕ Remove</button>}
        </label>
        <label className="cb-field"><span>🎨 Primary</span><input type="color" value={draft.primary} disabled={!canControl} onChange={(e) => set('primary', e.target.value)} /><code>{draft.primary}</code></label>
        <label className="cb-field"><span>🎨 Secondary</span><input type="color" value={draft.secondary} disabled={!canControl} onChange={(e) => set('secondary', e.target.value)} /><code>{draft.secondary}</code></label>
        <label className="cb-field cb-where-pick"><span>📍 Stadium</span>
          <select value={draft.stadium || ''} disabled={!canControl || rolling} onChange={(e) => set('stadium', e.target.value || null)}>
            <option value="">Pick a stadium</option>
            {teams.map((t) => <option key={t.id} value={t.id} disabled={!open.has(t.id)}>{stadiums[t.id]?.name || t.name} ({t.code}){open.has(t.id) ? '' : ' · hosted within 3 seasons'}</option>)}
          </select>
          <button type="button" className={`btn cb-dice${rolling ? ' spin' : ''}`} disabled={!canControl || rolling} onClick={roll} title="Pick a random stadium (follows the 3-season rule)">🎲 Randomize</button>
        </label>
      </div>
      <div className="cb-save">
        <button className="btn" disabled={!canControl || busy || rolling || !changed} onClick={save}>{busy ? 'Saving…' : '💾 Save'}</button>
        {changed && <button className="btn ghost" onClick={() => { setDraft(plan); setFile(null); }}>Undo</button>}
        {msg && <span className={msg.startsWith('⚠️') ? 'warn' : 'good'}>{msg}</span>}
      </div>
    </section>
  );
}
