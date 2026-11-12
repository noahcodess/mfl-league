import React, { useEffect, useRef, useState } from 'react';
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H } from '../lib/fieldLayout.js';
import { drawField } from '../lib/fieldDraw.js';
import { drawSurroundings, makeFans, drawFans } from '../lib/standsDraw.js';
import { SPOTS, clampCam, glide, blit } from '../lib/gameCamera.js';
import { leagueLogo } from '../data/logos.js';

const TOUR = ['wide', 'midfield', 'left', 'stands', 'right'];
function useImage(src) {
  const [img, setImg] = useState(null);
  useEffect(() => { if (!src) { setImg(null); return; } const i = new Image(); i.onload = () => setImg(i); i.src = src; }, [src]);
  return img;
}

// The game screen: a team's stadium through the one game camera. Buttons jump to a spot, +/- and the mouse wheel zoom,
// dragging pans, and "Camera demo" glides around on its own. Fans in the front rows move. The game's players will be drawn here.
export default function GameField({ team, look = {}, crowd = 'normal' }) {
  const view = useRef(null);
  const world = useRef(null), base = useRef(null);
  const cam = useRef(SPOTS.wide.cam), target = useRef(SPOTS.wide.cam);
  const [spot, setSpot] = useState('wide');
  const [demo, setDemo] = useState(false);
  const teamLogo = useImage(team.logo), mfl = useImage(leagueLogo.light);

  useEffect(() => { // paint the stadium once, then keep the fans moving
    const mk = () => { const c = document.createElement('canvas'); c.width = WORLD_W; c.height = WORLD_H; return c; };
    base.current = mk(); world.current = mk();
    const bctx = base.current.getContext('2d');
    drawSurroundings(bctx, team, look.style); drawField(bctx, team, { teamLogo, leagueLogo: mfl }, look);
    const fans = makeFans(team, crowd), wctx = world.current.getContext('2d');
    let tick = 0;
    const beat = () => { wctx.drawImage(base.current, 0, 0); drawFans(wctx, fans, tick++); };
    beat();
    const id = setInterval(beat, 200);
    return () => clearInterval(id);
  }, [team.id, team.color, team.accent, teamLogo, mfl, crowd, look.font, look.design, look.style]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // camera
    let raf;
    const frame = () => {
      cam.current = glide(cam.current, target.current);
      if (view.current && world.current) blit(view.current.getContext('2d'), world.current, cam.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!demo) return undefined;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % TOUR.length; target.current = SPOTS[TOUR[i]].cam; setSpot(TOUR[i]); }, 2600);
    return () => clearInterval(id);
  }, [demo]);

  const go = (key) => { setDemo(false); setSpot(key); target.current = SPOTS[key].cam; };
  const zoom = (f) => { setDemo(false); setSpot(''); target.current = clampCam({ ...target.current, zoom: target.current.zoom * f }); };
  const drag = useRef(null);
  const move = (e) => {
    if (!drag.current) return;
    const k = VIEW_W / e.currentTarget.getBoundingClientRect().width / cam.current.zoom;
    target.current = clampCam({ ...target.current, x: target.current.x - (e.clientX - drag.current.x) * k, y: target.current.y - (e.clientY - drag.current.y) * k });
    drag.current = { x: e.clientX, y: e.clientY };
  };
  return (
    <div className="game-field">
      <canvas ref={view} width={VIEW_W} height={VIEW_H} className="gf-screen"
        onPointerDown={(e) => { setDemo(false); setSpot(''); drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={move} onPointerUp={() => { drag.current = null; }}
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 0.87)} />
      <div className="gf-controls">
        {Object.entries(SPOTS).map(([k, s]) => <button key={k} className={spot === k ? 'on' : ''} onClick={() => go(k)}>{s.label}</button>)}
        <span className="gf-zoom"><button onClick={() => zoom(0.75)}>−</button><button onClick={() => zoom(1.33)}>+</button></span>
        <button className={demo ? 'on' : ''} onClick={() => setDemo(!demo)}>🎥 Camera demo</button>
      </div>
    </div>
  );
}
