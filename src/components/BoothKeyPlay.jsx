import React from 'react';
import PlayArt from './PlayArt.jsx';
import { PixelKey } from './KeyPlayOverlay.jsx';
import { keyPlayOptions, momentText } from '../lib/keyPlays.js';
import { getTeam } from '../data/teams.js';
import { clockText } from '../data/gameState.js';

// Broadcast Booth: when the play coming up is a key play, the key flies in (a small version of the coaching room's),
// with the moment, the play clock and the plays the coach has to pick from. After the snap it shows what was called.
export default function BoothKeyPlay({ s, ids }) {
  const p = s?.play;
  if (!p?.keyPlay) return <section className="booth-card booth-key idle"><h3>🔑 Key play</h3><p className="dim">No key play right now. One pops up here the moment it comes.</p></section>;
  const b = p.before, team = getTeam(ids[p.off]), moment = { down: b.down, togo: b.toGo, ballOn: b.ballOn, quarter: b.quarter, clock: clockText(Math.round(b.clock)) };
  const opts = keyPlayOptions(moment).slice(0, 4);
  return (
    <section className="booth-card booth-key" style={{ '--tc': team.color }}>
      <div className="bk-head"><PixelKey className="bk-key" /><div><b>KEY PLAY · {team.code}</b><small>{momentText(moment)}</small></div><span className={`bk-clock${s.playClock <= 5 ? ' hot' : ''}`}>{s.post ? '✓' : s.playClock ?? '-'}</span></div>
      <div className="bk-opts">{opts.map((o) => <div key={o.key} className={`bk-opt${p.call && s.post && o.name === p.call ? ' on' : ''}`}><PlayArt play={o} /><b>{o.name}</b><small>{o.group} · {o.tag}</small></div>)}</div>
      {p.call && <p className="bk-called">Called: <b>{p.call}</b></p>}
    </section>
  );
}
