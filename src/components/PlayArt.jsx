import React from 'react';

const COLOR = { main: '#ffd23f', route: '#ff5a4f', block: '#ff5a4f', qb: '#7fd0ff', fake: '#7fd0ff' };

// Madden-style play art for a key play: the field, the line of scrimmage, your players as team-colored dots and every path.
// Gold is the main read or ball carrier, red is everyone else, dashed gold is where a kick goes. Arrows on routes, flat caps
// on blocks.
export default function PlayArt({ play, color = '#1f9cc4', id }) {
  const mk = (c) => `ar-${id}-${c.slice(1)}`;
  return (
    <svg className="play-art" viewBox="0 0 100 64" shapeRendering="geometricPrecision" aria-label={`${play.name} play art`}>
      <defs>{Object.values(COLOR).filter((c, i, a) => a.indexOf(c) === i).map((c) => (
        <marker key={c} id={mk(c)} viewBox="0 0 6 6" refX="4" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={c} /></marker>
      ))}</defs>
      <rect width="100" height="64" fill="#1f5f2a" />
      {[8, 20, 32, 52].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#ffffff22" strokeWidth=".4" />)}
      <line x1="0" x2="100" y1="40" y2="40" stroke="#7fd0ff" strokeWidth=".6" strokeDasharray="2 1.4" />
      {play.posts && <path d="M44 2 V6 H56 V2 M50 6 V10" stroke="#ffd23f" strokeWidth=".9" fill="none" />}
      {play.paths.map((p, i) => {
        const c = p.kind === 'block' ? COLOR.block : p.kind === 'qb' || p.kind === 'fake' ? COLOR[p.kind] : p.main || p.kind === 'kick' ? COLOR.main : COLOR.route;
        const d = p.pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
        return <path key={i} d={d} fill="none" stroke={c} strokeWidth={p.main ? 1.5 : 1} strokeLinejoin="round" strokeLinecap={p.kind === 'block' ? 'square' : 'round'}
          strokeDasharray={p.kind === 'kick' || p.kind === 'fake' ? '2.2 1.6' : undefined} markerEnd={p.kind === 'block' ? undefined : `url(#${mk(c)})`} />;
      })}
      {play.spots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.9" fill={color} stroke="#fff" strokeWidth=".6" />)}
    </svg>
  );
}
