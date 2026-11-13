import React from 'react';
import { recordText } from '../lib/seasonStats.js';

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '0.0');

// Primetime intro: the tale of the tape. Both teams side by side, row by row (record, scoring, defense, ratings), with bars
// showing who has the edge.
export default function IntroTape({ home, away, rec, stats }) {
  const s = (id) => stats.find((t) => t.id === id);
  const hs = s(home.id), as = s(away.id), played = hs?.gp && as?.gp;
  const rows = [
    ['Record', recordText(rec[away.id]), recordText(rec[home.id]), rec[away.id]?.w || 0, rec[home.id]?.w || 0],
    ...(played ? [['Points per game', f1(as.ppg), f1(hs.ppg), as.ppg, hs.ppg], ['Allowed per game', f1(as.papg), f1(hs.papg), 60 - as.papg, 60 - hs.papg]] : []),
    ['Offense', `${away.offense?.stars ?? '?'}★`, `${home.offense?.stars ?? '?'}★`, away.offense?.stars || 0, home.offense?.stars || 0],
    ['Defense', `${away.defense?.stars ?? '?'}★`, `${home.defense?.stars ?? '?'}★`, away.defense?.stars || 0, home.defense?.stars || 0],
    ['Team rating', `${away.overall?.stars ?? '?'}★`, `${home.overall?.stars ?? '?'}★`, away.overall?.stars || 0, home.overall?.stars || 0],
  ];
  return (
    <div className="intro-scene sc-tape" style={{ '--ac': away.color, '--hc': home.color }}>
      <h2 className="tape-title">Tale of the tape</h2>
      <div className="tape-teams"><div><img src={away.logo} alt="" /><b>{away.name}</b></div><div><img src={home.logo} alt="" /><b>{home.name}</b></div></div>
      <div className="tape-rows">
        {rows.map(([label, a, h, av, hv], i) => {
          const tot = Math.max(0.001, av + hv), aw = av / tot, edge = av === hv ? '' : av > hv ? 'a' : 'h';
          return (
            <div key={label} className="tape-row" style={{ '--i': i, '--aw': aw }}>
              <span className={`tape-v${edge === 'a' ? ' edge' : ''}`}>{a}</span>
              <div className="tape-mid"><small>{label}</small><div className="tape-bar"><i className="ab" /><i className="hb" /></div></div>
              <span className={`tape-v${edge === 'h' ? ' edge' : ''}`}>{h}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
