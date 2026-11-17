import React, { useState } from 'react';
import Modal from './Modal.jsx';
import HoldButton from './HoldButton.jsx';
import { getTeam } from '../data/teams.js';
import { simGameNow } from '../data/gameResults.js';

// "Finish last week first": before a game can be played, every game from earlier weeks must be final. Two hard warnings
// (what's unplayed, then a press-and-hold), then those games are quick-simmed one by one and the original action carries on.
export function useWeekGate(game, season) {
  const [step, setStep] = useState(0), [next, setNext] = useState(null), [log, setLog] = useState([]), [err, setErr] = useState('');
  const left = season && !season.sample ? season.weeks.filter((w) => w.week < game.week).flatMap((w) => w.games).filter((g) => g.status !== 'final') : [];
  const weeks = [...new Set(left.map((g) => g.week))];
  const run = (go) => { if (!left.length) { go(); return; } setNext(() => go); setLog([]); setErr(''); setStep(1); };
  const simAll = async () => {
    setStep(3);
    for (const g of left) {
      try { const { result } = await simGameNow(g.id, g.home, g.away, 'auto'); setLog((l) => [...l, { g, s: result.score }]); }
      catch (e) { setErr(`${getTeam(g.away)?.code} at ${getTeam(g.home)?.code}: ${e.message}`); return; }
    }
    setStep(0); next?.();
  };
  const name = (id) => getTeam(id)?.name || id;
  const ui = (
    <>
      {step === 1 && (
        <Modal onClose={() => setStep(0)} className="confirm-modal gate-modal">
          <h2>⛔ {weeks.length > 1 ? `Weeks ${weeks.join(' & ')} aren't` : `Week ${weeks[0]} isn't`} finished</h2>
          <p>Every game from earlier weeks has to be played before Week {game.week}. {left.length === 1 ? 'This one is' : `These ${left.length} are`} still unplayed:</p>
          <ul className="gate-list">{left.map((g) => <li key={g.id}><small>Wk {g.week}</small> {name(g.away)} <i>at</i> {name(g.home)}</li>)}</ul>
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Go play them</button><button className="btn danger" onClick={() => setStep(2)}>Sim them instead</button></div>
        </Modal>
      )}
      {step === 2 && (
        <Modal onClose={() => setStep(0)} className="confirm-modal gate-modal">
          <h2>⚠️ Last warning</h2>
          <p>{left.length === 1 ? 'That game' : `All ${left.length} games`} will be quick-simmed right now. No broadcast, no coaching rooms, and the results are <b>final</b>: records and stats can't be changed.</p>
          <div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Cancel</button><HoldButton onDone={simAll}>Hold to sim {left.length}</HoldButton></div>
        </Modal>
      )}
      {step === 3 && (
        <Modal onClose={() => err && setStep(0)} className="confirm-modal gate-modal">
          <h2>⚡ Simming {log.length}/{left.length}</h2>
          <div className="qs-bar gate-bar"><i style={{ width: `${(log.length / left.length) * 100}%`, animation: 'none' }} /></div>
          {log.length > 0 && <ul className="gate-list">{log.map(({ g, s }) => <li key={g.id} className="done"><small>Wk {g.week}</small> {getTeam(g.away)?.code} <b>{s.away}</b> <i>at</i> {getTeam(g.home)?.code} <b>{s.home}</b> ✅</li>)}</ul>}
          {err && <><p className="notice bad">{err}</p><div className="confirm-actions"><button className="btn ghost" onClick={() => setStep(0)}>Close</button></div></>}
        </Modal>
      )}
    </>
  );
  return { run, ui, blocked: left.length };
}
