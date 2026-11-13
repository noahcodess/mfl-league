import React, { useEffect, useRef, useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';
import { wireKey } from '../data/tradeWire.js';

const CHANNEL = 'mfl-draft-announce';
const send = (item) => {
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: item }));
  try { const ch = new BroadcastChannel(CHANNEL); ch.postMessage(item); ch.close(); } catch { /* old browser: same window only */ }
};

function Banner({ item, children, onClose }) {
  const a = getTeam(item.from_team), b = getTeam(item.to_team), done = item.kind === 'accepted';
  return (
    <div className={`breaking${done ? ' done' : ''}`} role="status">
      <span className="breaking-tag">{done ? '🔁 TRADE' : '🚨 BREAKING NEWS'}</span>
      <div className="breaking-body">
        <span className="breaking-teams"><TeamBadge team={a} size="sm" />{done ? <b>⇄</b> : <b>→</b>}<TeamBadge team={b} size="sm" /></span>
        <p>{done ? <>The <b>{a?.name}</b> and the <b>{b?.name}</b> made a deal.</> : <>The <b>{a?.name}</b> just sent a trade offer to the <b>{b?.name}</b>.</>}</p>
        {done && <small>{a?.code} get {item.from_gets || 'nothing'} · {b?.code} get {item.to_gets || 'nothing'}</small>}
        {children}
      </div>
      {onClose && <button className="breaking-x" onClick={onClose} aria-label="Close">✕</button>}
    </div>
  );
}

// Commissioner's private draft window: new trade offers and finished trades pop up here only. He can announce one, which shows
// it on the stage (his screen-share window) as BREAKING NEWS, or just close it.
export function DraftBreakingPrivate({ wire }) {
  const seen = useRef(null);
  const [now, setNow] = useState(null);
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(wire.map(wireKey)); return; }
    const fresh = wire.find((w) => !seen.current.has(wireKey(w)) && w.kind !== 'declined');
    wire.forEach((w) => seen.current.add(wireKey(w)));
    if (fresh) setNow(fresh);
  }, [wire]);
  if (!now) return null;
  return (
    <Banner item={now} onClose={() => setNow(null)}>
      <span className="breaking-private">🔒 Only you can see this.
        <button className="btn small" onClick={() => { send(now); setNow(null); }}>📣 Announce on stage</button>
      </span>
    </Banner>
  );
}

// Stage mode: shows a trade the commissioner chose to announce, for 9 seconds.
export function DraftBreakingStage() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    let t;
    const show = (item) => { setNow(item); clearTimeout(t); t = setTimeout(() => setNow(null), 9000); };
    const onEvent = (e) => show(e.detail);
    window.addEventListener(CHANNEL, onEvent);
    let ch = null;
    try { ch = new BroadcastChannel(CHANNEL); ch.onmessage = (e) => show(e.data); } catch { /* same window only */ }
    return () => { clearTimeout(t); window.removeEventListener(CHANNEL, onEvent); ch?.close(); };
  }, []);
  return now ? <Banner item={now} /> : null;
}
