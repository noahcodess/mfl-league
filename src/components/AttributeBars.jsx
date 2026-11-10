import React from 'react';
import { ATTRIBUTES } from '../lib/attributeDefs.js';
import { outOf10 } from '../lib/format.js';

// Attribute bars, rated out of 10: the filled part is the rating now, the outline is how high it can grow (shown only
// to people allowed to see his potential).
export default function AttributeBars({ position, ratings, ceilings }) {
  if (!ratings) return null;
  return (
    <section className="attrs">
      <h3>Attributes</h3>
      <div className="attr-grid">
        {(ATTRIBUTES[position] || []).map(([key, label]) => {
          const v = ratings[key] ?? 0;
          const c = ceilings?.[key];
          return (
            <div key={key} className={`attr${['speed', 'toughness'].includes(key) ? ' core' : ''}`}>
              <div className="attr-label"><span>{label}</span><b>{outOf10(v)}</b></div>
              <div className="abar" title={c != null ? `${label}: ${outOf10(v)}/10 now, can reach ${outOf10(c)}/10` : `${label}: ${outOf10(v)}/10`}>
                {c != null && c > v && <span className="abar-ceil" style={{ width: `${c}%` }} />}
                <span className="abar-fill" style={{ width: `${v}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
