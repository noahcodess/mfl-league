import React from 'react';
import { ATTRIBUTES } from '../lib/attributeDefs.js';
import { outOf10 } from '../lib/format.js';

// Attribute bars, rated out of 10: the filled part is the rating now, the outline is how high it can grow (shown only
// to people allowed to see his potential), and a red part is what he's lost from his best (peaks), like the stars of a
// regressed veteran. Coaches reuse it with their own list (defs).
export default function AttributeBars({ position, ratings, ceilings, peaks, defs, title = 'Attributes', tips }) {
  if (!ratings) return null;
  return (
    <section className="attrs">
      {title && <h3>{title}</h3>}
      <div className="attr-grid">
        {(defs || ATTRIBUTES[position] || []).map(([key, label]) => {
          const v = ratings[key] ?? 0;
          const c = ceilings?.[key], pk = peaks?.[key], lost = pk != null && pk > v ? pk - v : 0;
          return (
            <div key={key} className={`attr${['speed', 'toughness'].includes(key) ? ' core' : ''}`}>
              <div className="attr-label"><span>{label}</span><b>{outOf10(v)}{lost > 0 && outOf10(pk) > outOf10(v) && <small className="attr-down">▼{outOf10(pk) - outOf10(v)}</small>}</b></div>
              <div className="abar" title={tips?.[key] ? tips[key] : lost ? `${label}: ${outOf10(v)}/10 now, down from ${outOf10(pk)}/10 at his best` : c != null ? `${label}: ${outOf10(v)}/10 now, can reach ${outOf10(c)}/10` : `${label}: ${outOf10(v)}/10`}>
                {c != null && c > Math.max(v, pk ?? 0) && <span className="abar-ceil" style={{ width: `${c}%` }} />}
                <span className="abar-fill" style={{ width: `${v}%` }} />
                {lost > 0 && <span className="abar-lost" style={{ left: `${v}%`, width: `${lost}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
