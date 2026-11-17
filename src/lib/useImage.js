// Loads a picture so it can be painted onto a canvas. Returns the image once it's ready (null until then). Uploaded logos
// (from storage, another origin) load with CORS so the field can paint them into the turf.
import { useEffect, useState } from 'react';

export function useImage(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new Image();
    if (/^https?:/.test(src)) i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i); i.src = src;
  }, [src]);
  return img;
}
