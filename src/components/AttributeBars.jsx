import React from 'react';
import { ATTRIBUTES } from '../lib/attributeDefs.js';
import { usePlayerAttributes } from '../data/attributes.js';

// A player's attribute bars: the filled part is his rating now, the outline is how high it can grow (only for
// people allowed to see his potential: his own team, the commissioner, scouts later).
export default function AttributeBars({ player, potential }) {
  const { ratings, ceilings, loaded } = usePlayerAttributes(player, potential);
  const defs = ATTRIBUTES[player.position] || [];
  if (!loaded) return <p className="dim">Loading attributes...</p>;
  if (!ratings) return null;
  return (
    <section className="attrs">
      <h3>Attributes</h3>
      <div className="attr-grid">
        {defs.map(([key, label]) => {
          const v = ratings[key] ?? 0;
          const c = ceilings?.[key];
          return (
            <div key={key} className={`attr${['speed', 'stamina', 'toughness'].includes(key) ? ' core' : ''}`}>
              <div className="attr-label"><span>{label}</span><b>{v}</b></div>
              <div className="abar" title={c != null ? `${label}: ${v} now, can reach ${c}` : `${label}: ${v}`}>
                {c != null && c > v && <span className="abar-ceil" style={{ width: `${c}%` }} />}
                <span className="abar-fill" style={{ width: `${v}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="dim attr-note">{ceilings ? 'Outline = how high each rating can grow.' : 'Scout him to see how high each rating can grow.'} Toughness decides injuries.</p>
    </section>
  );
}
