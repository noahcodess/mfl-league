// Contract math: years left, cap hit, labels, and who's up for re-signing. Works on live contracts and the bundled import.
import { store } from './store.js';

const season = () => store.league.meta.currentSeason;

// Live contracts carry their seasons; the bundled import only has years + total (and its years included Season 7).
export function contractOf(p) {
  const c = p.contract;
  if (!c) return null;
  if (c.lastSeason != null) return c;
  return { perYear: Math.round(c.total / c.years), total: c.total, firstSeason: 7, lastSeason: 6 + c.years, source: 'import' };
}

// Seasons left on the deal, counting the upcoming season. 0 = it ends this offseason.
export function yearsLeft(p) {
  const c = contractOf(p);
  return c ? Math.max(0, c.lastSeason - season() + 1) : 0;
}

// On a team, but no deal covering the coming season: re-sign him or he walks.
export const isExpiring = (p) => (p.status ?? 'active') === 'active' && !!p.teamId && yearsLeft(p) === 0;

// Only deals that cover the coming season count against the cap.
export const capHitOf = (p) => (yearsLeft(p) > 0 ? contractOf(p).perYear : 0);

export function contractLabel(p) {
  const left = yearsLeft(p);
  if (!contractOf(p) || left === 0) return 'Expiring';
  return left === 1 ? 'Final year' : `${left} yrs left`;
}
