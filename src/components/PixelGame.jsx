// The pixel broadcast: plays a finished sim back on the stadium field, one play at a time. Players line up, run the play
// the report describes, and the network scorebug follows along. Pause, change speed, or skip ahead. It only shows a game
// the engine already played; nothing here can change what happens.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameField from './GameField.jsx';
import Scorebug from './Scorebug.jsx';
import { broadcastFor } from '../data/broadcast.js';
import { useGameKits } from '../data/gameKits.js';
import { useDrips, helmetDesign } from '../data/drip.js';
import { looksFor } from '../lib/portraitLooks.js';
import { buildOf } from '../lib/fieldSprite.js';
import { buildScene, seek } from '../lib/sceneBuild.js';
import { drawScene } from '../lib/sceneDraw.js';
import { yardX, MID_Y, YD } from '../lib/fieldLayout.js';
import { paceFor, shotsFor, slowAt } from '../lib/pacing.js';
import { clockFace } from '../lib/broadcastClock.js';
import { camTarget } from '../lib/broadcastCam.js';
import NetStinger from './NetStinger.jsx';
import { STING_MID } from '../lib/pixelSwarm.js';
import { FieldGoalBar, BallOnTag, ballOnPlays, yardLineText } from './BroadcastGraphics.jsx';

const SPEEDS = [1, 2, 4];
const everyone = (lineups, side) => [...lineups[side].all, ...Object.values(lineups[side].kickTeams).flatMap((u) => u.players)].filter(Boolean);
// One look per player: his Drip tab sprite in this game's uniform, with his face, number, helmet, gear and body size.
function makeLooks(lineups, kits, teams, drips) {
  const out = {};
  for (const side of ['home', 'away']) {
    const kit = kits[side];
    everyone(lineups, side).forEach((p) => {
      if (out[p.id]) return;
      out[p.id] = { key: `${p.id}|${kit.name}|${side}|${drips ? 1 : 0}`, colors: kit.colors, face: looksFor(p), number: p.number ?? 1, drip: drips?.[p.id], design: helmetDesign(teams[side]), ...buildOf(p) };
    });
  }
  return out;
}

// game: a result from playGame. teams: { home, away }. lineups: from useGameLineups. match: the scheduled game (its network and
// uniforms), if it's a real one. full: fills the broadcast screen with the controls on top.
export default function PixelGame({ game, teams, lineups, onClose, match = null, full = false }) {
  const [sting, setSting] = useState(0), [i, setI] = useState(0), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [beat, setBeat] = useState({ post: false, phase: 'live' });
  const kits = useGameKits(teams.home, teams.away, match), ids = useMemo(() => ['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => p.id)), [lineups]), drips = useDrips(ids);
  const looks = useMemo(() => (kits ? makeLooks(lineups, kits, teams, drips) : {}), [lineups, kits?.home?.name, kits?.away?.name, drips]); // eslint-disable-line react-hooks/exhaustive-deps
  const bc = useMemo(() => broadcastFor(match || { window: null }, teams.home), [match, teams.home]);
  const play = game.plays[i], done = i >= game.plays.length, pace = useMemo(() => play && paceFor(play), [play]);
  const S = useMemo(() => (play ? buildScene(play, lineups, pace, game.seed || 1) : null), [play, lineups, pace, game.seed]), shots = useMemo(() => S && shotsFor(S, pace), [S, pace]);
  const live0 = useRef(null); useEffect(() => { live0.current = S; }, [S]);   // the play as it's being acted out right now
  const clock = useRef({ t: 0, last: 0, phase: 'live', rt: 0, hold: 0 }), ctl = useRef({}); ctl.current = { speed, paused, S, i, shots, pace };
  useEffect(() => { Object.assign(clock.current, { t: 0, phase: 'live', rt: 0, hold: 0 }); setBeat({ post: false, phase: 'live' }); }, [i]);
  useEffect(() => { // the play clock, scorebug flip and which shot we're in, a few times a second
    const id = setInterval(() => { const { S: s, i: n, pace: pc } = ctl.current, c = clock.current; if (s) setBeat({ post: c.t >= s.tEnd, t: c.t, phase: c.phase, ...clockFace(game, n, c.t, s, c.phase, pc.dead) }); }, 100);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {   // the camera operator (broadcastCam) decides the shot
      const { S: s, shots: sh } = ctl.current, c = clock.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      return camTarget(s, live0.current || s, { phase: c.phase, t: c.phase === 'replay' ? c.rt : c.t, slow: slowAt(sh, c.t) < 1, first: ctl.current.i === 0, flag: sh?.flag });
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p, shots: sh, pace: pc } = ctl.current, dt = c.last ? Math.min(0.1, (now - c.last) / 1000) * sp : 0;
      c.last = now; if (!s || !sh) return;
      const next = () => { c.t = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); };
      if (!p) {
        const toReplay = () => { c.phase = 'sting'; c.hold = 0; setSting((n) => n + 1); };   // the network transition covers the cut to the replay
        if (c.phase === 'live') { c.t += dt * slowAt(sh, c.t); if (c.t > s.tEnd + pc.dead) { if (sh.flag) { c.phase = 'flag'; c.hold = 0; } else if (sh.replay) toReplay(); else next(); } }
        else if (c.phase === 'flag') { c.hold += dt; if (c.hold > 2.4) { if (sh.replay) toReplay(); else next(); } }
        else if (c.phase === 'sting') { c.hold += dt; if (c.hold > STING_MID / 1000) { c.phase = 'replay'; c.rt = sh.replay.from; } }
        else if (c.phase === 'replay') { c.rt += dt * sh.replay.speed; if (c.rt > sh.replay.to) { setSting((n) => n + 1); next(); } }   // and the cut back
      }
      live0.current = seek(live0.current || s, c.phase === 'replay' ? c.rt : c.t);   // step the live play to now (a replay rewinds and replays it)
      drawScene(ctx, live0.current, cam, looks);
    },
  }), [looks]);
  const tagAt = useMemo(() => ballOnPlays(game.plays), [game.plays]), pre = !beat.post && beat.phase === 'live' && play, bt = beat.t ?? 0;
  const fgKick = play?.kind === 'fg' && play.events.find((e) => e.type === 'kick'), kName = fgKick && everyone(lineups, play.off).find((p) => p.id === fgKick.by)?.name;
  const b4 = play && { quarter: play.before.quarter, clock: play.before.clock, score: play.before.score, poss: play.kind === 'kickoff' ? play.def : play.off,
    down: ['kickoff', 'xp', 'two'].includes(play.kind) ? null : play.before.down, toGo: play.before.toGo, ballOn: play.before.ballOn };   // before the snap
  const a = done ? game.plays[game.plays.length - 1].after : beat.post ? play.after : b4;
  const ticking = !done && beat.clock != null, clk = ticking ? beat.clock : a.clock;
  const st = { status: done ? 'final' : 'live', quarter: a.quarter, clock_left: Math.max(0, Math.ceil(clk)), clock_running: ticking && beat.running, home_score: a.score.home, away_score: a.score.away, home_timeouts: 3, away_timeouts: 3,
    possession: teams[a.poss]?.id, down: a.down, togo: a.toGo, ball_on: a.ballOn, play_clock: beat.playClock ?? 40 };
  return (
    <div className={`pg-wrap${full ? ' pg-full' : ''}`}>
      <div className="pg" data-kind={play?.kind}>
        <GameField team={teams.home} live={live} crowd={kits?.fans || 'normal'} />
        {beat.post && beat.phase === 'live' && play?.headline && <div className="pg-headline" key={i}>{play.headline}</div>}
        {beat.phase === 'replay' && <div className={`pg-replay net-${bc.net.key}`}><b>REPLAY</b></div>}
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        {beat.phase === 'flag' && shots?.flag && <div className="pg-flag"><span>🚩</span>{shots.flag.text}</div>}
        {!beat.post && pace?.keyPlay && <div className="pg-key">KEY PLAY</div>}
        {done && <div className="pg-headline final">FINAL</div>}
        {pre && fgKick && bt > 0.5 && bt < pace.T0 + 0.6 && <FieldGoalBar key={`fg${i}`} out={bt > pace.T0 + 0.15} bug={bc.bug} dist={fgKick.dist} kicker={kName} />}
        {pre && tagAt.has(i) && bt > 0.6 && bt < Math.min(4, pace.T0 - 0.2) && <BallOnTag key={`bo${i}`} out={bt > Math.min(4, pace.T0 - 0.2) - 0.45} bug={bc.bug} team={teams[play.off]} dir={play.off === 'away' ? 1 : -1} text={yardLineText(play.before.ballOn, teams[play.off], teams[play.def])} />}
        <div className="pg-bug"><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} /></div>
      </div>
      {(!full || beat.post || done || play?.call?.name) && <p className="pg-text">{done ? 'That’s the game.' : beat.post ? play.text : play?.call?.name ? `${teams[play.off].code} · ${play.call.name}` : ' '}</p>}
      <div className="ct-row">
        <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '⏸ Pause'}</button>
        {SPEEDS.map((s) => <button key={s} className={`btn ghost${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s}x</button>)}
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(Math.max(0, i - 1))}>⏮ Back</button>
        <button className="btn ghost" disabled={done} onClick={() => setI(i + 1)}>Next ⏭</button>
        <span className="dim">Play {Math.min(i + 1, game.plays.length)} of {game.plays.length}</span>
        {onClose && <button className="btn ghost" onClick={onClose}>✕ Close</button>}
      </div>
    </div>
  );
}
