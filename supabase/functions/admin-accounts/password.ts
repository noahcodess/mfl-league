// Makes one-time temporary passwords: easy to read out loud, no look-alike characters (0/O, 1/l/I).
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";

function pick(set: string, n: number) {
  const bytes = crypto.getRandomValues(new Uint32Array(n));
  return Array.from(bytes, (b) => set[b % set.length]).join("");
}

// Shape: Abcd-efgh-2345 (14 characters). Shown to the commissioner once, never stored in plain text.
export function tempPassword() {
  return pick(UPPER, 1) + pick(LETTERS, 3) + "-" + pick(LETTERS, 4) + "-" + pick(DIGITS, 4);
}

export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;
export const EMAIL_DOMAIN = "accounts.mfl-league.com";
export const emailFor = (username: string) => `${username}@${EMAIL_DOMAIN}`;
