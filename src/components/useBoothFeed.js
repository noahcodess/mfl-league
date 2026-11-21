import { useEffect, useRef, useState } from 'react';
import { boothChannel } from '../lib/boothLink.js';

// The booth side of the line to the broadcast: the latest snapshot ({ type: 'state' }), the roster and the box score, and
// send(cmd, v, extra) for commands. Says hello every 2 seconds until the broadcast answers (it may not be open yet).
export default function useBoothFeed(gameId) {
  const [state, setState] = useState(null), [roster, setRoster] = useState([]), [stats, setStats] = useState({}), [seen, setSeen] = useState(0);
  const ch = useRef(null);
  useEffect(() => {
    const c = boothChannel(gameId); ch.current = c; if (!c) return undefined;
    c.onmessage = ({ data: m }) => {
      if (m?.type === 'state') { setState(m); setSeen(Date.now()); }
      else if (m?.type === 'roster') setRoster(m.people || []);
      else if (m?.type === 'stats') setStats(m.players || {});
    };
    const hello = () => c.postMessage({ type: 'hello' });
    hello(); const t = setInterval(hello, 2000);
    return () => { clearInterval(t); c.close(); };
  }, [gameId]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const send = (cmd, v, extra = {}) => ch.current?.postMessage({ type: 'cmd', cmd, v, ...extra });
  return { state: state && now - seen < 2500 ? state : null, roster, stats, send, supported: typeof BroadcastChannel !== 'undefined' };
}
