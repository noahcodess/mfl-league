import React from 'react';
import { ATTRIBUTES } from '../lib/attributeDefs.js';

// Attribute bars: the filled part is the rating now, the outline is how high it can grow (shown only to people
// allowed to see his potential).
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
            <div key={key} className={`attr${['speed', 'stamina', 'clutch'].includes(key) ? ' core' : ''}`}>
              <div className="attr-label"><span>{label}</span><b>{v}</b></div>
              <div className="abar" title={c != null ? `${label}: ${v} now, can reach ${c}` : `${label}: ${v}`}>
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
