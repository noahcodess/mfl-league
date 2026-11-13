import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import NetStinger from './NetStinger.jsx';
import IntroOpen from './IntroOpen.jsx';
import IntroMatchup from './IntroMatchup.jsx';
import IntroPlayer from './IntroPlayer.jsx';
import IntroField from './IntroField.jsx';
import { getTeam } from '../data/teams.js';
import { getPlayers } from '../data/players.js';
import { broadcastFor } from '../data/broadcast.js';
import { useGameKits } from '../data/gameKits.js';
import { useStadiums } from '../data/stadiums.js';
import { playerSpotlight, gameWeather } from '../lib/introFacts.js';
import { records } from '../lib/seasonStats.js';
import { STING_MID } from '../lib/pixelSwarm.js';

// Day game intro, about 20 seconds: transition, the network logo, the matchup, the player to watch, transition, then the field
// with the crowd and the weather. Primetime intros (part 2) add their own looks and an extra graphic or two.
const DAY = [['sting'], ['open', 2800], ['matchup', 4400], ['player', 4600], ['sting'], ['field', 7800], ['end']];

// The full-screen broadcast intro for a game. Ends on a "kickoff is next" card for now.
export default function GameIntro({ game, season, onClose, onReplay }) {
  const home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  const kits = useGameKits(home, away), stadium = useStadiums()[home.id];
  const rec = useMemo(() => records(season.weeks.slice(0, game.week - 1)), [season, game.week]);
  const spot = useMemo(() => playerSpotlight(game, season, getPlayers), [game, season]);
  const weather = useMemo(() => gameWeather(game, bc.prime), [game, bc.prime]);
  const steps = useMemo(() => DAY.filter(([s]) => s !== 'player' || spot), [spot]);
  const [i, setI] = useState(0), [scene, setScene] = useState(null), [sting, setSting] = useState(0);
  useEffect(() => {
    const [s, dur] = steps[i] || [];
    if (!s) return undefined;
    if (s === 'sting') { setSting((n) => n + 1); const t = setTimeout(() => setI(i + 1), STING_MID); return () => clearTimeout(t); }
    setScene(s);
    if (!dur) return undefined;
    const t = setTimeout(() => setI(i + 1), dur);
    return () => clearTimeout(t);
  }, [i, steps]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const spotTeam = spot && getTeam(spot.teamId);
  return createPortal(
    <div className="intro-overlay">
      <div className={`intro-screen net-${bc.net.key}${bc.prime ? ` prime show-${bc.show.key}` : ''}`}>
        {scene === 'open' && <IntroOpen bc={bc} game={game} home={home} away={away} />}
        {scene === 'matchup' && <IntroMatchup bc={bc} game={game} home={home} away={away} kits={kits} rec={rec} stadium={stadium} />}
        {scene === 'player' && spot && <IntroPlayer bc={bc} spot={spot} team={spotTeam} kit={spotTeam.id === home.id ? kits?.home : kits?.away} />}
        {scene === 'field' && <IntroField bc={bc} home={home} stadium={stadium} weather={weather} />}
        {scene === 'end' && (
          <div className="intro-scene sc-end">
            <img src={bc.logo} alt="" /><h2>Kickoff is next</h2><p>The game itself comes with the game engine.</p>
            <div><button className="btn" onClick={onReplay}>↺ Watch the intro again</button><button className="btn ghost" onClick={onClose}>Close</button></div>
          </div>
        )}
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        <button className="intro-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>,
    document.body,
  );
}
