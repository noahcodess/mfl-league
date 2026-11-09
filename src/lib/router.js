import { useEffect, useState } from 'react';

// Tiny hash router: '' = league, '#team-<id>' = team page, '#data-check', '#login', '#console'.
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.startsWith('team-')) return { page: 'team', id: h.slice(5) };
  if (h === 'data-check') return { page: 'dataCheck' };
  if (h === 'login') return { page: 'login' };
  if (h === 'console') return { page: 'console' };
  return { page: 'league' };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => { setRoute(parseHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const links = {
  league: '#league',
  team: (id) => `#team-${id}`,
  dataCheck: '#data-check',
  login: '#login',
  console: '#console',
};

// Where someone lands after logging in.
export function homeFor(profile) {
  if (profile?.role === 'commissioner') return links.console;
  if (profile?.team_id) return links.team(profile.team_id);
  return links.league;
}
