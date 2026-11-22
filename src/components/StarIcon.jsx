import React, { useId } from 'react';

// One star drawn as an SVG: gold with a dark rim, a lit facet on the upper left and a shaded one on the lower right, so it
// reads like a little cut gem. `half`: a half star, the left half gold and the right half an empty dark star, so it can
// never be mistaken for a whole one.
const PATH = 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3 1.7 9.3l7.2-.9z';
const LIT = 'M12 2.8L12 12.4 3 9.6 9.3 8.8z';
const SHADE = 'M12 12.4l6.2 8 -1.3-6.4 4.4-4.3z';

export default function StarIcon({ half = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`star-icon${half ? ' half' : ''}`} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      {half && <><path className="star-empty" d={PATH} /><clipPath id={`h${id}`}><rect x="0" y="0" width="12" height="24" /></clipPath></>}
      <g clipPath={half ? `url(#h${id})` : undefined}>
        <path className="star-base" d={PATH} />
        <path className="star-lit" d={LIT} />
        <path className="star-shade" d={SHADE} />
      </g>
    </svg>
  );
}
