import React from 'react';
import { PixelKey } from './KeyPlayOverlay.jsx';

// Coaching room, middle: waiting for a key play. When one comes (the game engine will send it the moment the play before it
// ends), a key flies in and the coach picks one of four plays. Shows the last call, and a test button for now.
export default function KeyPlayPanel({ last, canTest, onTest }) {
  return (
    <section className="cr-card cr-keyplay">
      <header><b>🔑 Key plays</b>{canTest && <button className="btn small ghost" onClick={onTest}>▶ Test a key play</button>}</header>
      <div className="kpp-wait">
        <PixelKey className="kpp-key" />
        <p><b>Waiting for a key play.</b> When a big moment comes, a key flies in and you get four plays to pick from, with play art for each.</p>
      </div>
      {last && <p className="kpp-last">Last call: <b>{last.name}</b> <span className="dim">({last.moment})</span></p>}
    </section>
  );
}
