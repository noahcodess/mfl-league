import React, { useEffect, useState } from 'react';

const TWO_HOURS = 2 * 3600e3;
const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const kickoffText = (at) => new Date(at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Ticks once a second.
export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

// Game screen: when the game is. The kickoff day and time; under 2 hours out, a big clock ticking down to kickoff; LIVE once
// the commissioner starts it.
export default function KickoffClock({ startsAt, status }) {
  const now = useNow(), at = startsAt ? Date.parse(startsAt) : null, left = at ? at - now : null;
  if (status === 'live') return <div className="kc kc-live"><i className="live-pulse" /> Live now</div>;
  if (status === 'final') return <div className="kc">Final</div>;
  if (!at) return <div className="kc kc-none">Kickoff time not set yet</div>;
  if (left > TWO_HOURS) return <div className="kc"><span>Kickoff</span><b>{kickoffText(at)}</b></div>;
  if (left > 0) return <div className="kc kc-count"><span>Kickoff in</span><b>{hms(left)}</b><small>{kickoffText(at)}</small></div>;
  return <div className="kc kc-due"><span>Kickoff time</span><b>Any moment now</b><small>Waiting for the commissioner to start the game</small></div>;
}
