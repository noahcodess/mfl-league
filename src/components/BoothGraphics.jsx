import React from 'react';

// Broadcast Booth: the graphic coming up before this snap, seconds before it goes on air (never anything that would give
// away how a play turns out). It goes up on its own; the one button is Deny. Also the stat card he put up himself.
export default function BoothGraphics({ s, send }) {
  const pre = s?.pre, spd = s?.speed || 1, t = s?.t ?? 0, denied = pre && s.denied?.includes(pre.id);
  const inSec = pre?.window ? (pre.window[0] - t) / spd : null, onAir = pre?.window && t >= pre.window[0] && t < pre.window[1] && !s.post, gone = pre?.window && (t >= pre.window[1] || s.post);
  return (
    <section className="booth-card">
      <h3>📺 Graphics</h3>
      {!pre && <p className="dim">Nothing planned before this snap.</p>}
      {pre && (
        <div className={`booth-gfx${denied ? ' denied' : onAir ? ' air' : gone ? ' gone' : ''}`}>
          <div><b>{pre.label}</b><small>{denied ? '🚫 Denied: it won\'t show' : onAir ? '🔴 On air now' : gone ? 'Done' : `Goes up in ${Math.max(0, inSec).toFixed(1)}s · approves itself`}</small></div>
          {!denied && !gone && <button className="btn small danger" onClick={() => send('deny', pre.id)}>🚫 Deny</button>}
        </div>
      )}
      {s?.intro && <div className={`booth-gfx${s.intro.when === 'now' ? ' air' : ''}`}><div><b>🎬 {s.intro.label} showcase</b><small>{s.intro.when === 'now' ? '🔴 On air now' : `Displayed ${s.intro.when}`} · SNF starting lineups, planned ahead</small></div></div>}
      {s?.manual && <div className="booth-gfx air"><div><b>Your stat card</b><small>🔴 On air: {s.manual.lines.join(' · ')}</small></div><button className="btn small ghost" onClick={() => send('clearCard')}>Take down</button></div>}
      <p className="dim booth-note">Touchdown and field goal graphics fire the moment they happen, so they never show early.</p>
    </section>
  );
}
