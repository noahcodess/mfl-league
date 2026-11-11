import React, { useState } from 'react';
import DraftControls from './DraftControls.jsx';
import { openDeskWindow } from '../data/draftIntel.js';

// On the shared draft room screen the commissioner only gets a slim bar, so secrets stay off the stream.
// The full desk opens in its own window for a second monitor, or can be shown here if he's on one screen.
export default function DeskBar(props) {
  const [here, setHere] = useState(false);
  const { info } = props;
  const alert = info.pickState === 'in' ? '📨 A pick is in' : info.pickState === 'accepted' ? '🎙️ Ready to announce' : info.timeUp ? "⏰ Time's up" : null;
  return (
    <>
      <div className="desk-bar">
        <b>🎛️ Commissioner</b>
        {alert && <span className="desk-bar-alert">{alert}</span>}
        <button className="btn small" onClick={openDeskWindow}>🎛️ Commissioner Window: Draft Desk</button>
        <button className="btn small ghost" onClick={() => setHere((h) => !h)}>{here ? 'Hide desk' : 'Show desk here'}</button>
      </div>
      {here && <DraftControls {...props} />}
    </>
  );
}
