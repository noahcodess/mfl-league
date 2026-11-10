// Test-only fake logins for screenshots (?demo=coach|commish|change|setup|unlock). Switched off in the real site build.
import { store } from './store.js';

const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
export const DEMO = params ? params.get('demo') : null;
// Test-only: ?step=3 pretends the league is at that offseason step (&round=N for free agency). Re-applied after live data loads.
export function applyDemoOverrides() {
  if (!DEMO) return;
  if (params.get('step')) store.league.meta.offseasonStep = Number(params.get('step'));
  if (params.get('round')) store.league.meta.faRound = Number(params.get('round'));
}
applyDemoOverrides();

const coach = { user_id: 'd1', username: 'noah', role: 'coach', team_id: 'snm', display_name: 'Noah', must_change_password: false };
const commish = { user_id: 'd0', username: 'sserg', role: 'commissioner', team_id: null, display_name: 'SSerg', must_change_password: false };

export function demoSession() {
  const base = { status: 'in', user: { id: 'demo' }, keyStatus: 'set', unlocked: true, refresh: async () => {} };
  if (DEMO === 'visitor') return { ...base, status: 'out', user: null, profile: null };
  if (DEMO === 'coach') return { ...base, profile: coach };
  if (DEMO === 'owner') return { ...base, profile: { ...coach, site_owner: true } };
  if (DEMO === 'change') return { ...base, profile: { ...coach, must_change_password: true } };
  if (DEMO === 'setup') return { ...base, profile: commish, keyStatus: 'unset', unlocked: false };
  if (DEMO === 'unlock') return { ...base, profile: commish, unlocked: false };
  return { ...base, profile: commish };
}

export const demoAccounts = [
  { ...commish, last_sign_in_at: '2026-11-09T21:40:00Z', created_at: '2026-11-09T20:00:00Z' },
  { ...coach, last_sign_in_at: '2026-11-09T22:05:00Z' },
  { user_id: 'd2', username: 'blaze_gm', role: 'coach', team_id: 'crf', display_name: 'Blaze', must_change_password: true, last_sign_in_at: null },
  { user_id: 'd3', username: 'tidecaller', role: 'coach', team_id: 'ocn', display_name: null, must_change_password: false, last_sign_in_at: '2026-11-08T01:12:00Z' },
];

// Test-only potentials for the demo coach's team (the real ones live in the database).
export function demoPotentials() {
  return { 'snm-01': 4.5, 'snm-02': 5.0, 'snm-04': 4.5, 'snm-06': 4.5 };
}

// Test-only negotiation stand-ins (the real answers come from the server).
export const demoQuote = { ask: 155000, years: 3, max_years: 3, market: 140000, cap_room: 1480000 };
export function demoReply(perYear) {
  if (perYear >= 125000) return { result: 'accepted', line: "Deal. Let's get to work.", patience: 2, counter: null };
  if (perYear >= 106000) return { result: 'countered', line: "We're close. Get me to $125K a year for 3 years and it's done.", patience: 2, counter: { years: 3, per_year: 125000, role: 'starter' } };
  return { result: 'rejected', line: "That's a long way off.", patience: 1, counter: null };
}
