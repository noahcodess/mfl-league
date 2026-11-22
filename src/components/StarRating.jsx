import React from 'react';
import StarIcon from './StarIcon.jsx';

// Shows a 0-5 star rating in pixel-art stars: gold for what he is, then red for what he's lost from his peak (a 5-star who
// slipped to 4.5 shows four gold stars and a star that's half gold, half red). A half star with nothing lost is just the
// half. Only a full 5 stars glows (now or potential, anywhere). The number only shows when asked.
// peak: his best star rating (players who regressed). `elite` and `declining` are no longer used.
export default function StarRating({ value, peak, showNumber }) {
  if (value == null) return <span className="stars none">No rating</span>;
  const half = (n) => Math.max(0, Math.min(10, Math.round(n * 2))), g = half(value), r = Math.max(0, half(peak ?? value) - g);   // in half stars
  const icons = [];
  for (let k = 0; k < g + r; k += 2) {
    const side = (i) => (i < g ? 'gold' : i < g + r ? 'red' : null);
    icons.push(<StarIcon key={k} left={side(k)} right={side(k + 1)} glow={g >= 10} />);
  }
  return (
    <span className={`stars${g >= 10 ? ' elite' : ''}`} title={`${g / 2} stars${r ? ` (down from ${(g + r) / 2})` : ''}`}>
      {icons}
      {showNumber && <span className="stars-num">{(g / 2).toFixed(1)}</span>}
    </span>
  );
}
