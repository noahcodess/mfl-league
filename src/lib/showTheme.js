// The award ceremony's colors come from that season's Craft Bowl: its two colors tint the stage's backdrop, the big
// screen, the light, the labels and the confetti. Falls back to royal purple when no Craft Bowl colors are set.
import { shade, mix } from './pixels.js';

const rgb = (hex) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const ok = (c) => typeof c === 'string' && /^#?[0-9a-f]{3,6}$/i.test(c);

// plan: { primary, secondary } from the season's Craft Bowl plan (or null).
export function showTheme(plan) {
  const primary = ok(plan?.primary) ? plan.primary : '#8a4cff', secondary = ok(plan?.secondary) ? plan.secondary : '#2a0f4a';
  const deep = shade(secondary, 0.45);
  return {
    primary, secondary,
    rgb: rgb(primary).join(','),                                                   // the screen's glow and theme light
    accent: shade(primary, 1.35),                                                  // small labels on the screen
    screen: [shade(deep, 0.8), shade(secondary, 0.85), mix(shade(primary, 0.5), '#3a0a2a', 0.35)],   // the screen's gradient
    backdrop: [shade(deep, 0.55), shade(mix(secondary, primary, 0.25), 0.55)],      // the cyclorama behind the screen
    pleat: shade(deep, 0.4),
    star: shade(primary, 1.5),
    confetti: ['#e9c368', '#fff0b0', '#ffffff', primary, shade(primary, 1.4), '#c79a3a'],
  };
}
