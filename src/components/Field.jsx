import React from 'react';

// One labeled form input with an optional hint underneath.
export default function Field({ label, hint, id, ...input }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
