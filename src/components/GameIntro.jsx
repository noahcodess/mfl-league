import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import NetStinger from './NetStinger.jsx';
import IntroOpen from './IntroOpen.jsx';
import IntroMatchup from './IntroMatchup.jsx';
import IntroPlayer from './IntroPlayer.jsx';
import IntroTape from './IntroTape.jsx';
import IntroCrowd from './IntroCrowd.jsx';
import IntroLongShot from './IntroLongShot.jsx';
import { getTeam } from '../data/teams.js';
import { getPlayers } from '../data/players.js';
import { broadcastFor } from '../data/broadcast.js';
import { useGameKits } from '../data/gameKits.js';
import { useStadiums } from '../data/stadiums.js';
import { playerSpotlight, gameWeather } from '../lib/introFacts.js';
import { records } from '../lib/seasonStats.js';
import { teamStats } from '../lib/teamRanks.js';
import { STING_MID } from '../lib/pixelSwarm.js';

// Day games (~26s): transition, network logo, the two teams with three players each, transition, the crowd, transition, then a
// long shot of the field with the weather, who receives, and the scorebug. Primetime (~40s) adds the player to watch and a
// tale of the tape. Every shot fades out before the next one. [shot, how long in ms]
const DAY = [['sting'], ['open', 5000], ['matchup', 8600], ['sting'], ['crowd', 4800], ['sting'], ['field', 6500], ['end']];
const PRIME = [['sting'], ['open', 5500], ['matchup', 8800], ['player', 6800], ['tape', 7000], ['sting'], ['crowd', 4800], ['sting'], ['field', 6500], ['end']];
const FADE = 450;

// The full-screen broadcast intro for a game. Ends on a "kickoff is next" card for now.
// kick: { receiving, home_dir } from the kickoff coin flip. st: the live game state (for the scorebug).
export default function GameIntro({ game, season, kick, st, onClose, onReplay }) {
  const home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home);
  const kits = useGameKits(home, away), stadium = useStadiums()[home.id];
  const before = useMemo(() => season.weeks.slice(0, game.week - 1), [season, game.week]);
  const rec = useMemo(() => records(before), [before]);
  const stats = useMemo(() => teamStats(before), [before]);
  const spot = useMemo(() => playerSpotlight(game, season, getPlayers), [game, season]);
  const weather = useMemo(() => gameWeather(game, bc.prime), [game, bc.prime]);
  const steps = useMemo(() => (bc.prime ? PRIME : DAY).filter(([s]) => s !== 'player' || spot), [bc.prime, spot]);
  const [i, setI] = useState(0), [scene, setScene] = useState(null), [leaving, setLeaving] = useState(false), [sting, setSting] = useState(0);
  useEffect(() => {
    const [s, dur] = steps[i] || [];
    if (!s) return undefined;
    if (s === 'sting') { setSting((n) => n + 1); const t = setTimeout(() => setI(i + 1), STING_MID); return () => clearTimeout(t); }
    setScene(s); setLeaving(false);
    if (!dur) return undefined;
    const next = steps[i + 1]?.[0], fades = next && next !== 'sting';
    const a = fades ? setTimeout(() => setLeaving(true), dur - FADE) : null, b = setTimeout(() => setI(i + 1), dur);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [i, steps]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const spotTeam = spot && getTeam(spot.teamId);
  return createPortal(
    <div className="intro-overlay">
      <div className={`intro-screen net-${bc.net.key}${bc.prime ? ` prime show-${bc.show.key}` : ' day'}`}>
        <div className={`scene-wrap${leaving ? ' leaving' : ''}`} key={scene}>
          {scene === 'open' && <IntroOpen bc={bc} game={game} home={home} away={away} />}
          {scene === 'matchup' && <IntroMatchup bc={bc} game={game} home={home} away={away} kits={kits} rec={rec} stadium={stadium} />}
          {scene === 'player' && spot && <IntroPlayer bc={bc} spot={spot} team={spotTeam} kit={spotTeam.id === home.id ? kits?.home : kits?.away} />}
          {scene === 'tape' && <IntroTape home={home} away={away} rec={rec} stats={stats} />}
          {scene === 'crowd' && <IntroCrowd bc={bc} home={home} stadium={stadium} />}
          {scene === 'field' && <IntroLongShot bc={bc} home={home} away={away} stadium={stadium} weather={weather} kick={kick} st={st} />}
          {scene === 'end' && (
            <div className="intro-scene sc-end">
              <img src={bc.logo} alt="" /><h2>Kickoff is next</h2><p>The game itself comes with the game engine.</p>
              <div><button className="btn" onClick={onReplay}>↺ Watch the intro again</button><button className="btn ghost" onClick={onClose}>Close</button></div>
            </div>
          )}
        </div>
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        <button className="intro-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>,
    document.body,
  );
}
