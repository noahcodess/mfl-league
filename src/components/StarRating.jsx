import React from 'react';
import StarIcon from './StarIcon.jsx';

// Shows a 0-5 star rating with real half stars; gold glow for elite. If he's regressed (peak above his rating), the stars
// he's lost show in red up to his peak. The number only shows when asked.
export default function StarRating({ value, elite, declining, showNumber, peak }) {
  if (value == null) return <span className="stars none">No rating</span>;
  const cls = ['stars', elite && 'elite', declining && 'declining'].filter(Boolean).join(' ');
  const top = peak != null && peak > value ? peak : value;
  const halves = Math.round(top * 2);
  const have = Math.round(value * 2);
  const icons = [];
  for (let h = 0; h < halves; h += 2) {
    const leftLost = h >= have;
    const hasRight = h + 1 < halves;
    const rightLost = h + 1 >= have;
    if (hasRight && leftLost === rightLost) icons.push(<StarIcon key={h} lost={leftLost} />);
    else {
      icons.push(<StarIcon key={`${h}l`} half lost={leftLost} />);
      if (hasRight) icons.push(<StarIcon key={`${h}r`} right lost={rightLost} />);
    }
  }
  return (
    <span className={cls} title={top > value ? `${value} stars (down from ${top})` : `${value} stars`}>
      {icons}
      {showNumber && <span className="stars-num">{value.toFixed(1)}{top > value && <em className="stars-lost"> ▼{(top - value).toFixed(1)}</em>}</span>}
    </span>
  );
}
