import React from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import { dripChanges, requestDrip } from '../data/drip.js';

// The coach's "Send request" button for a drip change: checks it's exactly one change, then warns about the wait before sending.
export default function DripSend({ player, saved, draft, number, status, onSent, onError }) {
  const changes = dripChanges(saved, draft, player.number, number === '' ? null : number);
  const blocked = !status || status.pending || status.left > 0;
  if (changes.length > 1) return <span className="drip-too-many">One change at a time. You changed {changes.join(' and ')}.</span>;
  return (
    <ConfirmButton className="btn" label={changes.length ? `Send request (${changes[0]})` : 'Send request'} disabled={!changes.length || blocked || number === ''}
      title={`Send a ${changes[0]?.toLowerCase()} change for ${player.name}?`} yes="Send it"
      text={`⚠️ Heads up: each player gets one drip change every 2 weeks (or 2 offseason steps). Once the commissioner accepts this, ${player.name} can't change anything else until then.`}
      onConfirm={async () => { try { const r = await requestDrip(player.id, draft, Number(number)); onSent(r?.item || changes[0]); } catch (e) { onError(e.message); } }} />
  );
}
