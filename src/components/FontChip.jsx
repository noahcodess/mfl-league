import React, { useEffect, useRef } from 'react';
import { endZoneWord } from '../lib/endZoneDraw.js';

// A small button showing a team's nickname in one end zone font (with the chosen shadow), on the team color.
export default function FontChip({ team, word, font, look = {}, label, exclusive, active, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const w = endZoneWord(team, word, { ...look, font }), s = Math.max(1, Math.min(3, Math.floor(150 / w.w), Math.floor(40 / w.h)));
    const c = ref.current; c.width = w.w * s + 12; c.height = w.h * s + 12;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = team.color; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(w.cv, w.x, w.y, w.w, w.h, 6, 6, w.w * s, w.h * s);
  }, [team.id, team.color, team.accent, word, font, look.shadow, look.shadowColor]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" className={`ez-chip${active ? ' on' : ''}`} onClick={onClick}>
      <canvas ref={ref} />
      <span>{label}{exclusive && <i className="ez-exclusive">★ Exclusive</i>}</span>
    </button>
  );
}
