// End zone shadows: puts a shadow under any word picture, using the word's own shape. Styles: none, drop (a short step
// down and right), long (a 5-step trail), glow (a soft halo all around). Colors: dark team color, black, or the team accent.
import { shade, brightness } from './pixels.js';

export const SHADOWS = [['none', 'None'], ['drop', 'Drop'], ['long', 'Long'], ['glow', 'Glow']];
export const SHADOW_COLORS = [['dark', 'Dark'], ['black', 'Black'], ['accent', 'Accent']];
const M = 6;

export function shadowColor(team, which, ink) {
  if (which === 'black') return '#101114';
  if (which === 'accent') { // the accent, unless it matches the letters or the turf; then the next color that stands apart from both
    const far = (c) => c && Math.abs(brightness(c) - brightness(ink)) > 0.25 && Math.abs(brightness(c) - brightness(team.color)) > 0.12;
    return [team.accent, shade(team.color, 1.5), shade(team.color, 0.25)].find(far) || '#101114';
  }
  return shade(team.color, 0.42);
}

// word: a canvas. Returns a new canvas (6 cells bigger on every side) with the shadow under the word.
export function withShadow(word, style, color) {
  const out = document.createElement('canvas'); out.width = word.width + M * 2; out.height = word.height + M * 2;
  const x = out.getContext('2d');
  if (style && style !== 'none') {
    const sil = document.createElement('canvas'); sil.width = word.width; sil.height = word.height;
    const s = sil.getContext('2d'); s.drawImage(word, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, sil.width, sil.height);
    const at = (dx, dy, a = 1) => { x.globalAlpha = a; x.drawImage(sil, M + dx, M + dy); };
    if (style === 'drop') at(2, 2);
    if (style === 'long') for (let k = 5; k >= 1; k--) at(k, k);
    if (style === 'glow') { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && (dx || dy)) at(dx, dy, 0.28); }
    x.globalAlpha = 1;
  }
  x.drawImage(word, M, M);
  return out;
}
