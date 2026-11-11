import React from 'react';

// One star drawn as an SVG; `half` draws only the left half, `right` only the right half (for a gold+red split star).
const PATH = 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3 1.7 9.3l7.2-.9z';

export default function StarIcon({ half = false, right = false, lost = false }) {
  const part = half || right;
  return (
    <svg className={`star-icon${lost ? ' lost' : ''}`} width={part ? 7 : 14} height="14" viewBox={right ? '12 0 12 24' : half ? '0 0 12 24' : '0 0 24 24'} aria-hidden="true">
      <path d={PATH} />
    </svg>
  );
}
