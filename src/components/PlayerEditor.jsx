import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { getTeams, getTeam } from '../data/teams.js';
import { contractOf, yearsLeft } from '../data/contracts.js';
import { OFFENSE, DEFENSE } from '../data/positions.js';
import { updatePlayer, playerPotential } from '../data/commishEdit.js';
import { MOODS, MOOD_NAMES, forceTradeRequest } from '../data/morale.js';

const HALVES = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);

// Commissioner: edit anything about one player. Bio, stars and potential, team (or release), depth, number and contract.
// Only the fields he changes are sent. Setting stars by hand counts as a correction, so it also resets his peak.
export default function PlayerEditor({ player, canControl, onClose, onSaved }) {
  const c = contractOf(player);
  const start = {
    name: player.name, number: player.number ?? '', position: player.position, age: player.age ?? '', stars: player.stars, potential: '',
    feet: player.height ? Math.floor(player.height / 12) : 6, inches: player.height ? player.height % 12 : 0, weight_lb: player.weight ?? '',
    mood: player.mood || 'normal', team: player.teamId || '', depth: player.depth || 'backup', per_year: c?.perYear ?? '', years_left: c ? Math.max(1, yearsLeft(player)) : 1,
  };
  const [f, setF] = useState(start);
  const [pot, setPot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { playerPotential(player.id).then((v) => { setPot(v); setF((x) => ({ ...x, potential: v ?? '' })); }); }, [player.id]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const team = getTeam(f.team);

  const changes = () => {
    const out = {};
    const num = (k) => (f[k] === '' ? null : Number(f[k]));
    if (f.name.trim() !== player.name) out.name = f.name.trim();
    if (f.position !== player.position) out.position = f.position;
    if (num('age') !== (player.age ?? null)) out.age = num('age');
    if (Number(f.stars) !== player.stars) out.stars = Number(f.stars);
    if (f.potential !== '' && Number(f.potential) !== pot) out.potential = Number(f.potential);
    const h = Number(f.feet) * 12 + Number(f.inches);
    if (h !== (player.height ?? 0)) out.height_in = h;
    if (num('weight_lb') !== (player.weight ?? null)) out.weight_lb = num('weight_lb');
    if (f.mood !== (player.mood || 'normal')) out.mood = f.mood;
    if (f.team !== (player.teamId || '')) out.team = f.team;
    if (f.team && num('number') !== (player.number ?? null) && f.number !== '') out.number = num('number');
    if (f.team && f.depth !== (player.depth || 'backup')) out.depth = f.depth;
    if (f.team && c && num('per_year') !== c.perYear) out.per_year = num('per_year');
    if (f.team && c && Number(f.years_left) !== Math.max(1, yearsLeft(player))) out.years_left = Number(f.years_left);
    if (f.team && !c && f.per_year !== '') { out.per_year = num('per_year'); out.years_left = Number(f.years_left); }
    return out;
  };
  const save = async (fields) => {
    setBusy(true);
    setError('');
    try { await updatePlayer(player.id, fields); await onSaved?.(); onClose(); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  const ch = changes();

  return (
    <Modal onClose={onClose} className="player-editor" style={{ '--team': team?.color || '#555' }}>
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <div className="pe-head">
        <Headshot player={{ ...player, number: f.number === '' ? player.number : Number(f.number) }} team={team} size={88} />
        <div><small>{team ? team.name : 'Free agent'} · {f.position}</small><h2>{f.name || player.name}</h2>
          <StarRating value={Number(f.stars)} peak={player.peakStars} showNumber /></div>
      </div>
      <fieldset className="pe-grid" disabled={!canControl}>
        <label className="field wide"><span>Name</span><input value={f.name} onChange={set('name')} maxLength={40} /></label>
        <label className="field"><span>Position</span><select value={f.position} onChange={set('position')}>{[...OFFENSE, ...DEFENSE].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field"><span>Age</span><input type="number" min="18" max="40" value={f.age} onChange={set('age')} /></label>
        <label className="field"><span>Stars</span><select value={f.stars} onChange={set('stars')}>{HALVES.map((s) => <option key={s} value={s}>{s.toFixed(1)}</option>)}</select></label>
        <label className="field"><span>Potential</span><select value={f.potential} onChange={set('potential')}><option value="">Not rated</option>{HALVES.map((s) => <option key={s} value={s}>{s.toFixed(1)}</option>)}</select></label>
        <label className="field"><span>Height</span><span className="pe-height"><input type="number" min="5" max="7" value={f.feet} onChange={set('feet')} />ft<input type="number" min="0" max="11" value={f.inches} onChange={set('inches')} />in</span></label>
        <label className="field"><span>Weight (lbs)</span><input type="number" min="150" max="400" value={f.weight_lb} onChange={set('weight_lb')} /></label>
        <label className="field wide"><span>Team</span><select value={f.team} onChange={set('team')}><option value="">Free agent (release him)</option>{getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        {f.team && <>
          <label className="field"><span>Number</span><input type="number" min="0" max="99" value={f.number} onChange={set('number')} /></label>
          <label className="field"><span>Mood</span><select value={f.mood} onChange={set('mood')}>{MOODS.map((m) => <option key={m} value={m}>{MOOD_NAMES[m]}</option>)}</select></label>
          <label className="field"><span>Depth</span><select value={f.depth} onChange={set('depth')}><option value="starter">Starter</option><option value="backup">Backup</option></select></label>
          <label className="field"><span>Salary / year ($)</span><input type="number" min="10000" step="5000" value={f.per_year} onChange={set('per_year')} /></label>
          <label className="field"><span>Seasons left</span><select value={f.years_left} onChange={set('years_left')}>{[1, 2, 3].map((y) => <option key={y}>{y}</option>)}</select></label>
        </>}
      </fieldset>
      {ch.stars != null && player.peakStars > player.stars && <p className="dim">Setting stars by hand clears his red (regression) stars and makes this his new peak.</p>}
      {ch.years_left != null && <p className="dim">Changing seasons left starts a fresh contract term this season.</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        {player.teamId && <ConfirmButton className="btn ghost danger" label="Release" disabled={!canControl || busy} title={`Release ${player.name}?`} yes="Release him"
          text="His contract ends and he becomes a free agent right away." onConfirm={() => save({ team: '' })} />}
        {player.teamId && <ConfirmButton className="btn ghost" label="📣 Make him ask out" disabled={!canControl || busy} title={`Make ${player.name} ask for a trade?`} yes="Do it"
          text="He goes on his team's trade block, locked. If he isn't traded by the deadline, he's cut. You can call it off in the Trades tab."
          onConfirm={async () => { setError(''); try { await forceTradeRequest(player.id); await onSaved?.(); onClose(); } catch (err) { setError(err.message); } }} />}
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={!canControl || busy || !Object.keys(ch).length} onClick={() => save(ch)}>{busy ? 'Saving...' : `Save${Object.keys(ch).length ? ` (${Object.keys(ch).length})` : ''}`}</button>
      </div>
    </Modal>
  );
}
