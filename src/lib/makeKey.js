// Makes the commissioner key: 24 random characters mixing capital letters, numbers and symbols (no look-alikes).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?+=';

function randomFrom(set, count) {
  const bytes = crypto.getRandomValues(new Uint32Array(count));
  return Array.from(bytes, (b) => set[b % set.length]);
}

// 10 letters, 8 numbers, 6 symbols, shuffled. Shown as 6 groups of 4 so it's easier to copy: ABCD-EF12-...
export function makeKey() {
  const chars = [...randomFrom(UPPER, 10), ...randomFrom(DIGITS, 8), ...randomFrom(SYMBOLS, 6)];
  const order = crypto.getRandomValues(new Uint32Array(chars.length));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = order[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export const groupKey = (key) => key.match(/.{1,4}/g).join(' ');
export const cleanKey = (typed) => typed.replace(/\s+/g, '');
