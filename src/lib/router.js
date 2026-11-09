import { useEffect, useState } from 'react';

// Tiny hash router: '' = home, '#league', '#team-<id>' = roster, '#data-check', '#login', '#console'.
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  if (h.startsWith('team-')) return { page: 'team', id: h.slice(5) };
  if (h === 'data-check') return { page: 'dataCheck' };
  if (h === 'login') return { page: 'login' };
  if (h === 'console') return { page: 'console' };
  if (h === 'control') return { page: 'control' };
  if (h === 'league') return { page: 'league' };
  return { page: 'home' };
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
  home: '#home',
  league: '#league',
  team: (id) => `#team-${id}`,
  dataCheck: '#data-check',
  login: '#login',
  console: '#console',
  control: '#control',
};

// Where someone lands after logging in.
export function homeFor(profile) {
  if (profile?.role === 'commissioner') return links.console;
  return links.home;
}
