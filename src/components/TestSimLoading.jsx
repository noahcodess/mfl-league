import React from 'react';
import { createPortal } from 'react-dom';

// The loading screen while a test sim runs: a pixel football spinning, what's happening now, and everything done so far.
export default function TestSimLoading({ log, error, onClose }) {
  const now = log[log.length - 1];
  return createPortal(
    <div className="tsim-overlay">
      <div className="tsim-card">
        <div className={`tsim-ball${error ? ' stop' : ''}`} aria-hidden="true" />
        <h2>{error ? 'The sim hit a problem' : 'Simming to the season...'}</h2>
        <p className="tsim-now">{error || now || 'Getting started'}</p>
        <ol className="tsim-log">{log.slice(0, -1).map((l, i) => <li key={i}>✅ {l}</li>)}</ol>
        {!error && <p className="dim">This can take 10 seconds or so. Don't close the page.</p>}
        {error && <><p className="dim">TEST mode is still on, so nothing real changed. You can try again or leave TEST mode to reset.</p><button className="btn" onClick={onClose}>OK</button></>}
      </div>
    </div>,
    document.body,
  );
}
