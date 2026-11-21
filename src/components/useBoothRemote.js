import { useEffect, useRef, useState } from 'react';
import { boothChannel, cardKindFor } from '../lib/boothLink.js';
import { cardLines } from '../lib/broadcastGfx.js';
import { tally } from '../lib/simStats.js';

// The broadcast side of the Broadcast Booth: sends the booth what's happening (4 times a second, plus the box score when a
// play ends) and carries out its commands. Returns what the broadcast needs to honour: graphics the commissioner denied, a
// stat card he put up, whether he's holding the snap (the play clock) and a play clock he set (pc).
// game, i: the game and the play on screen. read(): a snapshot of the broadcast right now. act: { setPaused, setSpeed, setI,
// jumpTo(kind), onInput(input), preview(kind) }. people: id -> player. sideOf: id -> side.
export default function useBoothRemote({ gameId, game, i, read, act, people, sideOf }) {
  const [denied, setDenied] = useState(() => new Set()), [manual, setManual] = useState(null), [hold, setHold] = useState(false), [pc, setPc] = useState(null);
  const ch = useRef(null), sender = useRef(null), live = useRef({}); live.current = { read, act, game, i, people, sideOf, denied, manual, hold, pc };
  useEffect(() => {
    const c = boothChannel(gameId); ch.current = c; if (!c) return undefined;
    c.onmessage = ({ data: m }) => {
      const L = live.current;
      if (m?.type === 'hello') { c.postMessage({ type: 'roster', people: Object.values(L.people).map((p) => ({ id: p.id, name: p.name, pos: p.pos, number: p.number, side: L.sideOf[p.id] })) }); sendStats(); return; }
      if (m?.type !== 'cmd') return;
      const a = L.act;
      if (m.cmd === 'pause') a.setPaused(true); else if (m.cmd === 'play') a.setPaused(false);
      else if (m.cmd === 'speed') a.setSpeed(m.v);
      else if (m.cmd === 'next') a.setI((n) => Math.min(L.game.plays.length, n + 1));
      else if (m.cmd === 'back') a.setI((n) => Math.max(0, n - 1));
      else if (m.cmd === 'jump') a.jumpTo(m.v);
      else if (m.cmd === 'deny') setDenied((d) => new Set(d).add(m.v));
      else if (m.cmd === 'hold') { setHold(!!m.v); if (!m.v) setPc(null); }
      else if (m.cmd === 'pc') { setPc(Math.max(0, Math.min(25, m.v | 0))); setHold(true); }   // set the play clock (it holds there until let go)
      else if (m.cmd === 'card') {
        const s = tally(L.game.plays.slice(0, L.i)).players[m.v] || {}, p = L.people[m.v];
        if (p) setManual({ id: p.id, side: L.sideOf[p.id], kind: cardKindFor(p.pos, s), lines: cardLines(cardKindFor(p.pos, s), s), until: Date.now() + (m.secs || 7) * 1000 });
      } else if (m.cmd === 'clearCard') setManual(null);
      else if (m.cmd === 'timeout' || m.cmd === 'test') a.onInput?.(m.input);
      else if (m.cmd === 'preview') a.preview?.(m.v);
    };
    const sendStats = () => { const L = live.current; c.postMessage({ type: 'stats', i: L.i, players: tally(L.game.plays.slice(0, L.i)).players }); };
    const t = setInterval(() => { const L = live.current; c.postMessage({ type: 'state', ...L.read(), denied: [...L.denied], manual: L.manual && L.manual.until > Date.now() ? L.manual : null, hold: L.hold, pc: L.pc }); }, 250);
    c.postMessage({ type: 'roster', people: Object.values(live.current.people).map((p) => ({ id: p.id, name: p.name, pos: p.pos, number: p.number, side: live.current.sideOf[p.id] })) });
    sender.current = sendStats;
    return () => { clearInterval(t); c.close(); ch.current = null; sender.current = null; };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { sender.current?.(); }, [i, game]);
  useEffect(() => { if (!manual) return undefined; const t = setTimeout(() => setManual(null), Math.max(0, manual.until - Date.now())); return () => clearTimeout(t); }, [manual]);
  return { denied, manual: manual && manual.until > Date.now() ? manual : null, hold, pc };
}
