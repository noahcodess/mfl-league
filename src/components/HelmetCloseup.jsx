import React, { useEffect, useRef } from 'react';
import { drawHelmetSide } from '../lib/helmetSide.js';
import { helmetDesign } from '../data/drip.js';

// A big side view of a helmet model in a team's uniform colors, with the team's stripe and logo when its design has them.
export default function HelmetCloseup({ team, colors, model, scale = 4 }) {
  const ref = useRef(null);
  const design = helmetDesign(team);
  useEffect(() => {
    let live = true;
    const draw = (img) => { if (live && ref.current) drawHelmetSide(ref.current, colors, model, design, img); };
    draw(null);
    if (team?.logo && (design === 'logo' || design === 'logo_stripe')) {
      const img = new Image();
      img.onload = () => draw(img);
      img.src = team.logo;
    }
    return () => { live = false; };
  }, [team?.logo, design, model, JSON.stringify(colors)]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="helmet-closeup" style={{ width: 48 * scale, height: 44 * scale }} />;
}
