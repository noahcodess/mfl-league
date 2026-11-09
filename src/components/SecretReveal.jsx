import React, { useState } from 'react';

// Shows a one-time secret (temporary password or commissioner key) big and clear, with a copy button.
export default function SecretReveal({ label, value, display }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="secret">
      <div className="secret-label">{label}</div>
      <div className="secret-value">{display || value}</div>
      <div className="secret-actions">
        <button type="button" className="btn small ghost" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
    </div>
  );
}
