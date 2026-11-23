// The six things a crowd can do in the stadium shot (what one fan is doing at one moment) and which one a game gets:
// jump, the wave, towel wave, cheering, an upper-deck card stunt that spells the team's name, and phone lights at night.
import { G } from './pixelFont.js';
import { W, seatSpots } from './stadiumLayout.js';

export const ACTS = { jump: 'Jumping', wave: 'The wave', towels: 'Towel wave', whirl: 'Towel whirl', cheer: 'Cheering', cards: 'Card stunt', lights: 'Phone lights' };
export const JUMP_MS = 460;

// seed: any number that stays the same for a game. dress: the color every fan wears, if the home team turned that on.
export function pickAct(team, seed, night, dress) {
  if (team.id === 'ddc') return 'jump'; // the Bounce House never stops jumping
  if (team.id === 'snm' && dress) return 'towels'; // Creepers whiteout: everyone gets a towel
  const pool = night ? ['lights', 'wave', 'towels', 'cards', 'cheer'] : ['wave', 'cheer', 'cards', 'towels', 'jump'];
  return pool[seed % pool.length];
}

// Which upper-deck seats hold up the letters of a word: a Set of 'col,row'. Each letter gets five seats in a row with no
// stairs through it (tries every starting seat and keeps the most centered fit); a word too long for that just runs across.
export function cardMask(word) {
  const cols = [...new Set(seatSpots('upper', true).map((s) => s.col))], text = word.toUpperCase().slice(0, Math.floor(cols.length / 6)), on = new Set();
  let best = null;
  for (let start = 0; start < cols.length; start++) {
    const at = [];
    for (let p = start; at.length < text.length && p + 4 < cols.length; ) { if (cols[p + 4] - cols[p] === 4) { at.push(p); p += 6; } else p += 1; }
    const off = Math.abs(start - (cols.length - (at[at.length - 1] + 5)));
    if (at.length === text.length && (!best || off < best.off)) best = { at, off };
  }
  const c0 = Math.floor((cols.length - (text.length * 6 - 1)) / 2), spots = best ? best.at : [...text].map((_, i) => c0 + i * 6);
  [...text].forEach((ch, i) => (G[ch] || []).forEach((bits, row) => { for (let c = 0; c < 5; c++) if ((bits >> (4 - c)) & 1) on.add(`${cols[spots[i] + c]},${row + 3}`); }));
  return on;
}

function cheer(f, t) {
  const k = Math.floor(t / 170 + f.ph * 8) % 8, wild = f.ph < 0.22;
  if (f.prop) return { dy: k < 2 ? -1 : 0, arms: f.prop === 'sign' ? 'up' : 'r', item: k < 6 ? f.prop : null };
  if (wild) return { dy: k < 4 ? -1 : 0, arms: k < 4 ? 'up' : null };
  return { dy: 0, arms: k < 2 ? 'l' : k < 4 ? 'r' : null };
}
const idle = (f, t) => { const k = Math.floor(t / 240 + f.ph * 10) % 10; return f.prop && k < 6 ? { dy: 0, arms: f.prop === 'sign' ? 'up' : 'r', item: f.prop } : { dy: k === 0 ? -1 : 0, arms: k === 0 ? 'up' : null }; };

const DO = {
  cheer,
  jump(f, t, env) {
    if (!env.all && f.ph > 0.88) return idle(f, t);
    const q = ((t + f.ph * (env.all ? 50 : 130)) % JUMP_MS) / JUMP_MS, air = q < 0.55;
    return { dy: air ? -Math.round(Math.sin((q / 0.55) * Math.PI) * (f.big ? 4 : 3)) : 0, arms: air ? 'up' : f.prop ? 'r' : null, item: air ? null : f.prop === 'finger' ? f.prop : null };
  },
  wave(f, t) {
    const c = ((t * 0.17) % (W + 240)) - 120 - (f.big ? 0 : 36), d = Math.abs(f.x - c);
    if (d > 36) return idle(f, t);
    const k = Math.cos((d / 36) * Math.PI / 2);
    return { dy: -Math.round(k * (f.big ? 4 : 3)), arms: k > 0.4 ? 'up' : null };
  },
  towels(f, t, env) {
    if (f.ph > (f.big ? 0.95 : 0.6)) return idle(f, t); // fewer towels up top so the upper deck doesn't turn to static
    const frame = Math.floor(t / 95 + f.ph * 4) % 4;
    return { dy: frame % 2 ? -1 : 0, arms: 'r', item: 'towel', frame, color: env.towel };
  },
  whirl(f, t, env) {   // the whiteout: every fan swings a white towel around in circles over his head
    const a = t / 150 + f.ph * 6.283;
    return { dy: Math.sin(a) > 0.5 ? -1 : 0, arms: 'r', item: 'whirl', ang: a, color: env.towel };
  },
  cards(f, t, env) {
    if (f.big || t < 350 + f.x * 2.4) return cheer(f, t); // the cards flip up in a sweep; the lower bowl just cheers
    const lit = env.mask.has(`${f.col},${f.row}`), flip = Math.floor((t - f.x * 1.6) / 1700) % 2 === 1;
    return { dy: 0, item: 'card', color: lit !== flip ? env.ink : env.paper };
  },
  lights(f, t) {
    if (f.ph > 0.9) return idle(f, t);
    return { dy: 0, arms: 'r', item: 'light', lean: Math.round(Math.sin(t / 420 + f.row * 0.35) * 1.4) };
  },
};

// env: { all, towel, mask, ink, paper }.
export const fanPose = (act, f, t, env) => (DO[act] || cheer)(f, t, env);
