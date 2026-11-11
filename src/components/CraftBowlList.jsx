import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { useCraftBowls, saveCraftBowl, deleteCraftBowl, trophyImg } from '../data/craftBowls.js';
import { getTeams, getTeam } from '../data/teams.js';

const EMPTY = { id: null, season: '', champion: '', runnerUp: '', coach: '', score: '', mvp: '' };

// Commissioner's Desk → Teams → Craft Bowl history: add, fix or remove a champion (season, runner-up, winning coach, score, MVP).
// Coach titles count by the coach's name, so type it the way it shows on his card.
export default function CraftBowlList({ canControl }) {
  const bowls = useCraftBowls() || [];
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => { setErr(''); try { await saveCraftBowl(f); setF(null); } catch (e) { setErr(e.message); } };
  return (
    <section className="cbl">
      <h3><img src={trophyImg()} alt="" height="26" /> Craft Bowl history</h3>
      <p className="dim">Feeds the trophies on team pages and coach cards, the League feed, and player pride. Once the Craft Bowl is played on the site, the winner will be added on its own.</p>
      <ul className="cbl-list">
        {bowls.map((b) => (
          <li key={b.id}>
            <span className="cb-season">{b.season ? `S${b.season}` : 'S?'}</span>
            {getTeam(b.champion) && <TeamBadge team={getTeam(b.champion)} size="sm" />}
            <span><b>{getTeam(b.champion)?.name}</b><small>{[b.runnerUp && `beat ${getTeam(b.runnerUp)?.name}`, b.coach && `Coach ${b.coach}`, b.score].filter(Boolean).join(' · ') || 'Add the details'}</small></span>
            <button className="btn small ghost" disabled={!canControl} onClick={() => setF({ ...EMPTY, ...b, season: b.season ?? '', runnerUp: b.runnerUp || '', coach: b.coach || '', score: b.score || '', mvp: b.mvp || '' })}>Edit</button>
            <ConfirmButton className="btn small ghost danger" label="✕" disabled={!canControl} title="Remove this Craft Bowl?" yes="Remove" text="The trophy comes off the team and coach." onConfirm={() => deleteCraftBowl(b.id)} />
          </li>
        ))}
      </ul>
      {f ? (
        <div className="cbl-form">
          <label className="field"><span>Season</span><input type="number" min="1" max="99" placeholder="?" value={f.season} onChange={set('season')} /></label>
          <label className="field"><span>Champion</span><select value={f.champion} onChange={set('champion')}><option value="">Pick a team</option>{getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field"><span>Runner-up</span><select value={f.runnerUp} onChange={set('runnerUp')}><option value="">Unknown</option>{getTeams().map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field"><span>Winning coach</span><input value={f.coach} maxLength={30} placeholder="Noah" onChange={set('coach')} /></label>
          <label className="field"><span>Score</span><input value={f.score} maxLength={20} placeholder="28-21" onChange={set('score')} /></label>
          <label className="field"><span>MVP</span><input value={f.mvp} maxLength={40} onChange={set('mvp')} /></label>
          {err && <p className="form-error">{err}</p>}
          <div className="cbl-actions"><button className="btn ghost small" onClick={() => setF(null)}>Cancel</button><button className="btn small" disabled={!f.champion} onClick={save}>Save</button></div>
        </div>
      ) : <button className="btn small" disabled={!canControl} onClick={() => setF(EMPTY)}>+ Add a Craft Bowl</button>}
    </section>
  );
}
