import React, { useState } from 'react';
import Modal from './Modal.jsx';
import TeamBadge from './TeamBadge.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import TeamJerseys from './TeamJerseys.jsx';
import { getConferences } from '../data/teams.js';
import { logoFor } from '../data/logos.js';
import { updateTeam, uploadTeamLogo, resetTeamLogo } from '../data/commishEdit.js';
import { prepareLogo } from '../lib/logoCheck.js';

// Commissioner: edit one team. Location + team name (the full name is both: Ocean Monument + Guardians), abbreviation,
// conference, colors, the logo (PNG with a see-through background) and the four jerseys.
export default function TeamEditor({ team, canControl, onClose, onSaved }) {
  const split = (team.name || '').match(/^(.*)\s(\S+)$/) || [null, team.name, ''];
  const [f, setF] = useState({ location: team.location || split[1], nickname: team.nickname || split[2], code: team.code, conference: team.conference, color: team.color, accent: team.accent });
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) : e.target.value }));
  const name = `${f.location} ${f.nickname}`.trim();
  const preview = { ...team, ...f, name, logo: logo?.preview || team.logo };
  const custom = !!team.logoUrl;

  const pick = async (e) => {
    setError('');
    try { setLogo(await prepareLogo(e.target.files?.[0])); } catch (err) { setLogo(null); setError(err.message); }
    e.target.value = '';
  };
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateTeam(team.id, f);
      if (logo) await uploadTeamLogo(team.id, logo.blob);
      await onSaved?.();
      onClose();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <Modal onClose={onClose} className="team-editor" style={{ '--team': f.color, '--team-accent': f.accent }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="te-preview"><TeamBadge team={preview} size="lg" /><div><small>{f.code || '???'} · {f.conference}</small><h2>{name || 'Team name'}</h2></div></div>
      <div className="te-grid">
        <label className="field"><span>Location</span><input value={f.location} onChange={set('location')} maxLength={28} placeholder="Ocean Monument" disabled={!canControl} /></label>
        <label className="field"><span>Team name</span><input value={f.nickname} onChange={set('nickname')} maxLength={20} placeholder="Guardians" disabled={!canControl} /></label>
        <label className="field"><span>Abbreviation</span><input value={f.code} onChange={set('code')} disabled={!canControl} /></label>
        <label className="field"><span>Conference</span>
          <select value={f.conference} onChange={set('conference')} disabled={!canControl}>{getConferences().map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field"><span>Main color</span><span className="te-color"><input type="color" value={f.color} onChange={set('color')} disabled={!canControl} /><code>{f.color}</code></span></label>
        <label className="field"><span>Accent color</span><span className="te-color"><input type="color" value={f.accent} onChange={set('accent')} disabled={!canControl} /><code>{f.accent}</code></span></label>
      </div>
      <div className="te-logo">
        <div><b>Logo</b><small>PNG with a see-through background. It replaces the current logo everywhere on the site.</small></div>
        <label className={`btn small${canControl ? '' : ' disabled'}`}>📤 Upload PNG<input type="file" accept="image/png" hidden onChange={pick} disabled={!canControl} /></label>
        {(custom || logo) && logoFor(team.id) && (
          <ConfirmButton className="btn small ghost" label="↩ Original logo" disabled={!canControl} title="Go back to the original logo?" yes="Use the original"
            text="The uploaded logo stops showing. You can upload again any time."
            onConfirm={async () => { if (logo) setLogo(null); else { await resetTeamLogo(team.id); await onSaved?.(); onClose(); } }} />
        )}
        {logo && <span className="te-new">✅ New logo ready. Save to use it.</span>}
      </div>
      <TeamJerseys team={team} canControl={canControl} />
      {f.code !== team.code && <p className="dim">Changing the abbreviation also renames all of this team's draft picks.</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={!canControl || busy} onClick={save}>{busy ? 'Saving...' : 'Save team'}</button>
      </div>
    </Modal>
  );
}
