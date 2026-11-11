import React, { useEffect, useState } from 'react';
import BirthdayShow from './BirthdayShow.jsx';
import { useFarewell } from '../data/farewell.js';
import { currentSeason } from '../data/teams.js';

const SEEN = (season, at) => `mfl-bday-seen-${season}-${at}`;
const seen = (key) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const markSeen = (key) => { try { localStorage.setItem(key, '1'); } catch { /* private mode: it may replay, that's fine */ } };

// Decides when the Birthday & Farewell show plays: once per browser, within 3 days of the birthday. If it ran on its
// countdown it plays for everyone wherever they are. If the commissioner ran it by hand, coaches still see it anywhere,
// but the commissioner only sees it on the Live tab (so he can share his screen and never misses it).
// "Watch the show" buttons replay it any time.
export default function BirthdayShowGate({ page, viewer, version }) {
  const season = currentSeason();
  const data = useFarewell(season, version);
  const [playing, setPlaying] = useState(false);
  const isCommish = viewer?.role === 'commissioner' || !!viewer?.site_owner;

  useEffect(() => {
    const replay = () => setPlaying(true);
    window.addEventListener('mfl-bday-replay', replay);
    return () => window.removeEventListener('mfl-bday-replay', replay);
  }, []);

  useEffect(() => {
    if (!data?.at || playing) return;
    const fresh = Date.now() - Date.parse(data.at) < 3 * 864e5;
    if (fresh && !seen(SEEN(season, data.at)) && (data.auto || !isCommish || page === 'live')) setPlaying(true);
  }, [data, page, isCommish]);

  if (!playing || !data) return null;
  return <BirthdayShow retired={data.retired || []} season={season} onClose={() => { if (data.at) markSeen(SEEN(season, data.at)); setPlaying(false); }} />;
}
