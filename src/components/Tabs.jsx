import React, { useState } from 'react';

// Simple tabs: pass [{ key, label, render }]; only the open tab is drawn, so busy screens stay short.
export default function Tabs({ tabs, initial }) {
  const [open, setOpen] = useState(initial || tabs[0]?.key);
  const current = tabs.find((t) => t.key === open) || tabs[0];
  return (
    <div className="tabs">
      <div className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === current.key} className={t.key === current.key ? 'on' : ''} onClick={() => setOpen(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body" key={current.key}>{current.render()}</div>
    </div>
  );
}
