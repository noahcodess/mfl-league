import React from 'react';

// Live: the big week heading. The week you're on sits in the middle; one week each side is smaller, two away fades out.
// Arrows (or tapping a nearby week) move one week at a time.
export default function WeekPicker({ week, max, current, onGo }) {
  const go = (w) => w >= 1 && w <= max && onGo(w);
  return (
    <div className="wk-picker">
      <button className="wk-arrow" disabled={week <= 1} onClick={() => go(week - 1)} aria-label="Previous week">‹</button>
      <div className="wk-strip">
        {[-2, -1, 0, 1, 2].map((d) => {
          const w = week + d, cls = `wk-item d${Math.abs(d)}${w === current ? ' now' : ''}`;
          if (w < 1 || w > max) return <span key={d} className={cls} aria-hidden="true" />;
          if (d === 0) return <h2 key={d} className={cls}>Week {w}</h2>;
          return <button key={d} className={cls} onClick={() => go(w)}>Week {w}</button>;
        })}
      </div>
      <button className="wk-arrow" disabled={week >= max} onClick={() => go(week + 1)} aria-label="Next week">›</button>
    </div>
  );
}
