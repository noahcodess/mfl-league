import React, { useState } from 'react';

// Shows the first few items of a long list with a "Show all" button, so cards don't overflow.
export default function ShowMore({ items, first = 4, render, label = 'Show all' }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, first);
  return (
    <>
      {shown.map(render)}
      {items.length > first && (
        <button className="show-more" onClick={() => setAll(!all)}>{all ? 'Show less' : `${label} (${items.length})`}</button>
      )}
    </>
  );
}
