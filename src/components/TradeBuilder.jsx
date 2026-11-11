import React, { useState } from 'react';
import Modal from './Modal.jsx';
import TeamBadge from './TeamBadge.jsx';
import TradeColumn from './TradeColumn.jsx';
import { getTeams, getTeam, capLimit } from '../data/teams.js';
import { teamCapUsed } from '../data/players.js';
import { capHitOf } from '../data/contracts.js';
import { teamAssets, proposeTrade, useTradeMarks } from '../data/trades.js';
import { money } from '../lib/format.js';

const MAX = 5;
const pay = (list) => list.reduce((s, x) => s + (x.position ? capHitOf(x) : 0), 0);
const heads = (list) => list.filter((x) => x.position).length;

// Build a trade: pick a team, tap up to 5 things a side, check the cap and roster effect, add a note, send.
export default function TradeBuilder({ myTeamId, partnerId, withPlayer, onClose, onSent }) {
  const [partner, setPartner] = useState(partnerId || null);
  const [give, setGive] = useState([]);
  const [get, setGet] = useState(withPlayer ? [withPlayer] : []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const marks = useTradeMarks();
  const me = getTeam(myTeamId);
  const them = partner ? getTeam(partner) : null;
  const toggle = (setter) => (x) => setter((list) => (list.some((c) => c.id === x.id) ? list.filter((c) => c.id !== x.id) : [...list, x]));

  if (!partner) {
    return (
      <Modal onClose={onClose} className="trade-modal">
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <h2>🔁 New trade: pick a team</h2>
        <div className="tpick-grid">
          {getTeams().filter((t) => t.id !== myTeamId).map((t) => (
            <button key={t.id} className="tpick" style={{ '--team': t.color }} onClick={() => setPartner(t.id)}><TeamBadge team={t} size="md" /><span>{t.name}</span></button>
          ))}
        </div>
      </Modal>
    );
  }
  const myCap = teamCapUsed(myTeamId) - pay(give) + pay(get);
  const theirCap = teamCapUsed(partner) - pay(get) + pay(give);
  const myRoster = teamAssets(myTeamId).players.length - heads(give) + heads(get);
  const theirRoster = teamAssets(partner).players.length - heads(get) + heads(give);
  const send = async () => {
    setBusy(true); setErr('');
    try { await proposeTrade(partner, give, get, note); onSent?.(); onClose(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal onClose={() => !busy && onClose()} className="trade-modal wide">
      <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
      <h2>🔁 Trade with the {them.name} {!partnerId && <button className="btn small ghost" onClick={() => { setPartner(null); setGet([]); }}>Change team</button>}</h2>
      {!marks.open && <p className="notice bad">Trading is closed right now. You can still build it; sending will be refused until it opens.</p>}
      <div className="tcols">
        <TradeColumn title={`You send (${me?.code})`} team={me} assets={teamAssets(myTeamId)} chosen={give} max={MAX} onToggle={toggle(setGive)} untouchables={marks.untouchables} block={marks.block} />
        <div className="tswap">⇄</div>
        <TradeColumn title={`You get (${them.code})`} team={them} assets={teamAssets(partner)} chosen={get} max={MAX} onToggle={toggle(setGet)} untouchables={marks.untouchables} block={marks.block} lockUntouchables />
      </div>
      <div className="timpact">
        <span className={myCap > capLimit() ? 'bad' : ''}>Your cap after: <b>{money(myCap)}</b> / {money(capLimit())}</span>
        <span className={theirCap > capLimit() ? 'bad' : ''}>Their cap after: <b>{money(theirCap)}</b></span>
        <span className={myRoster > 45 ? 'bad' : ''}>Your roster: <b>{myRoster}</b>/45</span>
        <span className={theirRoster > 45 ? 'bad' : ''}>Their roster: <b>{theirRoster}</b>/45</span>
      </div>
      <textarea className="tnote" maxLength={300} placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="notice bad">{err}</p>}
      <div className="confirm-actions">
        <button className="btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn send-trade" disabled={busy || !give.length || !get.length} onClick={send}>{busy ? 'Sending...' : `Send trade to the ${them.name}`}</button>
      </div>
    </Modal>
  );
}
