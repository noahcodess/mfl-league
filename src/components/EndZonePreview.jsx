import React, { useEffect, useRef } from 'react';
import { drawEndZone, endZoneWords } from '../lib/endZoneDraw.js';
import { YD, FY0, FH } from '../lib/fieldLayout.js';

const ZW = 10 * YD;
function Banner({ team, word, dir, look }) {
  const ref = useRef(null);
  useEffect(() => {
    const off = document.createElement('canvas'); off.width = ZW; off.height = FH;
    const o = off.getContext('2d'); o.translate(0, -FY0); drawEndZone(o, team, 0, word, dir, look);
    const c = ref.current, x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, FH, ZW); x.imageSmoothingEnabled = false;
    x.translate(FH / 2, ZW / 2); x.rotate(dir === 'up' ? Math.PI / 2 : -Math.PI / 2); x.drawImage(off, -ZW / 2, -FH / 2);
  }, [team.id, team.color, team.accent, word, dir, look.font, look.design, look.shadow, look.shadowColor]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={FH} height={ZW} className="ez-banner" />;
}

// Both of a team's end zones laid flat so the words read left to right: the place, then the nickname.
export default function EndZonePreview({ team, look, label }) {
  const [place, nick] = endZoneWords(team);
  return (
    <figure className="ez-preview">
      {label && <figcaption>{label}</figcaption>}
      <Banner team={team} word={place} dir="up" look={look} />
      <Banner team={team} word={nick} dir="down" look={look} />
    </figure>
  );
}
