// The crowd sound controls under the commissioner's broadcast: sound on or off and the volume. Only he hears it, in this window.
import React from 'react';

// snd: from useCrowdSound.
export default function SoundToggle({ snd }) {
  return (
    <span className="snd">
      <button className={`btn ghost${snd.on ? ' on' : ''}`} onClick={() => snd.setOn(!snd.on)} title="Only you hear this, in this window">{snd.on ? '🔊' : '🔇'} Crowd</button>
      {snd.on && <input className="snd-vol" type="range" min="0" max="1" step="0.05" value={snd.vol} onChange={(e) => snd.setVol(Number(e.target.value))} aria-label="Crowd volume" />}
    </span>
  );
}
