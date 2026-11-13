import React, { useEffect, useRef } from 'react';

// A small canvas that runs one of the pixel effects (pixelSwarm.js) every frame and gets stretched chunky to fill its box.
// make(w, h) returns a draw(ctx, ms) function.
export default function PixelCanvas({ make, w = 320, h = 180, className = '', deps = [] }) {
  const ref = useRef(null);
  useEffect(() => {
    const draw = make(w, h), ctx = ref.current.getContext('2d'), t0 = performance.now();
    let raf;
    const frame = (now) => { draw(ctx, now - t0); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={w} height={h} className={`pixel-canvas ${className}`} aria-hidden="true" />;
}
