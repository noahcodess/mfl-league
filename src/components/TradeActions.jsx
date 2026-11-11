import React, { useState } from 'react';
import { useTradeMarks, toggleUntouchable, toggleTradeBlock, openTradeBuilder } from '../data/trades.js';

// Trade buttons on a player card. Your player: untouchable (max 2) and trade block. Someone else's: "Trade for him" (not if he's untouchable).
export default function TradeActions({ player, myTeamId, onDone }) {
  const [version, setVersion] = useState(0);
  const [err, setErr] = useState('');
  const marks = useTradeMarks(version);
  if (!myTeamId || !player.teamId) return null;
  const untouchable = marks.untouchables.has(player.id);
  const onBlock = marks.block.has(player.id);
  const run = async (fn) => { setErr(''); try { await fn(player.id); setVersion((v) => v + 1); } catch (e) { setErr(e.message); } };
  if (player.teamId !== myTeamId) {
    return (
      <div className="pcard-actions">
        {untouchable ? <span className="dim">🔒 Untouchable: his team won't trade him.</span>
          : <button className="btn" onClick={() => { onDone?.(); openTradeBuilder({ teamId: player.teamId, player }); }}>🔁 Trade for him{onBlock ? ' (on the block)' : ''}</button>}
      </div>
    );
  }
  return (
    <div className="pcard-actions">
      <button className={`btn ghost${untouchable ? ' on' : ''}`} onClick={() => run(toggleUntouchable)}>{untouchable ? '🔒 Untouchable' : '🔓 Make untouchable'}</button>
      <button className={`btn ghost${onBlock ? ' on' : ''}`} onClick={() => run(toggleTradeBlock)}>{onBlock ? '📣 On the trade block' : '📣 Put on trade block'}</button>
      {err && <p className="notice bad">{err}</p>}
    </div>
  );
}
