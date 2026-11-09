import React from 'react';
import { seeded } from '../lib/seed.js';

// Placeholder pixel headshot (no helmet): skin, hair and jersey in team colors with the number.
// Stand-in until the real player art is drawn; each player keeps the same look every time.
const SKIN = ['#f1c9a5', '#e0ac7e', '#c68b59', '#a5694f', '#7d4b32', '#5a3422'];
const HAIR = ['#1b1210', '#3b2416', '#6b4423', '#b07a3c', '#2a2a2a'];
const STYLES = ['short', 'buzz', 'tall', 'side', 'bald'];

function Hair({ style, color }) {
  if (style === 'bald') return null;
  const rects = {
    short: [[7, 4, 10, 2], [6, 5, 1, 3], [17, 5, 1, 3]],
    buzz: [[7, 4, 10, 1]],
    tall: [[7, 2, 10, 3], [6, 4, 1, 3], [17, 4, 1, 3]],
    side: [[7, 4, 10, 2], [6, 5, 2, 4], [12, 3, 5, 1]],
  }[style];
  return rects.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={color} />);
}

export default function Headshot({ player, team, size = 48 }) {
  const r = seeded(player.id);
  const skin = SKIN[r(SKIN.length)];
  const hair = HAIR[r(HAIR.length)];
  const style = STYLES[r(STYLES.length)];
  const jersey = team?.color || '#555';
  const trim = team?.accent || '#fff';
  return (
    <svg className="headshot" width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="24" height="24" fill={`color-mix(in srgb, ${jersey} 35%, #120a06)`} />
      <rect x="2" y="19" width="20" height="5" fill={jersey} />
      <rect x="4" y="18" width="16" height="2" fill={jersey} />
      <rect x="9" y="17" width="6" height="2" fill={trim} />
      <rect x="10" y="15" width="4" height="3" fill={skin} />
      <rect x="7" y="5" width="10" height="11" fill={skin} />
      <rect x="6" y="8" width="1" height="3" fill={skin} />
      <rect x="17" y="8" width="1" height="3" fill={skin} />
      <rect x="9" y="9" width="2" height="1" fill="#120a06" />
      <rect x="13" y="9" width="2" height="1" fill="#120a06" />
      <rect x="10" y="13" width="4" height="1" fill="#0004" />
      <Hair style={style} color={hair} />
      {player.number != null && (
        <text x="12" y="23.4" textAnchor="middle" fontSize="4.6" fontFamily="Pixelify Sans, monospace" fontWeight="600" fill={trim}>{player.number}</text>
      )}
    </svg>
  );
}
