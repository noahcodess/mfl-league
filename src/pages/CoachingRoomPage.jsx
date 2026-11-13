import React, { useEffect, useMemo, useState } from 'react';
import CoachRoom from '../components/CoachRoom.jsx';
import TeamBadge from '../components/TeamBadge.jsx';
import { useGame, useLiveSeason } from '../data/liveSeason.js';
import { useGameState, isRealGame, callTimeout, PREGAME } from '../data/gameState.js';
import { useCoaches } from '../data/coaches.js';
import { getTeam } from '../data/teams.js';
import { broadcastFor } from '../data/broadcast.js';
import { records } from '../lib/seasonStats.js';

const OPENS_BEFORE = 5 * 60e3;
const until = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
  return `${d ? `${d}d ` : ''}${d || h ? `${h}h ` : ''}${m}m ${String(s % 60).padStart(2, '0')}s`; };

// The coach's game this week (or the game in the link): the real schedule in the season, or the sample season to preview.
function useMyGame(id, teamId) {
  const byId = useGame(id || 'none'), season = useLiveSeason(false); // the real season once it's on, else the sample
  return useMemo(() => {
    if (id) return byId;
    const week = season.weeks[season.current - 1], game = week?.games.find((g) => g.home === teamId || g.away === teamId);
    return game ? { game, season } : null;
  }, [id, byId, season, teamId]);
}

// The coaching room for a coach's game. Before it opens: a countdown (it opens 5 minutes before kickoff, once the commissioner
// has set a time). Then: the live mini scorebug, the coach, play calls and the timeout button. No game video, ever.
export default function CoachingRoomPage({ id, teamId, canControl }) {
  const found = useMyGame(id, teamId), coaches = useCoaches();
  const [now, setNow] = useState(Date.now()), [version, setVersion] = useState(0), [local, setLocal] = useState(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const gameId = found?.game?.id, live = useGameState(gameId, version);
  const rec = useMemo(() => (found ? records(found.season.weeks.slice(0, found.game.week - 1)) : {}), [found]);
  if (!teamId && !canControl) return <p className="dim">The coaching room is for the two coaches in a game.</p>;
  if (!found) return <section className="card cr-wait"><h2>🎧 Coaching room</h2><p className="dim">You don't have a game this week. The room opens on game day.</p></section>;
  const { game } = found, home = getTeam(game.home), away = getTeam(game.away), bc = broadcastFor(game, home), real = isRealGame(game.id);
  const me = [home.id, away.id].includes(teamId) ? teamId : home.id;
  if (real && !canControl && ![home.id, away.id].includes(teamId)) return <p className="dim">This room is for the {away.name} and {home.name} coaches.</p>;
  const startsAt = game.startsAt ? Date.parse(game.startsAt) : null, opensAt = startsAt && startsAt - OPENS_BEFORE;
  if (real && (!startsAt || now < opensAt)) {
    return (
      <section className="card cr-wait">
        <h2>🎧 Coaching room</h2>
        <div className="gp-teams"><TeamBadge team={away} size="lg" /><b>at</b><TeamBadge team={home} size="lg" /></div>
        <p>Week {game.week} · {bc.title}</p>
        {startsAt ? <>
          <p className="cr-count">{until(opensAt - now)}</p>
          <p className="dim">until the room opens (5 minutes before kickoff at {new Date(startsAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}).</p>
        </> : <p className="dim">The commissioner hasn't set a kickoff time yet. The room opens 5 minutes before kickoff.</p>}
      </section>
    );
  }
  const st = real ? live : (local || PREGAME);
  const onTimeout = async () => {
    if (real) { await callTimeout(game.id); setVersion((v) => v + 1); return; }
    const side = me === home.id ? 'home' : 'away';
    setLocal((s) => { const c = s || { ...PREGAME, status: 'live' }; return { ...c, clock_running: false, [`${side}_timeouts`]: c[`${side}_timeouts`] - 1, last_timeout: me, last_timeout_at: new Date().toISOString() }; });
  };
  return (
    <>
      {!real && <p className="ls-sample">🧪 Sample game preview: the timeout works here, but the live clock only runs on real games.</p>}
      <CoachRoom bc={bc} game={game} home={home} away={away} me={me} coach={coaches?.[me] || { team_id: me, name: 'Head coach' }}
        st={!real && !local ? { ...PREGAME, status: 'live' } : st} rec={rec} onTimeout={onTimeout} />
    </>
  );
}
