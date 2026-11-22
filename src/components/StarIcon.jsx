import React from 'react';

// One star drawn as an SVG: gold with a dark rim, a lit facet on the upper left and a shaded one on the lower right, so it
// reads like a little cut gem. `half` draws only the left half, `right` only the right half (for a gold+red split star).
const PATH = 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3 1.7 9.3l7.2-.9z';
const LIT = 'M12 2.8L12 12.4 3 9.6 9.3 8.8z';
const SHADE = 'M12 12.4l6.2 8 -1.3-6.4 4.4-4.3z';

export default function StarIcon({ half = false, right = false, lost = false }) {
  const part = half || right;
  return (
    <svg className={`star-icon${lost ? ' lost' : ''}`} width={part ? 7 : 14} height="14" viewBox={right ? '12 0 12 24' : half ? '0 0 12 24' : '0 0 24 24'} aria-hidden="true">
      <path className="star-base" d={PATH} />
      <path className="star-lit" d={LIT} />
      <path className="star-shade" d={SHADE} />
    </svg>
  );
}
