// The crowd sound controls under the commissioner's broadcast: sound on or off, the volume, and (for a Creepers home game)
// the whiteout song, which he loads from his own computer once per browser (it never goes into the site's files).
import React, { useRef } from 'react';

// snd: from useCrowdSound. whiteout: this is a Creepers whiteout game.
export default function SoundToggle({ snd, whiteout = false }) {
  const pick = useRef(null);
  return (
    <span className="snd">
      <button className={`btn ghost${snd.on ? ' on' : ''}`} onClick={() => snd.setOn(!snd.on)} title="Only you hear this, in this window">{snd.on ? '🔊' : '🔇'} Crowd</button>
      {snd.on && <input className="snd-vol" type="range" min="0" max="1" step="0.05" value={snd.vol} onChange={(e) => snd.setVol(Number(e.target.value))} aria-label="Crowd volume" />}
      {whiteout && (snd.song
        ? <span className="snd-song" title={snd.song}>🎵 Whiteout song ✓ <button className="btn ghost small" onClick={snd.clearSong} title="Remove it from this browser">✕</button></span>
        : <button className="btn ghost small" onClick={() => pick.current?.click()} title="Pick the song file on your computer. It stays in this browser only.">🎵 Load whiteout song</button>)}
      <input ref={pick} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) snd.pickSong(f); e.target.value = ''; }} />
    </span>
  );
}
