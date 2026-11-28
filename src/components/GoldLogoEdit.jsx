import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { goldLogoFor, uploadGoldLogo, removeGoldLogo, useGoldLogos } from '../data/goldLogos.js';
import { prepareLogo } from '../lib/logoCheck.js';

// Commissioner's Desk → Teams → a team → Gold logo: the logo this team wears in every Craft Bowl it plays (the whole
// broadcast: intro, scorebug, field, graphics). No gold logo = its normal logo. Saves as soon as it's uploaded.
export default function GoldLogoEdit({ team, canControl }) {
  useGoldLogos();
  const gold = goldLogoFor(team), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const pick = async (e) => {
    setMsg(''); setBusy(true);
    try { const f = await prepareLogo(e.target.files?.[0]); await uploadGoldLogo(team.id, f.blob); setMsg('✅ Saved. The Craft Bowl uses it from now on.'); }
    catch (err) { setMsg(`⚠️ ${err.message}`); }
    setBusy(false); e.target.value = '';
  };
  return (
    <div className="te-logo te-gold">
      <div className="te-gold-pair">
        <img src={team.logo} alt="" title="Normal logo" />
        <span>→</span>
        {gold ? <img className="te-gold-img" src={gold} alt="Gold logo" /> : <span className="te-gold-none">No gold logo</span>}
      </div>
      <div><b>🏆 Gold logo (Craft Bowl)</b><small>PNG with a see-through background. Used in every Craft Bowl this team plays. Without one, the normal logo is used.</small></div>
      <label className={`btn small${canControl && !busy ? '' : ' disabled'}`}>{busy ? 'Uploading…' : '📤 Upload gold PNG'}<input type="file" accept="image/png" hidden onChange={pick} disabled={!canControl || busy} /></label>
      {gold && <ConfirmButton className="btn small ghost" label="✕ Remove" disabled={!canControl} title="Remove the gold logo?" yes="Remove it"
        text="The Craft Bowl goes back to this team's normal logo. You can upload again any time." onConfirm={async () => { setMsg(''); try { await removeGoldLogo(team.id); } catch (err) { setMsg(`⚠️ ${err.message}`); } }} />}
      {msg && <small className={msg.startsWith('✅') ? 'num-ok' : 'form-error'}>{msg}</small>}
    </div>
  );
}
