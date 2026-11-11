import React, { useState } from 'react';
import { useTradeMarks, toggleUntouchable, toggleTradeBlock, openTradeBuilder } from '../data/trades.js';
import NumberRequest from './NumberRequest.jsx';

// Buttons on a player card. Your player: untouchable (max 2), trade block, ask for a new number; locked if he asked out. Someone else's: "Trade for him" (not if he's untouchable).
export default function TradeActions({ player, myTeamId, onDone }) {
  const [version, setVersion] = useState(0);
  const [err, setErr] = useState('');
  const marks = useTradeMarks(version);
  if (!myTeamId || !player.teamId) return null;
  const untouchable = marks.untouchables.has(player.id);
  const onBlock = marks.block.has(player.id);
  const wantsOut = marks.requests.has(player.id);
  const run = async (fn) => { setErr(''); try { await fn(player.id); setVersion((v) => v + 1); } catch (e) { setErr(e.message); } };
  if (player.teamId !== myTeamId) {
    return (
      <div className="pcard-actions">
        {untouchable ? <span className="dim">🔒 Untouchable: his team won't trade him.</span>
          : <button className="btn" onClick={() => { onDone?.(); openTradeBuilder({ teamId: player.teamId, player }); }}>🔁 Trade for him{wantsOut ? ' (he wants out)' : onBlock ? ' (on the block)' : ''}</button>}
      </div>
    );
  }
  return (
    <div className="pcard-actions">
      {wantsOut ? <span className="pcard-locked">📣 He asked for a trade. Locked on the block until he's traded (or cut at the deadline).</span> : <>
        <button className={`btn ghost${untouchable ? ' on' : ''}`} onClick={() => run(toggleUntouchable)}>{untouchable ? '🔒 Untouchable' : '🔓 Make untouchable'}</button>
        <button className={`btn ghost${onBlock ? ' on' : ''}`} onClick={() => run(toggleTradeBlock)}>{onBlock ? '📣 On the trade block' : '📣 Put on trade block'}</button>
      </>}
      <NumberRequest player={player} />
      {err && <p className="notice bad">{err}</p>}
    </div>
  );
}
