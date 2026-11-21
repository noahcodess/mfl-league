import React, { useEffect } from 'react';
import BoothControls from '../components/BoothControls.jsx';
import BoothCoaches from '../components/BoothCoaches.jsx';
import BoothKeyPlay from '../components/BoothKeyPlay.jsx';
import BoothGraphics from '../components/BoothGraphics.jsx';
import BoothStats from '../components/BoothStats.jsx';
import BoothTest from '../components/BoothTest.jsx';
import useBoothFeed from '../components/useBoothFeed.js';
import { useGame } from '../data/liveSeason.js';
import { useCoachPresence } from '../data/presence.js';
import { useCoaches } from '../data/coaches.js';
import { useCoachedTeams } from '../data/coached.js';
import { getTeam, isTestMode } from '../data/teams.js';
import { isRealGame } from '../data/gameState.js';

// Commissioner Window: Broadcast Booth. Its own browser window for his second monitor while the broadcast is screen-shared.
// Everything only he sees: playback controls and jumps, both coaches (online, last seen, or Bot) and their timeouts, the key
// play with the coach's options and the play clock, graphics before they go on air (deny them), any player's stats with a
// button to put his card up, the stat sheet, and test tools. It drives the broadcast in the main window.
export default function GameBoothPage({ id }) {
  const found = useGame(id), feed = useBoothFeed(id), presence = useCoachPresence(true), coaches = useCoaches(), coached = useCoachedTeams();
  useEffect(() => { document.title = 'Commissioner Window: Broadcast Booth'; }, []);
  if (!found) return <div className="desk-page"><p className="dim">Looking for that game...</p></div>;
  const { game } = found, ids = { home: game.home, away: game.away }, s = feed.state, sc = s?.score;
  return (
    <div className="desk-page booth">
      <header className="desk-top">
        <div><b>COMMISSIONER WINDOW: BROADCAST BOOTH</b><small>Week {game.week} · only you see this window · keep the broadcast on your shared screen</small></div>
        <div className="booth-score">
          {['away', 'home'].map((k) => <span key={k}><img src={getTeam(ids[k]).logo} alt="" />{getTeam(ids[k]).code} <b>{sc ? sc[k] : '-'}</b></span>)}
          <em className={s ? 'on' : ''}>{s ? (s.paused ? '⏸ PAUSED' : s.brk ? `📺 ${s.brk === 'half' ? 'HALFTIME REPORT' : 'OVERTIME RULES'}` : s.i >= s.total ? 'FINAL' : '● LIVE') : 'Waiting for the broadcast'}</em>
        </div>
      </header>
      {!feed.supported && <p className="notice bad">This browser can't link windows. Use Chrome, Edge or Firefox.</p>}
      {!s && <p className="notice">Start or resume the game in the main window (Live → the game → ▶ Start game). This booth links up by itself, in this same browser.</p>}
      {s && (
        <div className="booth-cols">
          <div><BoothControls s={s} send={feed.send} /><BoothCoaches s={s} ids={ids} coaches={coaches} presence={presence} coached={coached} send={feed.send} /></div>
          <div><BoothKeyPlay s={s} ids={ids} /><BoothGraphics s={s} send={feed.send} />{s.play?.text && <p className="booth-last">Last play: {s.play.text}</p>}</div>
          <div><BoothStats roster={feed.roster} stats={feed.stats} ids={ids} send={feed.send} />{(isTestMode() || !isRealGame(id)) && <BoothTest s={s} ids={ids} send={feed.send} />}</div>
        </div>
      )}
    </div>
  );
}
