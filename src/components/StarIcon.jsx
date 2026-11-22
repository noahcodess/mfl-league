import React from 'react';

// One star in pixel art (drawn here, 13x12 pixels, crisp at any size): a dark outline, a lit upper-left edge and a shaded
// lower-right one. Each half has its own color: gold (what he is), red (stars he's lost from his peak) or nothing, so a
// half star is only the half (with its own clean edge down the middle) and a 4.5 never looks like 5.
const ART = [
  '......O......',
  '.....OHO.....',
  '.....OHO.....',
  '....OHYSO....',
  'OOOOHHYYSOOOO',
  'OHHHHHYYYYYSO',
  '.OHYYYYYYYSO.',
  '..OHYYYYYSO..',
  '..OYYYYYYSO..',
  '.OYYSO.OYYSO.',
  'OYSO.....OYSO',
  'OOO.......OOO',
];
const PAL = {
  gold: { O: '#3d2400', H: '#fff0a0', Y: '#ffc21a', S: '#c27a00' },
  shine: { O: '#4a2c00', H: '#fffbe2', Y: '#ffd84a', S: '#e09a10' },   // a full 5 stars
  red: { O: '#3d0907', H: '#ff9d8f', Y: '#e2382e', S: '#9b1b14' },
};

// left / right: 'gold' | 'red' | null for each half. glow: part of a full 5-star row (brighter gold).
export default function StarIcon({ left = 'gold', right = 'gold', glow = false }) {
  const pal = (k) => (k === 'gold' && glow ? PAL.shine : PAL[k]), cells = [];
  ART.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '.') return;
    const side = x <= 6 ? left : right; if (!side) return;
    cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={pal(side)[c]} />);
  }));
  if (!right) ART.forEach((row, y) => { if (row[6] !== '.') cells.push(<rect key={`e${y}`} x="7" y={y} width="1" height="1" fill={pal(left).O} />); });   // the half's clean edge
  if (left && right && left !== right) ART.forEach((row, y) => { if (row[6] !== '.' && row[6] !== 'O') cells.push(<rect key={`m${y}`} x="6" y={y} width="1" height="1" fill={pal(left).S} />); });   // a seam where gold meets red
  const w = right ? 13 : 8;
  return <svg className="star-icon" width={w} height="12" viewBox={`0 0 ${w} 12`} shapeRendering="crispEdges" aria-hidden="true" style={{ '--w': w }}>{cells}</svg>;
}
